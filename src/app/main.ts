import locationJson from '../../content/locations/representative-residential-straight.json';
import crossingJson from '../../content/scenarios/crossing-restricted-view.json';
import movingOffJson from '../../content/scenarios/moving-off-safely.json';
import movingOffIntroJson from '../../content/scenarios/moving-off-intro.json';
import movingOffLocationJson from '../../content/locations/residential-moving-off.json';
import movingOffRubric from '../../content/rubrics/moving-off.json';
import brentwoodJson from '../../content/locations/brentwood-paired-mini-roundabouts.json';
import brentwoodGuidedJson from '../../content/scenarios/brentwood-guided-traversal.json';
import {
  INFO,degToRad,localToWorld,parseLocation,parseScenario,
  type AttemptResult,type FollowingVehicleActorDef,type PassingVehicleActorDef,type PedestrianActorDef,type Pose,type Scenario
} from '../contracts';
import {pedestrianVisual,vehicleVisual} from '../actors/actorVisuals';
import {FOLLOWER_HALF_LENGTH,FOLLOWER_HALF_WIDTH,FollowingVehicle} from '../actors/followingVehicle';
import {PassingVehicle} from '../actors/passingVehicle';
import {PEDESTRIAN_RADIUS,Pedestrian} from '../actors/pedestrian';
import {Assessor} from '../assessment/assessor';
import {MovingOffAssessor} from '../assessment/movingOff';
import {CAR_MODEL,CarModel,PropLibrary} from '../assets/models';
import {RouteSummary} from '../assessment/routeSummary';
import {ViewPracticeSummary} from '../assessment/viewPractice';
import {STEERING_RATIO,buildCockpit} from '../cockpit/cockpitModel';
import {ALL_MIRRORS,Mirror} from '../cockpit/mirror';
import {ObservationTracker,type ObservationSource,type ObservationTarget} from '../cockpit/observation';
import {DriverHead} from '../cockpit/seat';
import {applyPose,configureScene} from '../engine/babylonAdapter';
import {Camera,Engine,FreeCamera,Matrix,Scene,TransformNode,Vector3} from '../engine/babylon';
import {FixedStepClock} from '../engine/clock';
import {PerfProbe} from '../engine/perfProbe';
import {pickQualityProfile} from '../engine/quality';
import {KeyboardInput,type InputAction,type ViewTarget} from '../input/keyboard';
import {SteerRamp} from '../input/steerRamp';
import {TILT_SENSITIVITY,TiltSteering,isLandscape,type TiltPermission} from '../input/tilt';
import {ScenarioRunner,type Outcome} from '../scenarios/scenarioRunner';
import {ZoneTracker} from '../scenarios/zones';
import {openAttemptStore} from '../storage/attempts';
import {Hud} from '../ui/hud';
import {renderResults} from '../ui/results';
import type {SimModule} from '../contracts';
import {SteeringAssist} from '../vehicle/steeringAssist';
import {VehicleController,type ControlSource} from '../vehicle/vehicleController';
import {buildWorld} from '../world/buildWorld';
import {CompositeCollisions,pointToBox,type DynamicFootprint} from '../world/collisions';
import {StaticObstacles} from '../world/obstacles';
import {sampleRoad,surfaceAt} from '../world/roadGeometry';
import {buildGuide} from '../world/guide';
import {SeatedXr,detectXr} from '../xr/xrSession';
import {EventLog} from './eventLog';
import {Session} from './session';

const LOOK_SENSITIVITY=.004;
const SIM_STEP=1/60;
type SteeringMode='assist'|'tilt'|'buttons';
const EARLY_STOP_HINT_SECONDS=8;
const HORIZONTAL_FOV=degToRad(95);
/** While a mirror view is selected the view narrows, like focusing on the glass (door mirrors are smaller). */
const MIRROR_FOCUS_FOV={interior:degToRad(50),door:degToRad(40)};
/**
 * Vehicle-local points the shoulder checks look towards: sideways and back
 * (about 110°), the area beside the car that the door mirrors do not cover.
 */
const SHOULDER_POINTS={left:{x:-1.8,y:1.1,z:.9},right:{x:2.4,y:1.1,z:.9}};

function byId<T extends HTMLElement>(id:string):T{
  const el=document.getElementById(id);
  if(!el)throw new Error(`Missing #${id}`);
  return el as T;
}

/** Per-exercise road users, scoring and visuals; rebuilt whenever an exercise starts. */
interface ExerciseRuntime{
  scenario:Scenario;
  modules:SimModule[];
  runner:ScenarioRunner;
  zones:ZoneTracker;
  assist:SteeringAssist|null;
  pedestrian:Pedestrian|null;
  follower:FollowingVehicle|null;
  passers:PassingVehicle[];
  /** Timing variation in use this attempt, if the scenario has any. */
  readonly variant:Scenario['variants'][number]|null;
  chooseVariant(forced?:string|null):void;
  /** Records whether the vehicle step that just ran produced a collision. */
  afterVehicleStep(firstNewEvent:number):void;
  finish(outcome:Outcome):AttemptResult;
  current():unknown[];
  renderVisuals():void;
  dispose():void;
}

