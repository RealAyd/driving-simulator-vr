import locationJson from '../../content/locations/representative-residential-straight.json';
import crossingJson from '../../content/scenarios/crossing-restricted-view.json';
import movingOffJson from '../../content/scenarios/moving-off-safely.json';
import movingOffIntroJson from '../../content/scenarios/moving-off-intro.json';
import movingOffLocationJson from '../../content/locations/residential-moving-off.json';
import movingOffRubric from '../../content/rubrics/moving-off.json';
import brentwoodJson from '../../content/locations/brentwood-paired-mini-roundabouts.json';
import brentwoodGuidedJson from '../../content/scenarios/brentwood-guided-traversal.json';
import {
  INFO,degToRad,localDirectionToWorld,localToWorld,parseLocation,parseScenario,
  type AttemptConditions,type AttemptResult,type FollowingVehicleActorDef,type PassingVehicleActorDef,type PedestrianActorDef,type Pose,type Scenario
} from '../contracts';
import {pedestrianVisual,vehicleVisual} from '../actors/actorVisuals';
import {FOLLOWER_HALF_LENGTH,FOLLOWER_HALF_WIDTH,FollowingVehicle} from '../actors/followingVehicle';
import {PassingVehicle} from '../actors/passingVehicle';
import {PEDESTRIAN_RADIUS,Pedestrian} from '../actors/pedestrian';
import {Assessor} from '../assessment/assessor';
import {MovingOffAssessor} from '../assessment/movingOff';
import {CAR_MODEL,CAR_MODELS,CarModel,PROP_ASSETS,PropLibrary,bakeParkedCars,loadCarModels,type ParkedCar} from '../assets/models';
import type {CarModelId} from '../assets/carSpecs';
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
import {layoutStreetscape} from '../world/streetscape';
import {buildStreetscape} from '../world/streetscapeMesh';
import {CompositeCollisions,pointToBox,type DynamicFootprint} from '../world/collisions';
import {StaticObstacles} from '../world/obstacles';
import {sampleRoad,surfaceAt} from '../world/roadGeometry';
import {buildGuide} from '../world/guide';
import {SeatedXr,detectXr} from '../xr/xrSession';
import {yawPitch} from '../xr/headOrientation';
import {HeadTracker,PhoneViewer} from '../xr/phoneViewer';
import {ViewerHud,type GazeItem} from '../xr/viewerHud';
import {ControllerInput,DRIVE_ACTIONS,DRIVE_ACTION_LABEL,describeBinding,loadBindings,saveBindings,type ControllerState,type DriveAction} from '../xr/controllerInput';
import {SETTINGS_LIMITS,VIEWER_SLOTS,activeSettings,applySettings,clampSettings,defaultSettings,loadViewers,saveViewers,type ViewerSettings} from '../xr/viewerSettings';
import type {Controls} from '../vehicle/kinematics';
import {VIEWER_PROFILES} from '../xr/viewerProfiles';
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
  /** Parked practice in the phone viewer: not assessed, not saved. */
  familiarisation:boolean;
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
    dressLocation();
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
  // Houses, gardens and street furniture (streetscape) and parked cars; collisions match what is drawn.
  let carModels=new Map<CarModelId,CarModel|null>();
  let sceneryStats={houses:0,parkedCars:0,colliders:0};
  const dressLocation=()=>{
    const layout=layoutStreetscape(place);
    const parked:ParkedCar[]=[
      ...place.blocks.filter(b=>b.vehicleModel).map(b=>({model:b.vehicleModel as CarModelId,colour:b.colour??'#c9ccd1',x:b.position.x,y:0,z:b.position.z,heading:degToRad(b.headingDeg)})),
      ...(layout?.cars??[]).map(c=>({model:c.model,colour:c.colour,x:c.x,y:c.y,z:c.z,heading:c.heading}))
    ];
    if(layout)buildStreetscape(scene,layout,world.root,parked.map(c=>({...c,width:CAR_MODELS[c.model].width,length:CAR_MODELS[c.model].length})));
    bakeParkedCars(scene,world.root,parked,carModels);
    const colliders=[...place.blocks,...(layout?.colliders??[])];
    staticObstacles=new StaticObstacles(colliders);
    sceneryStats={houses:layout?.houses.length??0,parkedCars:parked.length,colliders:colliders.length};
  };
  // ODbL requires the OpenStreetMap credit wherever its map data is shown.
  const showCredit=()=>{
    const osm=place.sources.some(source=>source.licence.includes('ODbL'));
    byId('hud-credit').hidden=!osm;
    byId('hud-credit').textContent=osm?'Map data © OpenStreetMap contributors (ODbL) · area-inspired, not an official test route':'';
  };
  const store=await openAttemptStore();
  // Car models (content/assets/register.json): other road users and parked cars; simple shapes for any that cannot load.
  const [loadedParked,carModel]=await Promise.all([loadCarModels(scene),CarModel.load(scene,CAR_MODEL)]);
  carModels=loadedParked;
  dressLocation();

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
    const steer=c.steer!==0?c.steer:steeringMode==='tilt'?tiltSteer:steeringMode==='assist'&&runtime?.assist?runtime.assist.steer(vehicle.pose,vehicle.state.speed):0;
    // In the phone viewer only the checked physical controller drives the car.
    const viewerDrive=viewerControls(steer);
    lastControls=viewerDrive??{throttle:c.throttle,brake:c.brake,steer};
    return lastControls;
  }};
  let lastControls:Controls={throttle:0,brake:0,steer:0};
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
    xr.active||viewer.active?'head direction':heldBy==='touch'?'touch view button':heldBy==='key'?'keyboard view key'
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
  function buildExercise(source:Scenario,familiarisation=false):ExerciseRuntime{
    // Familiarisation keeps the exercise's place and road users but the car stays parked and nothing is assessed.
    const scenario:Scenario=familiarisation&&!source.stationary
      ?{...source,stationary:true,rubricId:'none',end:{...source.end,completeAfterSeconds:source.end.completeAfterSeconds??180}}
      :source;
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
    // Route guidance on the road is optional: off for an independent attempt, on while learning the controls.
    const guided=!!scenario.guide&&showGuide;
    const guide=guided?buildGuide(scene,scenario.guide!.path,scenario.guide!.arrows):null;

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
    const routeJunctions=!familiarisation&&scenario.zones.some(z=>z.id==='rb1-entry')?[
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
      scenario,familiarisation,modules,runner,zones,assist,pedestrian,follower,passers,
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
        if(guided)base.notes.push('Route guidance was shown on the road (the pull-out path).');
        if(steeringMode==='tilt')base.notes.push('You steered by tilting the phone.');
        if(variant)base.notes.push(`${INFO}Timing this attempt: ${variant.label.toLowerCase()}.`);
        const mode=controlMode();
        if(mode==='phone-viewer-controller'||mode==='webxr')base.notes.push(`${INFO}Observations were recorded from your head direction (motion sensors), not eye tracking.`);
        if(familiarisation)base.notes.push(`${INFO}Parked familiarisation in the phone viewer: not scored and not saved.`);
        base.conditions={controlMode:mode,steering:steeringMode,guidance:guided,headDirectionEvidence:mode==='phone-viewer-controller'||mode==='webxr'||!!viewerMode,
          ...(mode==='phone-viewer-controller'&&checkedDevice?{controller:checkedDevice}:{})};
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
      // Parked familiarisation is kept apart from scored results: not saved.
      if(runtime!.familiarisation)saved=-1;
      else try{
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
  /** In the phone viewer a tap on the screen pauses (and leaves the viewer) instead of looking around. */
  let viewerTap:()=>boolean=()=>false;
  canvas.addEventListener('pointerdown',event=>{
    if(viewerTap())return;
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

  // ---- Phone viewer: side-by-side stereo in a cardboard-style headset (no WebXR on iPhone) ----
  // Three modes. Familiarisation: parked, not scored, menus by gaze, no controller needed.
  // Driving: scored, needs a physical controller that passed the input check; nothing that
  // moves the car or signals is ever done by gaze. Calibration: parked, adjusts the viewer.
  const headTracker=new HeadTracker();
  const viewer=new PhoneViewer(scene,camera);
  const viewerHud=new ViewerHud(scene,vehicleNode,head.seat.eye);
  const localStore=(()=>{try{return window.localStorage}catch{return null}})();
  const controller=new ControllerInput({
    getGamepads:()=>typeof navigator.getGamepads==='function'?[...navigator.getGamepads()]:[],
    addEventListener:(type,listener)=>window.addEventListener(type,listener as EventListener)
  });
  let updateControllerCheck=()=>{};
  /** The device (controller id or 'keyboard') that passed the input check in this visit, or null. */
  let checkedDevice:string|null=null;
  let controllerState:ControllerState|null=null;
  let viewerMode:'familiarisation'|'driving'|'calibration'|null=null;
  /** Waiting for Start: simulated time stopped, the car held. */
  let viewerStarting=false,viewerEnteredAt=0;
  /** Why the exercise paused inside the headset (shown on the in-headset menu). */
  let viewerPauseReason='';
  /** Accelerate must be released and pressed again after a pause before it counts. */
  let accelArmed=false;
  /** How long Brake has been held on the pause menu (hold 2 s to exit). */
  let exitHeld=0;
  /** Diagnostics: simulated time a brake press was received, and when a simulation step first applied it. */
  let brakeInputAt=-1,brakeAppliedAt=-1,brakeWasDown=false;
  let wakeLock:{release():Promise<void>}|null=null;
  /** Time to put the phone in the headset before Start can be chosen, seconds. */
  const VIEWER_SETTLE=3;
  /** Head-tracking readings older than this pause the exercise (stale or stopped sensor), milliseconds. */
  const TRACKING_STALE_MS=500;
  let viewers=loadViewers(localStore);
  let viewerSettings=activeSettings(viewers);
  const viewerStatus=byId('viewer-status');
  const slotSelect=byId<HTMLSelectElement>('viewer-slot');
  for(const name of VIEWER_SLOTS){const o=document.createElement('option');o.value=name;o.textContent=name;slotSelect.append(o)}
  slotSelect.value=viewers.active;
  slotSelect.addEventListener('change',()=>{
    viewers={...viewers,active:slotSelect.value};
    viewerSettings=activeSettings(viewers);
    saveViewers(localStore,viewers);
    showViewerSummary();
  });
  const showViewerSummary=()=>{
    const p=VIEWER_PROFILES.find(v=>v.id===viewerSettings.profileId)!;
    byId('viewer-summary').textContent=`${p.label}; eye spacing ${viewerSettings.ipdMm} mm, image alignment ${viewerSettings.lensSeparationMm} mm${viewerSettings.verticalOffsetMm?`, vertical ${viewerSettings.verticalOffsetMm} mm`:''}. Lens presets are provisional: check them through your own holder.`;
  };
  showViewerSummary();
  const storeSettings=(s:ViewerSettings)=>{
    viewerSettings=clampSettings(s);
    viewers={...viewers,viewers:{...viewers.viewers,[viewers.active]:viewerSettings}};
    saveViewers(localStore,viewers);
    viewer.setProfile(applySettings(viewerSettings));
    showViewerSummary();
  };
  const driveButton=byId<HTMLButtonElement>('viewer-drive');
  let driveStatus='';
  const refreshDriveButton=()=>{
    const ready=!!checkedDevice&&!!controllerState?.connected&&controllerState.device===checkedDevice;
    const text=ready?`Controller checked: ${checkedDevice}.`
      :checkedDevice?'The checked controller is not connected now. Reconnect it (or check another).'
      :'Not available yet: run the controller check first.';
    if(text===driveStatus&&driveButton.disabled===!ready)return;
    driveStatus=text;
    driveButton.disabled=!ready;
    byId('viewer-drive-status').textContent=text;
  };

  const leaveViewer=()=>{
    if(!viewer.active)return;
    viewer.exit();
    viewerHud.setVisible(false);
    viewerHud.setItems([]);
    viewerHud.setMenu(null);
    viewerHud.showTargets(false);
    document.body.classList.remove('viewer');
    viewerMode=null;
    viewerStarting=false;
    void wakeLock?.release().catch(()=>{});
    wakeLock=null;
    head.recentre();
    engine.resize();
  };
  // A tap on the screen means the phone is out of the headset: pause and leave the viewer.
  // The tap itself must not also press whatever appears under the finger (Resume).
  let swallowClicksUntil=0;
  document.addEventListener('click',event=>{if(performance.now()<swallowClicksUntil){event.stopPropagation();event.preventDefault()}},true);
  viewerTap=()=>{
    if(!viewer.active)return false;
    swallowClicksUntil=performance.now()+500;
    if(session.state==='running')pause();
    leaveViewer();
    return true;
  };
  /** Pauses inside the headset (the in-headset menu shows why) and drops any held acceleration. */
  const viewerPause=(reason:string)=>{
    viewerPauseReason=reason;
    accelArmed=false;
    exitHeld=0;
    controller.clearHeld();
    if(session.state==='running')pause();
  };
  /** Resume from the in-headset menu: only by a deliberate action, and only when it is safe to. */
  const viewerResume=()=>{
    if(session.state!=='paused')return;
    if(viewerMode==='driving'&&!(controllerState?.connected&&controllerState.device===checkedDevice))return;
    if(headTracker.readingAge>TRACKING_STALE_MS)return;
    viewerPauseReason='';
    resume();
  };

  const controlMode=():AttemptConditions['controlMode']=>viewer.active&&viewerMode==='driving'?'phone-viewer-controller'
    :viewer.active&&viewerMode==='familiarisation'?'phone-viewer-familiarisation':xr.active?'webxr':quality.id==='phone'?'touch':'keyboard';

  // ---- Controller check: the driver shows each control working before scored viewer driving ----
  const checkTested=new Set<DriveAction>();
  let capturing:DriveAction|null=null;
  let checkDevice:string|null=null;
  const checkRows=new Map<DriveAction,{binding:HTMLElement;state:HTMLElement;tested:HTMLElement}>();
  {
    const table=byId('controller-actions');
    for(const action of DRIVE_ACTIONS){
      const row=document.createElement('tr');
      const cell=(text='')=>{const td=document.createElement('td');td.textContent=text;row.append(td);return td};
      cell(DRIVE_ACTION_LABEL[action]);
      const binding=cell();
      const state=cell('–');state.className='live';
      const tested=cell('');tested.className='tested';
      const remap=document.createElement('button');remap.type='button';remap.textContent='Set';remap.dataset.remap=action;
      remap.addEventListener('click',()=>{capturing=action;controller.beginCapture();checkTested.delete(action)});
      const td=document.createElement('td');td.append(remap);row.append(td);
      table.append(row);
      checkRows.set(action,{binding,state,tested});
    }
  }
  const openControllerCheck=()=>{
    byId('screen-controller').hidden=false;
    checkTested.clear();
    capturing=null;
    checkDevice=null;
  };
  /** Live state of the check screen; called every frame while it is open. */
  updateControllerCheck=()=>{
    const st=controllerState!;
    const pad=typeof navigator.getGamepads==='function'?[...navigator.getGamepads()].find(p=>p&&p.connected)??null:null;
    // A newly seen device: load its saved bindings, or offer the standard layout if it reports one (nothing else is assumed).
    const device=pad?.id??(st.raw.keys.length?'keyboard':null);
    if(device&&checkDevice===null){
      checkDevice=device;
      controller.bindings={...(loadBindings(localStore,device)??controller.defaultsFor(pad))};
      checkTested.clear();
    }
    if(capturing){
      const b=controller.capture();
      if(b){controller.bindings={...controller.bindings,[capturing]:b};capturing=null}
    }
    for(const action of DRIVE_ACTIONS){
      const row=checkRows.get(action)!;
      const bound=controller.bindings[action];
      row.binding.textContent=capturing===action?'press the control now…':describeBinding(bound);
      const on=!capturing&&!!bound&&st.values[action]>0;
      if(on)checkTested.add(action);
      row.state.textContent=on?'● received':'–';
      row.state.classList.toggle('on',on);
      row.tested.textContent=checkTested.has(action)?'✓ works':'';
    }
    const kinds=new Set(Object.values(controller.bindings).map(b=>b?.kind==='key'?'keyboard':'controller'));
    const mixed=kinds.size>1;
    const all=DRIVE_ACTIONS.every(a=>checkTested.has(a));
    byId('controller-raw').textContent=`Controller: ${st.raw.id??'none detected'}${st.raw.mapping?` (layout reported: ${st.raw.mapping})`:''}. Buttons held: ${st.raw.buttons.join(', ')||'none'}. Axes: ${st.raw.axes.join(', ')||'–'}. Last keys: ${st.raw.keys.join(', ')||'none'}.`;
    byId('controller-check-status').textContent=mixed?'Use one device for all six controls (all controller buttons, or all keys).'
      :all?`All six controls work on ${st.device}. Press Done.`:'Press each control once to show it works (Set changes which button or key it uses).';
    byId<HTMLButtonElement>('controller-done').disabled=!all||mixed||!st.connected;
  };
  byId('controller-check-open').addEventListener('click',openControllerCheck);
  byId('controller-standard').addEventListener('click',()=>{controller.bindings={...controller.defaultsFor({id:'',connected:true,mapping:'standard',buttons:[],axes:[]})};checkTested.clear()});
  byId('controller-cancel').addEventListener('click',()=>{capturing=null;controller.cancelCapture();byId('screen-controller').hidden=true;refreshDriveButton()});
  byId('controller-done').addEventListener('click',()=>{
    const st=controllerState;
    if(!st?.device)return;
    checkedDevice=st.device;
    saveBindings(localStore,st.device,controller.bindings);
    byId('screen-controller').hidden=true;
    refreshDriveButton();
  });

  /** Enters the viewer: asks for motion access from the tap, keeps the screen awake. */
  const enterViewer=(mode:'familiarisation'|'driving'|'calibration')=>{
    if(!chosen||session.state!=='ready')return;
    if(mode==='driving'&&driveButton.disabled)return;
    const scenarioId=chosen.scenario,introId=chosen.intro??null;
    // Both asked straight from the tap (nothing awaited first): iOS only allows them inside the user's gesture.
    const access=headTracker.requestAccess();
    const lock=(navigator as unknown as {wakeLock?:{request(type:'screen'):Promise<{release():Promise<void>}>}}).wakeLock?.request('screen').catch(()=>null);
    void (async()=>{
      const permission=await access;
      if(permission==='denied'||permission==='unsupported'){
        viewerStatus.textContent=permission==='denied'
          ?'Motion access was refused, so the view cannot follow your head. Allow motion access for this site (Safari: aA › Website Settings) and try again.'
          :'This browser has no motion sensor support.';
        return;
      }
      viewerStatus.textContent='';
      wakeLock=(await lock)??null;
      viewerMode=mode;
      if(mode!=='calibration'){
        // Tilt steering needs the phone in the hands: use the assistance (or the controller's stick) instead.
        if(steeringMode==='tilt')setSteeringMode('assist');
        start(mode==='familiarisation'?(introId??scenarioId):scenarioId,{familiarisation:mode==='familiarisation'});
        if(session.state!=='running'){viewerMode=null;return}
        // Nothing moves until the driver has the headset on, looks straight ahead and starts.
        viewerStarting=true;
        clock.pause();
      }
      viewerEnteredAt=performance.now();
      accelArmed=false;
      viewerPauseReason='';
      document.body.classList.add('viewer');
      engine.resize();
      viewer.enter(applySettings(viewerSettings));
      viewerHud.setVisible(true);
      viewerHud.showTargets(mode==='calibration');
      calibrationCentred=false;
    })();
  };
  byId('viewer-familiarise').addEventListener('click',()=>enterViewer('familiarisation'));
  driveButton.addEventListener('click',()=>enterViewer('driving'));
  byId('viewer-calibrate').addEventListener('click',()=>enterViewer('calibration'));

  // In-headset layout (vehicle-local metres). The familiarisation Menu sits low on the centre of the
  // dashboard, about 24° below and 29° left of straight ahead: no mirror, shoulder or road view is there.
  const EYE=head.seat.eye;
  const MENU_PANEL={x:EYE.x,y:EYE.y+.02,z:EYE.z-1.35,w:.74,h:.42,px:511};
  /** World height of text line i on the menu panel (lines 46 px apart from 62 px, on a 511 px panel). */
  const menuLineY=(i:number)=>MENU_PANEL.y+MENU_PANEL.h/2-(62+i*46-12)/MENU_PANEL.px*MENU_PANEL.h;
  const belowMenu=(ids:Array<[string,string]>,dwell:number):GazeItem[]=>ids.map(([id,label],i)=>({id,label,x:MENU_PANEL.x+(i-(ids.length-1)/2)*.22,y:MENU_PANEL.y-MENU_PANEL.h/2-.06,z:MENU_PANEL.z+.02,w:.19,h:.07,dwell}));
  const FAMILIARISATION_MENU:GazeItem={id:'menu',label:'Menu',x:-.05,y:.82,z:-.66,w:.14,h:.06,dwell:1.5};
  const START_ITEM:GazeItem={id:'start',label:'Start',x:EYE.x,y:EYE.y-.02,z:EYE.z-1.2,w:.2,h:.08,dwell:1.5};
  const CAL_ROWS=[
    {key:'ipdMm',label:'Eye spacing',unit:'mm'},
    {key:'lensSeparationMm',label:'Image alignment (lens centres)',unit:'mm'},
    {key:'verticalOffsetMm',label:'Vertical alignment',unit:'mm'},
    {key:'profileId',label:'Lens profile',unit:''},
    {key:'distortionScale',label:'Lens correction strength',unit:'%'},
    {key:'fovDeg',label:'Field of view',unit:'°'}
  ] as const;
  let calRow=0,calibrationCentred=false;
  const adjustSetting=(row:number,dir:-1|1)=>{
    const r=CAL_ROWS[row]!;
    const s={...viewerSettings};
    if(r.key==='profileId'){
      const i=VIEWER_PROFILES.findIndex(p=>p.id===s.profileId);
      s.profileId=VIEWER_PROFILES[(i+dir+VIEWER_PROFILES.length)%VIEWER_PROFILES.length]!.id;
    }else s[r.key]+=dir*SETTINGS_LIMITS[r.key].step;
    storeSettings(s);
  };
  const calibrationItems=():GazeItem[]=>[
    ...CAL_ROWS.flatMap((r,i)=>[
      {id:`cal-${i}-minus`,label:'−',x:MENU_PANEL.x+.23,y:menuLineY(i+1),z:MENU_PANEL.z+.02,w:.06,h:.04,dwell:.7},
      {id:`cal-${i}-plus`,label:'+',x:MENU_PANEL.x+.31,y:menuLineY(i+1),z:MENU_PANEL.z+.02,w:.06,h:.04,dwell:.7}
    ]),
    ...belowMenu([['cal-reset','Reset'],['cal-recentre','Recentre'],['cal-done','Done']],1.2)
  ];
  const viewerItem=(id:string)=>{
    if(id==='start'){
      if(performance.now()-viewerEnteredAt<VIEWER_SETTLE*1000)return;
      viewerStarting=false;headTracker.recentre();clock.resume();return;
    }
    if(id==='menu'){viewerPause('Menu');return}
    if(id==='resume'){viewerResume();return}
    if(id==='recentre'||id==='cal-recentre'){headTracker.recentre();headTracker.startDriftTest();return}
    if(id==='exit'){endAttempt();return}
    if(id==='cal-reset'){storeSettings(defaultSettings(viewerSettings.profileId));return}
    if(id==='cal-done'){leaveViewer();return}
    const m=/^cal-(\d)-(minus|plus)$/.exec(id);
    if(m)adjustSetting(Number(m[1]),m[2]==='plus'?1:-1);
  };

  /** Controller input, once per rendered frame before simulation steps (so braking acts this frame). */
  const pollController=()=>{
    controllerState=controller.poll();
    const brakeDown=controllerState.values.brake>0;
    if(brakeDown&&!brakeWasDown)brakeInputAt=clock.time;
    brakeWasDown=brakeDown;
    if(!byId('screen-controller').hidden)updateControllerCheck();
    if(!viewer.active||!viewerMode)return;
    const c=controllerState;
    const pressed=new Set(c.pressed);
    if(viewerMode==='calibration'){
      if(pressed.has('signal-left'))adjustSetting(calRow,-1);
      if(pressed.has('signal-right'))adjustSetting(calRow,1);
      if(pressed.has('accelerate'))calRow=(calRow+CAL_ROWS.length-1)%CAL_ROWS.length;
      if(pressed.has('brake'))calRow=(calRow+1)%CAL_ROWS.length;
      if(pressed.has('recentre')){headTracker.recentre();headTracker.startDriftTest()}
      if(pressed.has('pause'))leaveViewer();
      return;
    }
    const ours=viewerMode==='familiarisation'||(c.connected&&c.device===checkedDevice);
    if(session.state==='paused'){
      if(!ours)return;
      if(pressed.has('pause'))viewerResume();
      if(pressed.has('recentre'))headTracker.recentre();
      exitHeld=c.values.brake>0?exitHeld+engine.getDeltaTime()/1000:0;
      if(exitHeld>=2){exitHeld=0;endAttempt()}
      return;
    }
    if(session.state!=='running')return;
    if(viewerStarting){
      if(viewerMode==='driving'&&pressed.has('recentre')&&headTracker.receiving){
        viewerStarting=false;headTracker.recentre();clock.resume();
      }
      return;
    }
    // Safety: a lost controller or lost head tracking stops the exercise; nothing resumes by itself.
    if(viewerMode==='driving'&&!(c.connected&&c.device===checkedDevice)){viewerPause('Controller disconnected');return}
    if(headTracker.readingAge>TRACKING_STALE_MS){viewerPause('Head tracking stopped');return}
    if(!ours)return;
    if(pressed.has('pause')){viewerPause('Paused');return}
    if(pressed.has('recentre'))headTracker.recentre();
    if(viewerMode==='driving'){
      if(pressed.has('signal-left'))onAction('indicator-left');
      if(pressed.has('signal-right'))onAction('indicator-right');
      if(c.values.accelerate===0)accelArmed=true;
    }
  };
  /** Viewer driving controls for one simulation step: held Accelerate within the exercise's limits; Brake at once. */
  const viewerControls=(steer:number):Controls|null=>{
    if(!viewer.active||!viewerMode||viewerMode==='calibration')return null;
    if(viewerMode!=='driving'||viewerStarting||!runtime)return {throttle:0,brake:1,steer:0};
    const c=controllerState;
    const brake=c?c.values.brake:0;
    const accelerate=accelArmed&&c?c.values.accelerate:0;
    const aid=runtime.scenario.controllerDriving;
    const limit=aid.assistedSpeedMph/2.237,speed=vehicle.state.speed,p=vehicle.params;
    // Full throttle would give p.acceleration·(1 − v/vmax): scale it to the exercise's acceleration limit.
    let throttle=brake>0||accelerate===0?0:Math.min(1,accelerate*aid.accelerationLimit/Math.max(.1,p.acceleration*(1-speed/p.maxSpeed)));
    if(speed>=limit)throttle=0;
    else if(speed>limit-.5)throttle*=(limit-speed)/.5;
    if(brake>0&&brakeAppliedAt<brakeInputAt)brakeAppliedAt=clock.time;
    return {throttle,brake:brake>0?Math.max(.6,brake):0,steer};
  };

  /** Head, eyes and in-headset display, once per rendered frame. */
  const updateViewer=(dt:number,pose:Pose)=>{
    if(viewerMode!=='calibration'&&(session.state==='finished'||session.state==='ready')){leaveViewer();return}
    // Until Start, straight ahead is wherever the head faces (the phone is being put in the headset).
    if(viewerStarting)headTracker.recentre();
    // Calibration: straight ahead is where the head faces when the first readings arrive (Recentre changes it).
    if(viewerMode==='calibration'&&!calibrationCentred&&headTracker.receiving){calibrationCentred=true;headTracker.recentre();headTracker.startDriftTest()}
    const local=headTracker.basis()??{forward:{x:0,y:0,z:-1},up:{x:0,y:1,z:0}};
    // The driver's head follows the real head: observation evidence is head direction (not eye tracking).
    const {yaw,pitch}=yawPitch(local);
    head.release();
    head.yaw=Math.max(-head.seat.yawLimit,Math.min(head.seat.yawLimit,yaw));
    head.pitch=Math.max(-head.seat.pitchDown,Math.min(head.seat.pitchUp,pitch));
    const eye=head.eyeWorld(pose);
    const forward=localDirectionToWorld(pose.heading,local.forward);
    viewer.update(eye,{forward,up:localDirectionToWorld(pose.heading,local.up)});
    // The main camera follows too: mirrors render only while their glass is in its view.
    camera.position.set(eye.x,eye.y,eye.z);
    camera.setTarget(new Vector3(eye.x+forward.x,eye.y+forward.y,eye.z+forward.z));

    const settled=performance.now()-viewerEnteredAt>=VIEWER_SETTLE*1000;
    const c=controllerState;
    const signal=vehicle.indicators.state,lit=vehicle.indicators.isLit(clock.time);
    const signalText=signal==='off'?'':`${signal==='left'?(lit?'◀':'◁'):(lit?'▶':'▷')} signal ${signal}`;
    let items:GazeItem[]=[];
    let menu:string[]|null=null;
    if(viewerMode==='calibration'){
      const s=viewerSettings,p=VIEWER_PROFILES.find(v=>v.id===s.profileId)!;
      const value=(k:typeof CAL_ROWS[number]['key'])=>k==='profileId'?p.label.split(' (')[0]:k==='distortionScale'?`${Math.round(s[k]*100)}%`:k==='verticalOffsetMm'?`${s[k].toFixed(1)} mm`:k==='fovDeg'?`${s[k]}°`:`${s[k]} mm`;
      const drift=headTracker.driftDegPerMinute;
      menu=[`Viewer calibration: ${viewers.active} (presets are provisional)`,
        ...CAL_ROWS.map((r,i)=>`${checkedDevice&&i===calRow?'▶ ':''}${r.label}: ${value(r.key)}`),
        `Tracking ${headTracker.rate}/s, newest reading ${Number.isFinite(headTracker.readingAge)?Math.round(headTracker.readingAge):'–'} ms; offset ${Number.isFinite(headTracker.offsetDeg)?headTracker.offsetDeg.toFixed(1):'–'}°`,
        `Drift (hold still): ${drift===null?'measuring…':`${drift.toFixed(1)}°/min`}. Lag: turn quickly and judge.`];
      items=calibrationItems();
    }else if(session.state==='paused'){
      if(viewerMode==='driving'){
        const ok=!!(c?.connected&&c.device===checkedDevice);
        menu=[`Paused${viewerPauseReason&&viewerPauseReason!=='Paused'?`: ${viewerPauseReason.toLowerCase()}`:''}`,
          ok?'Resume: press Pause':'Reconnect the checked controller to resume',
          'Recentre: press Recentre','Exit: hold Brake for 2 seconds',
          headTracker.readingAge>TRACKING_STALE_MS?'Head tracking has stopped: it must return before resuming':'',
          'Traffic and timing are frozen while paused.'].filter(Boolean);
      }else{
        menu=['Paused (parked, not scored)','Look at a button below for a moment, or tap the screen to leave.'];
        items=belowMenu([['resume','Resume'],['recentre','Recentre'],['exit','Exit']],1.5);
      }
    }else if(viewerStarting){
      if(!headTracker.receiving)menu=['Waiting for head tracking…','Check that motion access is allowed.'];
      else if(!settled)menu=['Put the phone in the headset…'];
      else if(viewerMode==='driving')menu=['Look straight ahead','Then press Recentre to start.','Hold Accelerate to move; release to coast.',`Brake acts at once. Assisted speed up to ${runtime?.scenario.controllerDriving.assistedSpeedMph??15} mph.`];
      else{menu=['Look straight ahead at Start','Parked practice: look around, check the mirrors,','and practise shoulder checks. Not scored.'];items=[START_ITEM]}
    }else if(viewerMode==='familiarisation')items=[FAMILIARISATION_MENU];
    viewerHud.setItems(items);
    viewerHud.setMenu(menu);
    const fired=viewerHud.update(dt,local);
    if(fired)viewerItem(fired);
    const accel=viewerMode==='driving'&&c?c.values.accelerate>0&&accelArmed:false;
    const braking=viewerMode==='driving'&&c?c.values.brake>0:false;
    viewerHud.setStatus([
      `${Math.round(vehicle.state.speed*2.237)} mph   ${signalText}`,
      viewerMode==='calibration'?'Calibration (parked)'
        :viewerMode==='familiarisation'?'Parked practice (not scored)'
        :braking?'BRAKE':accel?'ACCELERATE (held)':vehicle.state.speed>.2?'Coasting (Accelerate released)':'Stopped',
      viewerMode==='driving'?(byId('hud-task').textContent||runtime?.scenario.title||''):'Menu: look at it for a moment · tap screen to leave'
    ]);
  };

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
  /** Whether to paint the exercise's route guidance on the road (exercise screen option; off by default). */
  let showGuide=false;
  const guideToggle=byId<HTMLInputElement>('guide-toggle');
  guideToggle.addEventListener('change',()=>{showGuide=guideToggle.checked});
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
    byId('guide-option').hidden=!scenario.guide;
    showGuide=guideToggle.checked=false;
    byId('intro-option').hidden=!chosen.intro;
    preview(scenario);
  };
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-exercise]'))
    button.addEventListener('click',()=>showExercise(button.dataset.exercise!));
  byId('exercise-back').addEventListener('click',()=>showExercise(null));

  const start=(scenarioId:string,options:{familiarisation?:boolean}={})=>{
    if(session.state!=='ready')return;
    runtime?.dispose();
    const scenario=scenarios.get(scenarioId)!;
    useLocation(scenario.locationId);
    runtime=buildExercise(scenario,!!options.familiarisation);
    attachRunner();
    if(!session.to('running'))return;
    resetAttempt();
    byId('paused-title').textContent=scenario.title;
    clock.resume();
    events.emit('session.started',{locationId:place.id,scenarioId,quality:quality.id,variant:runtime.variant?.id??null,guidance:!!scenario.guide&&showGuide,
      controlMode:options.familiarisation?'phone-viewer-familiarisation':controlMode(),scored:!options.familiarisation});
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
    if(action==='recentre'){forwardView();xr.recentre();if(viewer.active)headTracker.recentre()}
    else vehicle.toggleIndicator(action==='indicator-left'?'left':'right',clock.time);
  };
  // In the phone viewer, keys act only through the controller check's bindings (so nothing acts twice).
  input.onAction=action=>{if(!viewer.active)onAction(action)};

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
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)return;
    // In the headset this also drops any held acceleration; it stays paused until resumed deliberately.
    if(viewer.active)viewerPause('The page was hidden');
    else if(session.state==='running')pause();
  });

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
      props.available.size?`scenery: ${[...props.available].map(id=>PROP_ASSETS[id]?.storage==='private'?`${id} (licensed, private)`:id).join(', ')}`:'no scenery models in this build'
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
  /** Diagnostics: render every mirror every frame, seen or not (to measure what each mirror shows). */
  let allMirrorsLive=false;
  /** Diagnostics: a top-down camera (or one looking at `target`) for layout review screenshots. */
  let overhead:{x:number;z:number;height:number;target?:{x:number;y:number;z:number}}|null=null;
  const perf=new PerfProbe();
  engine.runRenderLoop(()=>{
    const dt=engine.getDeltaTime()/1000;
    pollController();
    if(!byId('exercise-detail').hidden)refreshDriveButton();
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
    if(viewer.active)updateViewer(dt,pose);
    const eye=head.eyeWorld(pose),look=head.lookWorld(pose);
    if(viewer.active&&!overhead){/* cameras placed by updateViewer */}
    else if(overhead){
      camera.position.set(overhead.x,overhead.height,overhead.z+.01);
      const t=overhead.target;
      camera.setTarget(t?new Vector3(t.x,t.y,t.z):new Vector3(overhead.x,0,overhead.z));
    }else{
      camera.position.set(eye.x,eye.y,eye.z);
      camera.setTarget(new Vector3(eye.x+look.x,eye.y+look.y,eye.z+look.z));
    }
    for(const mirror of mirrors){
      mirror.update(pose);
      mirror.setActive(mirrorsOn&&(allMirrorsLive||camera.isInFrustum(mirror.glass)));
      // The mirror being looked at updates every frame so approaching traffic stays readable.
      mirror.setRefresh(allMirrorsLive||heldView===mirror.spec.id?1:quality.mirrorUpdateInterval);
    }
    runtime?.renderVisuals();
    tiltSteer=tilt.read(dt);
    const wheelTurn=`rotate(${Math.round((steeringMode==='tilt'?tiltSteer:vehicle.state.steerAngle/.6)*120)}deg)`;
    hudWheel.style.transform=wheelTurn;
    // Turning right turns the wheel clockwise as the driver sees it.
    cockpit.wheel.rotation.y=-vehicle.state.steerAngle*STEERING_RATIO;
    cockpit.setInstruments(Math.round(vehicle.state.speed*2.237),vehicle.indicators.state,vehicle.indicators.isLit(clock.time));
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
  window.addEventListener('resize',()=>{engine.resize();viewer.layout()});

  let instrumentation:import('@babylonjs/core/Instrumentation/sceneInstrumentation').SceneInstrumentation|null=null;
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
    /** Whether route guidance is painted on the road in this attempt. */
    guidanceShown:()=>!!scene.getTransformNodeByName('exercise-guide'),
    /** Phone viewer state, for tests and diagnostics. */
    viewer:()=>({active:viewer.active,mode:viewerMode,starting:viewerStarting,pauseReason:viewerPauseReason,settings:viewerSettings,slot:viewers.active,gaze:viewerHud.gaze,items:viewerHud.itemIds,
      receiving:headTracker.receiving,readingAge:headTracker.readingAge,rate:headTracker.rate,offsetDeg:headTracker.offsetDeg,driftDegPerMinute:headTracker.driftDegPerMinute,invalidReadings:headTracker.invalidReadings,
      permission:headTracker.permission,checkedDevice,controller:controllerState?{connected:controllerState.connected,device:controllerState.device,values:controllerState.values}:null,
      accelArmed,brakeLatency:brakeAppliedAt>=brakeInputAt&&brakeInputAt>=0?brakeAppliedAt-brakeInputAt:null,activeCameras:scene.activeCameras?.map(c=>c.name)??[]}),
    /** The controls applied in the last simulation step. */
    lastControls:()=>({...lastControls}),
    scenery:()=>({...sceneryStats,carModels:[...carModels].filter(([,m])=>m).map(([id])=>id)}),
    /** Diagnostics: start counting draw calls (average per frame over the last second, all render passes including mirrors). */
    countDrawCalls:async()=>{
      if(!instrumentation){const {SceneInstrumentation}=await import('@babylonjs/core/Instrumentation/sceneInstrumentation');instrumentation=new SceneInstrumentation(scene)}
    },
    /** Diagnostics: show or hide meshes whose names start with `prefix` (to measure what they cost). */
    showMeshes:(prefix:string,on:boolean)=>{for(const m of scene.meshes)if(m.name.startsWith(prefix))m.setEnabled(on)},
    /** Diagnostics: switch the distance haze. */
    fog:(on:boolean)=>{scene.fogEnabled=on},
    /** Diagnostics: what the scene costs (meshes, triangles, draw calls). */
    sceneStats:()=>{
      const meshes=scene.meshes.filter(m=>m.isEnabled()&&m.isVisible&&m.getTotalVertices()>0);
      return {meshes:meshes.length,activeMeshes:scene.getActiveMeshes().length,vertices:scene.getTotalVertices(),triangles:meshes.reduce((n,m)=>n+(m.getTotalIndices()/3),0),drawCalls:instrumentation?.drawCallsCounter.current??null,materials:scene.materials.length,textures:scene.textures.length,
        heaviest:meshes.map(m=>[m.name,m.getTotalIndices()/3] as const).sort((a,b)=>b[1]-a[1]).slice(0,8),
        trianglesBy:Object.fromEntries(['streetscape','parked-cars'].map(p=>[p,meshes.filter(m=>m.name.startsWith(p)).reduce((n,m)=>n+m.getTotalIndices()/3,0)]))};
    },
    overhead:(view:{x:number;z:number;height:number;target?:{x:number;y:number;z:number}}|null)=>{
      const label=byId('hud-view-label');
      // Screenshots from this camera must not be mistaken for a driver's view.
      if(view&&!overhead)label.dataset.driverView=label.textContent??'';
      label.textContent=view?'Diagnostic camera (not a driver view)':label.dataset.driverView??label.textContent;
      overhead=view;
    },
    variant:()=>runtime?.variant?.id??null,
    allMirrorsLive:(on:boolean)=>{allMirrorsLive=on},
    /** Diagnostics: pixels of a colour ('yellow' cyclist, 'purple' car) in a mirror's own image, and their mean position across it (0 = driver's left). */
    mirrorPixels:async(id:string,colour:'yellow'|'purple')=>{
      const m=mirrors.find(x=>x.spec.id===id);
      const data=await m?.texture.readPixels() as Uint8Array|undefined;
      if(!m||!data)return null;
      const w=m.texture.getSize().width;
      let n=0,sx=0;
      for(let i=0;i<data.length;i+=4){
        const r=data[i]!,g=data[i+1]!,b=data[i+2]!;
        if(colour==='purple'?r>90&&b>150&&g<90:r>140&&g>110&&b<80&&r>=g){n++;sx+=(i/4)%w}
      }
      // The image is mirrored on the glass (uScale −1), so the glass position is 1 − x.
      return {n,x:n?1-sx/n/w:null};
    },
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