export async function boot():Promise<void>{
  const hud=new Hud();
  const session=new Session();
  session.onChange(state=>hud.showOnly(state,session.error));
  hud.showOnly('loading');
  // Every failure is shown on screen rather than leaving a blank canvas.
  window.addEventListener('error',event=>session.fail(event.message||'Unexpected error'));
  window.addEventListener('unhandledrejection',event=>session.fail(String((event.reason as Error)?.message??event.reason)));
  byId('error-reload').addEventListener('click',()=>location.reload());

  const canvas=byId<HTMLCanvasElement>('sim-canvas');
  const quality=pickQualityProfile(location.search,matchMedia('(pointer: coarse)').matches,innerWidth);
  let engine:Engine;
  try{
    engine=new Engine(canvas,quality.antialias,{stencil:true,preserveDrawingBuffer:false},true);
  }catch(error){
    session.fail('This browser could not start 3D graphics (WebGL). Try an up-to-date Chrome, Edge, Safari or Firefox.');
    throw error;
  }
  engine.setHardwareScalingLevel(quality.hardwareScaling);

  const scene=new Scene(engine);
  configureScene(scene);
  const locations=new Map([locationJson,brentwoodJson,movingOffLocationJson].map(raw=>{const l=parseLocation(raw);return [l.id,l] as const}));
  const scenarios=new Map([crossingJson,movingOffJson,movingOffIntroJson,brentwoodGuidedJson].map(raw=>{
    const s=parseScenario(raw);
    if(!locations.has(s.locationId))throw new Error(`Scenario ${s.id} is for unknown location ${s.locationId}`);
    return [s.id,s] as const;
  }));
  // The world is rebuilt when an exercise takes place somewhere else.
  let place=locations.get(parseLocation(locationJson).id)!;
  let world=buildWorld(scene,place,quality);
  let staticObstacles=new StaticObstacles(place.blocks);
  const spawnOf=(l:typeof place):Pose=>({position:{x:l.spawn.position.x,y:0,z:l.spawn.position.z},heading:degToRad(l.spawn.headingDeg)});
  const useLocation=(id:string)=>{
    if(place.id===id)return;
    world.dispose();
    place=locations.get(id)!;
    world=buildWorld(scene,place,quality);
    placeModels();
    staticObstacles=new StaticObstacles(place.blocks);
    vehicle.setSpawn(spawnOf(place));
    hud.setStatus(`${place.name} · ${place.fidelity} layout · ${quality.id} quality`);
    showCredit();
  };
  // Scenery models for the location; any that are unavailable leave the simple shapes in place.
  const props=new PropLibrary(scene);
  const placeModels=()=>{
    const root=world.root;
    for(const m of place.models)void props.place(root,m.asset,`model-${m.id}`,m.position.x,m.position.z,m.facingDeg).then(node=>{
      if(node&&m.replacesBlock)scene.getMeshByName(m.replacesBlock)?.setEnabled(false);
    });
  };
  placeModels();
  // ODbL requires the OpenStreetMap credit wherever its map data is shown.
  const showCredit=()=>{
    const osm=place.sources.some(source=>source.licence.includes('ODbL'));
    byId('hud-credit').hidden=!osm;
    byId('hud-credit').textContent=osm?'Map data © OpenStreetMap contributors (ODbL) · area-inspired, not an official test route':'';
  };
  const store=await openAttemptStore();
  // Other road users' car model (content/assets/register.json); simple shapes if it cannot load.
  const carModel=await CarModel.load(scene,CAR_MODEL);

  const clock=new FixedStepClock(SIM_STEP);
  const events=new EventLog(()=>clock.time);
  const input=new KeyboardInput(window,window,document);
  const spawn=spawnOf(place);

  // ---- Learner car (single movement owner) with optional steering assistance ----
  let runtime:ExerciseRuntime|null=null;
  let steeringMode:SteeringMode=quality.id==='phone'?'assist':'buttons';
  const tilt=new TiltSteering();
  let tiltSteer=0;
  const buttonSteer=new SteerRamp();
  const dynamicFootprints:DynamicFootprint[]=[];
  let vehicle!:VehicleController;
  const controls:ControlSource={read:()=>{
    const keys=input.read();
    // Called once per fixed simulation step.
    const c={...keys,steer:buttonSteer.update(keys.steer,SIM_STEP)};
    // The driver's own button/key steering always overrides tilt and the assistance.
    if(c.steer!==0)return c;
    if(steeringMode==='tilt')return {...c,steer:tiltSteer};
    if(steeringMode==='assist'&&runtime?.assist)return {...c,steer:runtime.assist.steer(vehicle.pose,vehicle.state.speed)};
    return c;
  }};
  vehicle=new VehicleController(spawn,controls,{
    surfaceHeightAt:(x,z)=>surfaceAt(place,x,z)?.height??null,
    groundHeight:0,
    surfaceKindAt:(x,z)=>surfaceAt(place,x,z)?.kind??'none'
  },new CompositeCollisions({firstCollision:(pose,w,l)=>staticObstacles.firstCollision(pose,w,l)},dynamicFootprints),events);

  // ---- Cockpit, mirrors, camera ----
  const vehicleNode=new TransformNode('learner-car',scene);
  const head=new DriverHead();
  const cockpit=buildCockpit(scene,vehicleNode,head.seat);
  const seatNode=new TransformNode('driver-seat',scene);
  seatNode.parent=vehicleNode;
  seatNode.position.set(head.seat.eye.x,head.seat.eye.y,head.seat.eye.z);
  const mirrors=ALL_MIRRORS.map(spec=>new Mirror(scene,vehicleNode,cockpit.root,spec,quality,head.seat.eye));

  const camera=new FreeCamera('driver-camera',Vector3.Zero(),scene);
  camera.inputs.clear();
  camera.minZ=.05;
  camera.maxZ=3000;
  // Fix the horizontal field of view so wide phone screens (19.5:9) do not
  // stretch the cockpit and squeeze the road.
  camera.fovMode=Camera.FOVMODE_HORIZONTAL_FIXED;
  camera.fov=HORIZONTAL_FOV;
  scene.activeCamera=camera;

  // ---- Views: mirrors and shoulder checks ----
  const viewAim:Record<ViewTarget,{yaw:number;pitch:number}>={
    'interior':head.aimAt(ALL_MIRRORS[0].glass),
    'right-door':head.aimAt(ALL_MIRRORS[1].glass),
    'left-door':head.aimAt(ALL_MIRRORS[2].glass),
    'right-shoulder':head.aimAt(SHOULDER_POINTS.right),
    'left-shoulder':head.aimAt(SHOULDER_POINTS.left)
  };
  // A view button turns the head to that view and stays there until Forward,
  // another view, or a swipe. Keys (desktop) hold the view while pressed.
  let heldBy:'touch'|'key'|null=null;
  let heldView:ViewTarget|null=null;
  const VIEW_LABELS:Record<ViewTarget|'forward'|'free',string>={
    interior:'Interior mirror','left-door':'Left mirror','right-door':'Right mirror',
    'left-shoulder':'Left shoulder','right-shoulder':'Right shoulder',forward:'Forward',free:'Looking around'
  };
  const showView=(view:ViewTarget|'forward'|'free')=>{
    const label=byId('hud-view-label');
    label.textContent=`View: ${VIEW_LABELS[view]}`;
    label.classList.toggle('mirror',view!=='forward'&&view!=='free');
    for(const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')){
      b.classList.toggle('selected',b.dataset.view===view);
      b.setAttribute('aria-pressed',String(b.dataset.view===view));
    }
  };
  const holdView=(view:ViewTarget|null,by:'touch'|'key')=>{
    if(session.state!=='running')return;
    heldBy=view?by:null;
    heldView=view;
    head.hold(view?viewAim[view]:null);
    if(view)events.emit('view.selected',{view,by});
    showView(view??'forward');
  };
  /** Back to looking ahead, from a held view or from free look. */
  const forwardView=()=>{
    heldBy=null;heldView=null;
    head.hold({yaw:0,pitch:0});
    head.hold(null);
    showView('forward');
  };
  const selectView=(view:ViewTarget|'forward')=>{
    if(session.state!=='running')return;
    if(view==='forward'||heldView===view)forwardView();
    else holdView(view,'touch');
  };
  input.onView=view=>view?holdView(view,'key'):heldBy==='key'&&holdView(null,'key');
  const observationSource=():ObservationSource=>
    xr.active?'head direction':heldBy==='touch'?'touch view button':heldBy==='key'?'keyboard view key'
    :quality.id==='phone'?'swipe-controlled view':'mouse-controlled view';
  const observationTargets:ObservationTarget[]=[
    {id:'interior',position:pose=>localToWorld(pose,ALL_MIRRORS[0].glass),angularRadius:degToRad(9)},
    {id:'right-door',position:pose=>localToWorld(pose,ALL_MIRRORS[1].glass),angularRadius:degToRad(8)},
    {id:'left-door',position:pose=>localToWorld(pose,ALL_MIRRORS[2].glass),angularRadius:degToRad(8)},
    {id:'right-shoulder',position:pose=>localToWorld(pose,SHOULDER_POINTS.right),angularRadius:degToRad(20)},
    {id:'left-shoulder',position:pose=>localToWorld(pose,SHOULDER_POINTS.left),angularRadius:degToRad(20)}
  ];
  const observation=new ObservationTracker(observationTargets,()=>vehicle.pose,pose=>head.eyeWorld(pose),pose=>head.lookWorld(pose),events);

  // ---- Exercise setup ----
  function buildExercise(scenario:Scenario):ExerciseRuntime{
    dynamicFootprints.length=0;
    const pedDef=scenario.actors.find((a):a is PedestrianActorDef=>a.kind==='pedestrian');
    const followerDef=scenario.actors.find((a):a is FollowingVehicleActorDef=>a.kind==='following-vehicle');
    const pedestrian=pedDef?new Pedestrian(pedDef,events,(p,r)=>pointToBox(p.x,p.z,vehicle.pose,vehicle.halfWidth,vehicle.halfLength)<r):null;
    const follower=followerDef?new FollowingVehicle(followerDef,()=>vehicle.pose,()=>vehicle.state.speed):null;
    const learnerFootprint=()=>({pose:vehicle.pose,halfWidth:vehicle.halfWidth,halfLength:vehicle.halfLength});
    const passers=scenario.actors.filter((a):a is PassingVehicleActorDef=>a.kind==='passing-vehicle').map(d=>new PassingVehicle(d,learnerFootprint,events));
    if(pedestrian){
      dynamicFootprints.push({id:pedestrian.id,shape:()=>({kind:'circle',x:pedestrian.position.x,z:pedestrian.position.z,radius:PEDESTRIAN_RADIUS})});
    }
    if(follower){
      dynamicFootprints.push({id:follower.id,shape:()=>({kind:'box',pose:follower.pose,halfWidth:FOLLOWER_HALF_WIDTH,halfLength:FOLLOWER_HALF_LENGTH})});
    }
    for(const p of passers)dynamicFootprints.push({id:p.id,shape:()=>({kind:'box',pose:p.pose,...p.size}),active:()=>p.started});
    const visuals=[
      ...(pedestrian?[pedestrianVisual(scene,pedestrian)]:[]),
      ...(follower?[vehicleVisual(scene,follower.id,follower.def.colour,()=>follower.pose,'car',()=>true,carModel,2*FOLLOWER_HALF_LENGTH)]:[]),
      ...passers.map(p=>vehicleVisual(scene,p.id,p.def.colour,()=>p.pose,p.def.body,()=>p.started,carModel,2*p.size.halfLength))
    ];
    const guide=scenario.guide?buildGuide(scene,scenario.guide.path,scenario.guide.arrows):null;

    const zones=new ZoneTracker(place,scenario.zones,()=>({x:vehicle.state.position.x,z:vehicle.state.position.z,speed:vehicle.state.speed}),events);
    const assist=scenario.assistPath?new SteeringAssist(scenario.assistPath,vehicle.params):null;
    const road=place.roads[0]!;
    let lastCollision:string|null=null;
    const runner=new ScenarioRunner(scenario,zones,new Map(pedestrian?[[pedestrian.id,pedestrian]]:[]),()=>{
      const {x,z}=vehicle.state.position;
      // Wrong way is judged against the exercise route where there is one (junctions join several roads).
      const s=sampleRoad(road,x,z);
      const roadHeading=assist?assist.headingAt(x,z):Math.atan2(s.direction.x,-s.direction.z);
      return {surface:vehicle.surfaceKind,heading:vehicle.state.heading,roadHeading,collidedWith:lastCollision};
    },events);
    runner.onMessage=text=>hud.setTask(text);

    const crossing=pedestrian?place.crossings.find(c=>c.id===pedestrian.def.crossingId)??null:null;
    const assessor=scenario.rubricId==='crossing-restricted-view'&&pedestrian&&crossing?new Assessor({
      events:()=>events.events,
      learner:()=>({pose:vehicle.pose,speed:vehicle.state.speed,halfWidth:vehicle.halfWidth,halfLength:vehicle.halfLength}),
      followerGap:()=>follower?follower.gap:null,
      zones,crossing,pedestrian,now:()=>clock.time
    },events):null;
    const routeJunctions=scenario.zones.some(z=>z.id==='rb1-entry')?[
      {name:'Mini-roundabout 1',approachZone:'rb1-approach',entryZone:'rb1-entry',signal:'left' as const},
      {name:'Mini-roundabout 2',approachZone:'rb2-approach',entryZone:'rb2-entry',signal:null}
    ]:null;
    const route=routeJunctions?new RouteSummary(routeJunctions,zones,()=>heldView==='right-door'?0:head.yaw,()=>events.events):null;
    const movingOff=scenario.rubricId==='moving-off'?new MovingOffAssessor({
      events:()=>events.events,
      learner:()=>({pose:vehicle.pose,speed:vehicle.state.speed,halfWidth:vehicle.halfWidth,halfLength:vehicle.halfLength,indicator:vehicle.indicators.state}),
      roadUsers:passers,now:()=>clock.time
    },movingOffRubric,events):null;
    const practice=assessor||route||movingOff?null:new ViewPracticeSummary(passers,()=>vehicle.pose,()=>events.events,()=>clock.time);

    const modules:SimModule[]=[
      ...(pedestrian?[pedestrian]:[]),...(follower?[follower]:[]),...passers,
      zones,runner,observation,...(assessor?[assessor]:[]),...(practice?[practice]:[]),...(route?[route]:[]),...(movingOff?[movingOff]:[])
    ];
    const names=Object.fromEntries(passers.map(p=>[p.id,p.name]));
    let variant:Scenario['variants'][number]|null=null;
    return {
      scenario,modules,runner,zones,assist,pedestrian,follower,passers,
      get variant(){return variant},
      chooseVariant(forced){
        // A different timing each attempt (or a forced one for tests), applied before the modules reset.
        if(scenario.variants.length===0)return;
        variant=scenario.variants.find(v=>v.id===forced)??scenario.variants[Math.floor(Math.random()*scenario.variants.length)]!;
        for(const p of passers){
          const t=variant.actors[p.id];
          if(t)p.setTiming(t.delaySeconds,t.speed);
        }
      },
      afterVehicleStep(firstNewEvent){
        lastCollision=null;
        for(let i=firstNewEvent;i<events.events.length;i++){
          const e=events.events[i]!;
          if(e.type==='vehicle.collision')lastCollision=String(e.payload['obstacleId']);
        }
      },
      finish(outcome){
        const base=assessor?assessor.finish(scenario.id,outcome,runner.elapsed)
          :movingOff?movingOff.finish(scenario.id,outcome,runner.elapsed):{
          scenarioId:scenario.id,rubricVersion:'none (practice)',outcome,findings:[],
          notes:route?route.notes():practice!.notes(names),durationSeconds:runner.elapsed,finishedAt:new Date().toISOString()
        };
        if(steeringMode==='assist'&&assist)base.notes.push('Steering assistance was on: it kept the car on the lane path while you controlled speed and observations.');
        if(steeringMode==='tilt')base.notes.push('You steered by tilting the phone.');
        if(variant)base.notes.push(`${INFO}Timing this attempt: ${variant.label.toLowerCase()}.`);
        return base;
      },
      current:()=>assessor?assessor.current:movingOff?movingOff.current:[],
      renderVisuals(){for(const v of visuals)v.update()},
      dispose(){
        for(const v of visuals)v.dispose();
        guide?.dispose();
        for(const m of modules)if(m!==observation)m.dispose();
        dynamicFootprints.length=0;
      }
    };
  }

  const step=(dt:number,time:number)=>{
    if(!runtime)return;
    const before=events.events.length;
    vehicle.fixedUpdate(dt);
    runtime.afterVehicleStep(before);
    for(const m of runtime.modules)m.fixedUpdate?.(dt,time);
  };

  // ---- Lifecycle ----
  let stoppedEarlyFor=0;
  let lastResult:AttemptResult|null=null;
  /** Diagnostics: a timing variation to use instead of a random one (tests). */
  let forcedVariant:string|null=null;
  const clearHeldButtons=()=>{for(const b of document.querySelectorAll('[data-hold].held'))b.classList.remove('held')};
  const resetAttempt=()=>{
    input.clear();
    clearHeldButtons();
    buttonSteer.reset();
    if(runtime){
      const s=runtime.scenario;
      vehicle.setSpawn(s.start?{position:{x:s.start.position.x,y:0,z:s.start.position.z},heading:degToRad(s.start.headingDeg)}:spawnOf(place));
      runtime.chooseVariant(forcedVariant);
    }
    vehicle.reset();
    for(const m of runtime?.modules??[])m.reset();
    head.recentre();
    heldBy=null;
    heldView=null;
    showView('forward');
    camera.fov=HORIZONTAL_FOV;
    clock.reset();
    events.clear();
    stoppedEarlyFor=0;
    if(runtime){
      // The Task button shows the briefing again; nothing reveals where road users are.
      hud.setTask(runtime.scenario.briefing.replace(/\n\n/g,' '),false);
      document.body.classList.toggle('stationary',runtime.scenario.stationary);
    }
    // Calibrated on the exercise screen, or else where the phone is held as the drive begins.
    if(steeringMode==='tilt'&&tilt.receiving&&!tilt.calibrated)tilt.calibrate();
  };
  const attachRunner=()=>{
    runtime!.runner.onEnded=async outcome=>{
      input.clear();
      clearHeldButtons();
      head.hold(null);
      clock.pause();
      const result=runtime!.finish(outcome);
      lastResult=result;
      session.to('finished');
      let saved=0,saveFailed=false;
      try{
        await store.save(result);
        saved=(await store.list(result.scenarioId)).length;
      }catch(error){
        saveFailed=true;
        console.warn('[Driving Practice] could not save attempt',error);
      }
      renderResults(result,id=>events.events.find(e=>e.id===id)?.time,saved,store.kind,saveFailed);
      const next=runtime!.scenario.next;
      const nextButton=byId<HTMLButtonElement>('next-button');
      nextButton.hidden=!next;
      nextButton.textContent=next?.label??'';
    };
  };

  // Swipe/mouse look: drag to move the head relative to the seat. A swipe
  // takes over from a selected view (free look).
  let dragging:number|null=null,lastX=0,lastY=0;
  canvas.addEventListener('pointerdown',event=>{
    dragging=event.pointerId;lastX=event.clientX;lastY=event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(event.pointerId!==dragging||session.state!=='running')return;
    const dx=event.clientX-lastX,dy=event.clientY-lastY;
    if(Math.abs(dx)+Math.abs(dy)<1)return;
    if(head.target||heldView){
      if(heldBy==='key')return;
      head.release();heldBy=null;heldView=null;
    }
    head.look(dx*LOOK_SENSITIVITY,-dy*LOOK_SENSITIVITY);
    lastX=event.clientX;lastY=event.clientY;
    if(Math.abs(head.yaw)>.05||Math.abs(head.pitch)>.05)showView('free');
  });
  const endDrag=(event:PointerEvent)=>{if(event.pointerId===dragging)dragging=null};
  canvas.addEventListener('pointerup',endDrag);
  canvas.addEventListener('pointercancel',endDrag);

  const xr=new SeatedXr(scene,seatNode);

  // ---- Steering mode: assisted, tilt the phone, or steer buttons/keys ----
  const tiltStatus=byId('tilt-status');
  const embedded=window.top!==window.self;
  const steeringRadios=[...document.querySelectorAll<HTMLInputElement>('input[name="steering"]')];
  const tiltRadio=steeringRadios.find(r=>r.value==='tilt')!;
  const setSteeringMode=(mode:SteeringMode)=>{
    steeringMode=mode;
    for(const radio of steeringRadios)radio.checked=radio.value===mode;
    byId('tilt-options').hidden=mode!=='tilt';
    document.body.classList.toggle('tilt',mode==='tilt');
    // Steer buttons only where they are the steering, or the fallback for tilt.
    document.body.classList.toggle('steer-buttons',mode!=='assist');
  };
  /** Tilt cannot work here: disable the option and say why. */
  const disableTilt=(reason:string)=>{
    tiltRadio.disabled=true;
    const note=byId('tilt-unavailable');
    note.hidden=false;
    note.textContent=reason;
    if(steeringMode==='tilt')setSteeringMode(quality.id==='phone'?'assist':'buttons');
  };
  if(quality.id!=='phone')disableTilt('Tilt needs a phone or tablet with a motion sensor.');
  else if(typeof DeviceOrientationEvent==='undefined')disableTilt('This browser has no motion sensor support.');
  else if(embedded)disableTilt('Not available here: this copy runs inside another page (such as the claude.ai viewer), which blocks motion sensors. Open the standalone preview link instead.');
  // Choosing tilt only shows the panel; access is asked by the Enable tilt button.
  for(const radio of steeringRadios)radio.addEventListener('change',()=>setSteeringMode(radio.value as SteeringMode));
  const PERMISSION_TEXT:Record<TiltPermission,string>={
    'not-asked':'not asked yet',granted:'granted',denied:'refused',
    'not-required':'not needed in this browser',unsupported:'no motion sensor support in this browser'
  };
  byId('tilt-enable').addEventListener('click',()=>{
    tiltStatus.classList.remove('warn');
    tiltStatus.textContent='Asking for motion access…';
    // No await before this call: iOS shows its prompt only inside the tap.
    void tilt.requestAccess().then(permission=>{
      if(permission==='denied')disableTilt('Motion access was refused. To allow it, reload the page, choose Tilt again and tap Allow.');
      else if(permission==='unsupported')disableTilt('This browser has no motion sensor support.');
      if(permission==='denied'||permission==='unsupported')tiltStatus.textContent='';
      else tiltStatus.textContent='Waiting for sensor readings… then hold the phone in landscape and tap Calibrate.';
    });
  });
  byId('tilt-calibrate').addEventListener('click',()=>{
    tilt.calibrate();
    tiltStatus.classList.remove('warn');
    tiltStatus.textContent='Straight ahead set. Turn the phone like a wheel: the wheel below should follow.';
  });
  /** Live tilt status on the exercise screen (called every frame while it is shown). */
  const showTiltState=()=>{
    const set=(id:string,text:string,ok:boolean|null)=>{
      const el=byId(id);
      if(el.textContent!==text)el.textContent=text;
      el.className=ok===null?'':ok?'ok':'bad';
    };
    const p=tilt.permission;
    set('tilt-permission',PERMISSION_TEXT[p],p==='not-asked'?null:p==='granted'||p==='not-required');
    set('tilt-readings',tilt.receiving?`readings arriving (${tilt.rate}/s), lean ${tilt.leanDegrees>=0?'+':''}${tilt.leanDegrees.toFixed(0)}°`:p==='not-asked'?'no readings yet':'no readings',p==='not-asked'?null:tilt.receiving);
    const landscape=isLandscape();
    set('tilt-landscape',landscape?'landscape':'turn the phone to landscape',landscape);
    set('tilt-calibrated',tilt.calibrated?'calibrated':'not calibrated',tilt.calibrated);
    (byId('tilt-calibrate') as HTMLButtonElement).disabled=!(tilt.receiving&&landscape);
  };
  const sensitivity=byId<HTMLSelectElement>('tilt-sensitivity');
  sensitivity.addEventListener('change',()=>{tilt.tuning=TILT_SENSITIVITY[sensitivity.value as keyof typeof TILT_SENSITIVITY]});
  // Assisted steering by default on phones: the exercises are about judgement.
  setSteeringMode(steeringMode);
  const wheelPreview=byId('tilt-preview');

  // ---- Exercises: menu, settings and briefing, then Start practice ----
  const EXERCISES:Record<string,{scenario:string;intro?:string}>={
    brentwood:{scenario:'brentwood-guided-traversal'},
    zebra:{scenario:'crossing-restricted-view'},
    'moving-off':{scenario:'moving-off-safely',intro:'moving-off-intro'}
  };
  let chosen:{scenario:string;intro?:string}|null=null;
  /** Briefing text: paragraphs split on blank lines; a short first line is its heading. */
  const renderBriefing=(target:HTMLElement,text:string)=>{
    const parts=text.split(/\n\n+/);
    target.replaceChildren(...parts.map((part,i)=>{
      const heading=i===0&&parts.length>1&&part.length<60&&!/[.:]$/.test(part);
      const el=document.createElement(heading?'h2':'p');
      el.textContent=part;
      return el;
    }));
  };
  /** Shows the scene of an exercise behind its settings, with the car at its start. */
  const preview=(scenario:Scenario)=>{
    useLocation(scenario.locationId);
    vehicle.setSpawn(scenario.start?{position:{x:scenario.start.position.x,y:0,z:scenario.start.position.z},heading:degToRad(scenario.start.headingDeg)}:spawnOf(place));
    vehicle.reset();
    head.recentre();
  };
  const showExercise=(key:string|null)=>{
    chosen=key?EXERCISES[key]!:null;
    byId('exercise-list').hidden=!!chosen;
    byId('exercise-detail').hidden=!chosen;
    if(!chosen)return;
    const scenario=scenarios.get(chosen.scenario)!;
    byId('exercise-title').textContent=scenario.title;
    byId('exercise-objective').textContent=scenario.learningObjective;
    renderBriefing(byId('exercise-briefing'),scenario.briefing);
    byId('intro-option').hidden=!chosen.intro;
    preview(scenario);
  };
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-exercise]'))
    button.addEventListener('click',()=>showExercise(button.dataset.exercise!));
  byId('exercise-back').addEventListener('click',()=>showExercise(null));

  const start=(scenarioId:string)=>{
    if(session.state!=='ready')return;
    runtime?.dispose();
    const scenario=scenarios.get(scenarioId)!;
    useLocation(scenario.locationId);
    runtime=buildExercise(scenario);
    attachRunner();
    if(!session.to('running'))return;
    resetAttempt();
    byId('paused-title').textContent=scenario.title;
    clock.resume();
    events.emit('session.started',{locationId:place.id,scenarioId,quality:quality.id,variant:runtime.variant?.id??null});
    events.emit('assist.changed',{enabled:steeringMode==='assist'&&!!runtime.assist,steering:steeringMode});
    canvas.focus();
  };
  byId('start-practice').addEventListener('click',()=>{if(chosen)start(chosen.scenario)});
  byId('start-intro').addEventListener('click',()=>{if(chosen?.intro)start(chosen.intro)});

  const pause=()=>{
    if(!session.to('paused'))return;
    clock.pause();
    input.clear();
    clearHeldButtons();
    forwardView();
    events.emit('session.paused');
  };
  const resume=()=>{
    if(!session.to('running'))return;
    input.clear();
    clock.resume();
    events.emit('session.resumed');
    canvas.focus();
  };
  const restart=()=>{
    if(session.state!=='running'&&session.state!=='paused'&&session.state!=='finished')return;
    const wasPaused=session.state==='paused',wasFinished=session.state==='finished';
    resetAttempt();
    events.emit('session.reset',{variant:runtime?.variant?.id??null});
    if(wasPaused)resume();
    else if(wasFinished){session.to('running');clock.resume();canvas.focus()}
  };
  /** Voluntary exit: results show what happened so far, marked as exited. */
  const endAttempt=()=>{
    if(session.state!=='paused'||!runtime)return;
    session.to('running');
    runtime.runner.finish(runtime.scenario.end.completeAfterSeconds!==undefined?'completed':'abandoned');
  };
  const backToMenu=()=>{
    if(session.state!=='finished'&&session.state!=='paused')return;
    clock.pause();
    session.to('ready');
    showExercise(null);
  };
  const onAction=(action:InputAction)=>{
    if(action==='pause')return session.state==='running'?pause():session.state==='paused'?resume():undefined;
    if(action==='reset')return restart();
    if(session.state!=='running')return;
    if(action==='recentre'){forwardView();xr.recentre()}
    else vehicle.toggleIndicator(action==='indicator-left'?'left':'right',clock.time);
  };
  input.onAction=onAction;

  byId('resume-button').addEventListener('click',resume);
  byId('restart-button').addEventListener('click',restart);
  byId('end-button').addEventListener('click',endAttempt);
  byId('retry-button').addEventListener('click',restart);
  byId('menu-button').addEventListener('click',backToMenu);
  byId('next-button').addEventListener('click',()=>{
    const next=runtime?.scenario.next;
    if(!next||session.state!=='finished')return;
    session.to('ready');
    const key=Object.keys(EXERCISES).find(k=>EXERCISES[k]!.scenario===next.scenarioId);
    showExercise(key??null);
  });
  byId('hud-pause').addEventListener('click',pause);
  byId('hud-ind-left').addEventListener('click',()=>onAction('indicator-left'));
  byId('hud-ind-right').addEventListener('click',()=>onAction('indicator-right'));
  byId('hud-task-toggle').addEventListener('click',()=>hud.toggleTask());
  byId('hud-tilt-centre').addEventListener('click',()=>tilt.calibrate());
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-hold]')){
    const control=button.dataset.hold as 'throttle'|'brake'|'left'|'right';
    const set=(down:boolean)=>(event:Event)=>{
      event.preventDefault();
      // Go does nothing in exercises where the car stays parked.
      if(control==='throttle'&&runtime?.scenario.stationary)down=false;
      input.setVirtual(control,down);
      button.classList.toggle('held',down);
    };
    button.addEventListener('pointerdown',set(true));
    for(const type of ['pointerup','pointerleave','pointercancel','lostpointercapture'])button.addEventListener(type,set(false));
  }
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')){
    const view=button.dataset.view as ViewTarget|'forward';
    button.addEventListener('pointerdown',event=>{event.preventDefault();selectView(view)});
  }
  // Losing focus releases every held control (KeyboardInput also clears its state).
  window.addEventListener('blur',clearHeldButtons);
  // iOS: a long press on a control must not start a text selection or the Copy/Look Up menu.
  for(const type of ['contextmenu','selectstart'])byId('hud').addEventListener(type,event=>event.preventDefault());
  byId('touch-controls').hidden=false;
  document.body.classList.toggle('phone',quality.id==='phone');

  // A hidden tab pauses; losing focus clears held controls (KeyboardInput).
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&session.state==='running')pause()});

  // Seated VR for a WebXR headset (desktop). Phone-viewer VR is a separate feasibility task.
  const xrSupport=await detectXr();
  const xrButton=byId<HTMLButtonElement>('xr-button');
  xrButton.hidden=!xrSupport.available;
  xrButton.addEventListener('click',async()=>{
    showExercise('zebra');
    start('crossing-restricted-view');
    try{await xr.enter()}
    catch(error){hud.setStatus(`VR could not start: ${(error as Error).message}`)}
  });
  xr.onExit=()=>{if(session.state==='running')pause()};

  hud.setStatus(`${place.name} · ${place.fidelity} layout · ${quality.id} quality`);

  // ---- About this build ----
  const openAbout=()=>{
    byId('about-branch').textContent=__BUILD_BRANCH__;
    byId('about-commit').textContent=__BUILD_COMMIT__;
    byId('about-built').textContent=__BUILD_TIME__;
    byId('about-quality').textContent=`${quality.id} (render scale 1/${quality.hardwareScaling}, ${engine.getRenderWidth()}×${engine.getRenderHeight()} px)`;
    const p=perf.stats();
    byId('about-perf').textContent=p.frames?`${p.averageFps.toFixed(0)} fps average, ${p.p95Ms.toFixed(0)} ms at the 95th percentile, over the last ${p.frames} frames`:'start an exercise to measure';
    byId('about-models').textContent=[
      carModel?`${carModel.spec.id} (CC0, Quaternius) for other cars`:'simple car shapes (model not loaded)',
      props.available.size?`licensed scenery: ${[...props.available].join(', ')}`:'no licensed scenery in this build'
    ].join('; ');
    byId('about-mirrors').textContent=`${mirrors.filter(m=>m.isActive).length} of 3 rendering now; ${quality.mirrorResolution} px, every ${quality.mirrorUpdateInterval} frame${quality.mirrorUpdateInterval===1?'':'s'} (every frame for the mirror you are looking at)`;
    byId('screen-about').hidden=false;
  };
  byId('about-open').addEventListener('click',openAbout);
  byId('about-open-paused').addEventListener('click',openAbout);
  byId('about-close').addEventListener('click',()=>{byId('screen-about').hidden=true});

  const hudWheel=byId('hud-wheel');
  const hudTiltState=byId('hud-tilt-state');
  let mirrorsOn=true;
  /** Diagnostics: a top-down camera for layout review screenshots. */
  let overhead:{x:number;z:number;height:number}|null=null;
  const perf=new PerfProbe();
  engine.runRenderLoop(()=>{
    const dt=engine.getDeltaTime()/1000;
    if(session.state==='running'&&runtime){
      perf.record(engine.getDeltaTime());
      head.animate(dt);
      const wantFov=!heldView||heldView.endsWith('shoulder')?HORIZONTAL_FOV:heldView==='interior'?MIRROR_FOCUS_FOV.interior:MIRROR_FOCUS_FOV.door;
      camera.fov+=Math.max(-3*dt,Math.min(3*dt,wantFov-camera.fov));
      observation.source=observationSource();
      clock.advance(dt,step);
      // Stopping unusually early: the pedestrian waits; prompt the learner on.
      const trigger=runtime.zones.stats.get('pedestrian-trigger');
      stoppedEarlyFor=trigger&&!trigger.entered&&vehicle.state.speed<.15?stoppedEarlyFor+dt:0;
      if(stoppedEarlyFor>EARLY_STOP_HINT_SECONDS&&stoppedEarlyFor-dt<=EARLY_STOP_HINT_SECONDS)hud.setTask('Continue along the road towards the crossing.');
    }
    const alpha=session.state==='running'?clock.alpha:1;
    const pose=vehicle.interpolatedPose(alpha);
    applyPose(vehicleNode,pose);
    const eye=head.eyeWorld(pose),look=head.lookWorld(pose);
    if(overhead){
      camera.position.set(overhead.x,overhead.height,overhead.z+.01);
      camera.setTarget(new Vector3(overhead.x,0,overhead.z));
    }else{
      camera.position.set(eye.x,eye.y,eye.z);
      camera.setTarget(new Vector3(eye.x+look.x,eye.y+look.y,eye.z+look.z));
    }
    for(const mirror of mirrors){
      mirror.update(pose);
      mirror.setActive(mirrorsOn&&camera.isInFrustum(mirror.glass));
      // The mirror being looked at updates every frame so approaching traffic stays readable.
      mirror.setRefresh(heldView===mirror.spec.id?1:quality.mirrorUpdateInterval);
    }
    runtime?.renderVisuals();
    tiltSteer=tilt.read(dt);
    const wheelTurn=`rotate(${Math.round((steeringMode==='tilt'?tiltSteer:vehicle.state.steerAngle/.6)*120)}deg)`;
    hudWheel.style.transform=wheelTurn;
    // Turning right turns the wheel clockwise as the driver sees it.
    cockpit.wheel.rotation.y=-vehicle.state.steerAngle*STEERING_RATIO;
    if(session.state==='ready'){
      wheelPreview.style.transform=wheelTurn;
      if(steeringMode==='tilt')showTiltState();
    }
    if(steeringMode==='tilt'){
      const state=tilt.receiving?'tilt on':'no tilt: use Steer';
      if(hudTiltState.textContent!==state)hudTiltState.textContent=state;
    }
    hud.update(vehicle.state.speed,vehicle.indicators.state,vehicle.indicators.isLit(clock.time),engine.getFps());
    scene.render();
  });
  window.addEventListener('resize',()=>engine.resize());

  // Read-only handle for automated browser tests and manual diagnostics.
  Object.defineProperty(window,'__drivingPractice',{value:Object.freeze({
    session:()=>session.state,
    scenario:()=>runtime?.scenario.id??null,
    vehicle:()=>({...vehicle.state,indicator:vehicle.indicators.state,surface:vehicle.surfaceKind}),
    head:()=>({yaw:head.yaw,pitch:head.pitch}),
    look:(yaw:number,pitch:number)=>{head.recentre();head.look(yaw,pitch)},
    holdView:(view:ViewTarget|null)=>holdView(view,'touch'),
    /** Diagnostics: stop simulation time while views can still be turned, to compare views at one instant. */
    freezeTime:(frozen:boolean)=>{if(session.state==='running')frozen?clock.pause():clock.resume()},
    camera:()=>({position:camera.position.asArray(),forward:camera.getForwardRay(1).direction.asArray()}),
    events:()=>events.events.map(e=>({...e})),
    simTime:()=>clock.time,
    pedestrian:()=>runtime?.pedestrian?{state:runtime.pedestrian.state,position:{...runtime.pedestrian.position}}:null,
    follower:()=>runtime?.follower?{gap:runtime.follower.gap,speed:runtime.follower.speed,pose:runtime.follower.pose}:null,
    passers:()=>runtime?.passers.map(p=>({id:p.id,pose:p.pose}))??[],
    findings:()=>(runtime?.current()??[]).map(f=>({...(f as object)})),
    result:()=>lastResult,
    assist:()=>steeringMode==='assist',
    steering:()=>steeringMode,
    location:()=>place.id,
    carModel:()=>carModel?.spec.id??null,
    sceneryModels:()=>[...props.available],
    overhead:(view:{x:number;z:number;height:number}|null)=>{overhead=view},
    variant:()=>runtime?.variant?.id??null,
    /** Diagnostics: switch mirror rendering off to measure what it costs. */
    mirrorsEnabled:(on:boolean)=>{mirrorsOn=on},
    /** Diagnostics: use this timing variation from the next attempt (null = random). */
    forceVariant:(id:string|null)=>{forcedVariant=id},
    /** Same as tapping a view button (or Forward). */
    selectView:(view:ViewTarget|'forward')=>selectView(view),
    viewLabel:()=>byId('hud-view-label').textContent,
    passersDetail:()=>runtime?.passers.map(p=>({id:p.id,pose:p.pose,speed:p.speed,started:p.started}))??[],
    storage:store.kind,
    quality:quality.id,
    fps:()=>engine.getFps(),
    perf:()=>perf.stats(),
    resetPerf:()=>perf.reset(),
    renderer:()=>{
      const gl=engine._gl as WebGLRenderingContext|null;
      const info=gl?.getExtension('WEBGL_debug_renderer_info');
      return {webgl:engine.webGLVersion,renderer:info&&gl?String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)):'unknown',size:[engine.getRenderWidth(),engine.getRenderHeight()]};
    },
    /** On-screen rectangle of each mirror's glass, in CSS pixels, and whether it is rendering. */
    mirrors:()=>mirrors.map(m=>{
      m.glass.computeWorldMatrix(true);
      const box=m.glass.getBoundingInfo().boundingBox.vectorsWorld;
      const viewport=camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
      const ratio=canvas.clientWidth/engine.getRenderWidth();
      const points=box.map(v=>Vector3.Project(v,Matrix.IdentityReadOnly,scene.getTransformMatrix(),viewport));
      const xs=points.map(p=>p.x*ratio),ys=points.map(p=>p.y*ratio);
      return {id:m.spec.id,active:m.isActive,left:Math.min(...xs),top:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys)};
    })
  })});

  window.addEventListener('pagehide',()=>{
    input.dispose();xr.dispose();for(const mirror of mirrors)mirror.dispose();
    runtime?.dispose();observation.dispose();
    cockpit.dispose();world.dispose();scene.dispose();engine.dispose();
  });

  session.to('ready');
}
