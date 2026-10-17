import locationJson from '../../content/locations/representative-residential-straight.json';
import crossingJson from '../../content/scenarios/crossing-restricted-view.json';
import mirrorCheckJson from '../../content/scenarios/mirror-check.json';
import {
  degToRad,localToWorld,parseLocation,parseScenario,
  type AttemptResult,type FollowingVehicleActorDef,type PassingVehicleActorDef,type PedestrianActorDef,type Pose,type Scenario
} from '../contracts';
import {pedestrianVisual,vehicleVisual} from '../actors/actorVisuals';
import {FOLLOWER_HALF_LENGTH,FOLLOWER_HALF_WIDTH,FollowingVehicle} from '../actors/followingVehicle';
import {PassingVehicle} from '../actors/passingVehicle';
import {PEDESTRIAN_RADIUS,Pedestrian} from '../actors/pedestrian';
import {Assessor} from '../assessment/assessor';
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
import {TILT_SENSITIVITY,TiltSteering} from '../input/tilt';
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
import {SeatedXr,detectXr} from '../xr/xrSession';
import {EventLog} from './eventLog';
import {Session} from './session';

const LOOK_SENSITIVITY=.004;
/** Seconds the briefing stays up, with the simulation held, before each attempt. */
const BRIEFING_SECONDS=10;
const SIM_STEP=1/60;
type SteeringMode='assist'|'tilt'|'buttons';
const EARLY_STOP_HINT_SECONDS=8;
const HORIZONTAL_FOV=degToRad(95);
/** While a mirror view is held the view narrows, like focusing on the glass. */
const MIRROR_FOCUS_FOV=degToRad(50);
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
  const place=parseLocation(locationJson);
  const scenarios=new Map([crossingJson,mirrorCheckJson].map(raw=>{
    const s=parseScenario(raw);
    if(s.locationId!==place.id)throw new Error(`Scenario ${s.id} is for location ${s.locationId}, not ${place.id}`);
    return [s.id,s] as const;
  }));
  const world=buildWorld(scene,place,quality);
  const store=await openAttemptStore();

  const clock=new FixedStepClock(SIM_STEP);
  const events=new EventLog(()=>clock.time);
  const input=new KeyboardInput(window,window,document);
  const spawn:Pose={position:{x:place.spawn.position.x,y:0,z:place.spawn.position.z},heading:degToRad(place.spawn.headingDeg)};

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
  },new CompositeCollisions(new StaticObstacles(place.blocks),dynamicFootprints),events);

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
  let heldBy:'touch'|'key'|null=null;
  let heldView:ViewTarget|null=null;
  const holdView=(view:ViewTarget|null,by:'touch'|'key')=>{
    if(session.state!=='running')return;
    heldBy=view?by:null;
    heldView=view;
    head.hold(view?viewAim[view]:null);
    if(view)events.emit('view.selected',{view,by});
  };
  input.onView=view=>holdView(view,'key');
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
    const passers=scenario.actors.filter((a):a is PassingVehicleActorDef=>a.kind==='passing-vehicle').map(d=>new PassingVehicle(d));
    if(pedestrian){
      dynamicFootprints.push({id:pedestrian.id,shape:()=>({kind:'circle',x:pedestrian.position.x,z:pedestrian.position.z,radius:PEDESTRIAN_RADIUS})});
    }
    if(follower){
      dynamicFootprints.push({id:follower.id,shape:()=>({kind:'box',pose:follower.pose,halfWidth:FOLLOWER_HALF_WIDTH,halfLength:FOLLOWER_HALF_LENGTH})});
    }
    for(const p of passers)dynamicFootprints.push({id:p.id,shape:()=>({kind:'box',pose:p.pose,...p.size})});
    const visuals=[
      ...(pedestrian?[pedestrianVisual(scene,pedestrian)]:[]),
      ...(follower?[vehicleVisual(scene,follower.id,follower.def.colour,()=>follower.pose)]:[]),
      ...passers.map(p=>vehicleVisual(scene,p.id,p.def.colour,()=>p.pose,p.def.body))
    ];

    const zones=new ZoneTracker(place,scenario.zones,()=>({x:vehicle.state.position.x,z:vehicle.state.position.z,speed:vehicle.state.speed}),events);
    const road=place.roads[0]!;
    let lastCollision:string|null=null;
    const runner=new ScenarioRunner(scenario,zones,new Map(pedestrian?[[pedestrian.id,pedestrian]]:[]),()=>{
      const s=sampleRoad(road,vehicle.state.position.x,vehicle.state.position.z);
      return {surface:vehicle.surfaceKind,heading:vehicle.state.heading,roadHeading:Math.atan2(s.direction.x,-s.direction.z),collidedWith:lastCollision};
    },events);

    const crossing=pedestrian?place.crossings.find(c=>c.id===pedestrian.def.crossingId)??null:null;
    const assessor=scenario.rubricId==='crossing-restricted-view'&&pedestrian&&crossing?new Assessor({
      events:()=>events.events,
      learner:()=>({pose:vehicle.pose,speed:vehicle.state.speed,halfWidth:vehicle.halfWidth,halfLength:vehicle.halfLength}),
      followerGap:()=>follower?follower.gap:null,
      zones,crossing,pedestrian,now:()=>clock.time
    },events):null;
    const practice=assessor?null:new ViewPracticeSummary(passers,()=>vehicle.pose,()=>events.events,()=>clock.time);

    const modules:SimModule[]=[
      ...(pedestrian?[pedestrian]:[]),...(follower?[follower]:[]),...passers,
      zones,runner,observation,...(assessor?[assessor]:[]),...(practice?[practice]:[])
    ];
    const assist=scenario.assistPath?new SteeringAssist(scenario.assistPath,vehicle.params):null;
    const names:Record<string,string>={'overtaking-car':'magenta car',cyclist:'cyclist'};
    return {
      scenario,modules,runner,zones,assist,pedestrian,follower,passers,
      afterVehicleStep(firstNewEvent){
        lastCollision=null;
        for(let i=firstNewEvent;i<events.events.length;i++){
          const e=events.events[i]!;
          if(e.type==='vehicle.collision')lastCollision=String(e.payload['obstacleId']);
        }
      },
      finish(outcome){
        const base=assessor?assessor.finish(scenario.id,outcome,runner.elapsed):{
          scenarioId:scenario.id,rubricVersion:'none (practice)',outcome,findings:[],
          notes:practice!.notes(names),durationSeconds:runner.elapsed,finishedAt:new Date().toISOString()
        };
        if(steeringMode==='assist'&&assist)base.notes.push('Steering assistance was on: it kept the car on the lane path while you controlled speed and observations.');
        if(steeringMode==='tilt')base.notes.push('You steered by tilting the phone.');
        return base;
      },
      current:()=>assessor?assessor.current:[],
      renderVisuals(){for(const v of visuals)v.update()},
      dispose(){
        for(const v of visuals)v.dispose();
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
  // The briefing holds simulation time; views can still be tried while reading it.
  let briefingLeft=0;
  const briefingCount=byId('briefing-count');
  const startBriefing=(scenario:Scenario)=>{
    hud.setTask(scenario.briefing,false);
    byId('briefing-text').textContent=scenario.briefing;
    byId('briefing-steering').textContent={
      assist:'Steering: assisted. You control speed with Go and Brake, plus signals and observations.',
      tilt:'Steering: tilt the phone like a wheel. Hold it how you want to drive now; that position becomes straight ahead.',
      buttons:'Steering: hold ◀ ▶ (or A/D, ←/→).'
    }[steeringMode];
    briefingLeft=BRIEFING_SECONDS;
    briefingCount.textContent=String(BRIEFING_SECONDS);
    byId('briefing').hidden=false;
  };
  const endBriefing=()=>{
    if(byId('briefing').hidden)return;
    briefingLeft=0;
    byId('briefing').hidden=true;
    input.clear();
    if(steeringMode==='tilt')tilt.recentre();
    canvas.focus();
  };
  const resetAttempt=()=>{
    input.clear();
    buttonSteer.reset();
    vehicle.reset();
    for(const m of runtime?.modules??[])m.reset();
    head.recentre();
    heldBy=null;
    heldView=null;
    camera.fov=HORIZONTAL_FOV;
    clock.reset();
    events.clear();
    stoppedEarlyFor=0;
    if(runtime)startBriefing(runtime.scenario);
  };
  const attachRunner=()=>{
    runtime!.runner.onEnded=async outcome=>{
      input.clear();
      head.hold(null);
      clock.pause();
      const result=runtime!.finish(outcome);
      lastResult=result;
      session.to('finished');
      let saved=0;
      try{
        await store.save(result);
        saved=(await store.list(result.scenarioId)).length;
      }catch(error){
        console.warn('[Driving Practice] could not save attempt',error);
      }
      renderResults(result,id=>events.events.find(e=>e.id===id)?.time,saved,store.kind);
    };
  };

  // Swipe/mouse look: drag to move the head relative to the seat.
  let dragging:number|null=null,lastX=0,lastY=0;
  canvas.addEventListener('pointerdown',event=>{
    dragging=event.pointerId;lastX=event.clientX;lastY=event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(event.pointerId!==dragging||session.state!=='running'||head.target)return;
    head.look((event.clientX-lastX)*LOOK_SENSITIVITY,-(event.clientY-lastY)*LOOK_SENSITIVITY);
    lastX=event.clientX;lastY=event.clientY;
  });
  const endDrag=(event:PointerEvent)=>{if(event.pointerId===dragging)dragging=null};
  canvas.addEventListener('pointerup',endDrag);
  canvas.addEventListener('pointercancel',endDrag);

  const xr=new SeatedXr(scene,seatNode);

  // ---- Steering mode: assisted, tilt the phone, or buttons/keys ----
  const tiltStatus=byId('tilt-status');
  const steeringRadios=[...document.querySelectorAll<HTMLInputElement>('input[name="steering"]')];
  const setSteeringMode=(mode:SteeringMode)=>{
    steeringMode=mode;
    for(const radio of steeringRadios)radio.checked=radio.value===mode;
    byId('tilt-options').hidden=mode!=='tilt';
    document.body.classList.toggle('tilt',mode==='tilt');
    if(mode!=='tilt'&&tilt.status!=='off')tilt.disable();
  };
  for(const radio of steeringRadios)radio.addEventListener('change',async()=>{
    const mode=radio.value as SteeringMode;
    if(mode!=='tilt'){setSteeringMode(mode);tiltStatus.textContent='';return}
    setSteeringMode('tilt');
    tiltStatus.textContent='Asking for motion access…';
    // Called straight from the tap, as iOS requires.
    const status=await tilt.enable();
    if(status==='active'){tiltStatus.textContent='Motion sensor working. Tilt the phone to see the wheel turn.';return}
    setSteeringMode(quality.id==='phone'?'assist':'buttons');
    tiltStatus.textContent=status==='denied'
      ?'Motion access was refused, so tilt steering is off. If you are viewing this inside another page or app, it may block motion sensors.'
      :'No motion sensor readings arrived in this browser, so tilt steering is off.';
  });
  const sensitivity=byId<HTMLSelectElement>('tilt-sensitivity');
  sensitivity.addEventListener('change',()=>{tilt.tuning=TILT_SENSITIVITY[sensitivity.value as keyof typeof TILT_SENSITIVITY]});
  setSteeringMode(steeringMode);
  const wheelPreview=byId('tilt-preview');

  const start=(scenarioId:string)=>{
    if(session.state!=='ready')return;
    runtime?.dispose();
    runtime=buildExercise(scenarios.get(scenarioId)!);
    attachRunner();
    if(!session.to('running'))return;
    resetAttempt();
    clock.resume();
    events.emit('session.started',{locationId:place.id,scenarioId,quality:quality.id});
    events.emit('assist.changed',{enabled:steeringMode==='assist'&&!!runtime.assist,steering:steeringMode});
    canvas.focus();
  };
  const pause=()=>{
    if(!session.to('paused'))return;
    clock.pause();
    input.clear();
    head.hold(null);heldBy=null;heldView=null;
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
    events.emit('session.reset');
    if(wasPaused)resume();
    else if(wasFinished){session.to('running');clock.resume();canvas.focus()}
  };
  const endAttempt=()=>{
    if(session.state!=='paused'||!runtime)return;
    session.to('running');
    runtime.runner.finish(runtime.scenario.end.zone?'abandoned':'completed');
  };
  const backToMenu=()=>{
    if(session.state!=='finished'&&session.state!=='paused')return;
    clock.pause();
    session.to('ready');
  };
  const onAction=(action:InputAction)=>{
    if(action==='pause')return session.state==='running'?pause():session.state==='paused'?resume():undefined;
    if(action==='reset')return restart();
    if(session.state!=='running')return;
    if(action==='recentre'){head.recentre();xr.recentre()}
    else vehicle.toggleIndicator(action==='indicator-left'?'left':'right',clock.time);
  };
  input.onAction=onAction;

  byId('start-button').addEventListener('click',()=>start('crossing-restricted-view'));
  byId('start-mirror-check').addEventListener('click',()=>start('mirror-check'));
  byId('resume-button').addEventListener('click',resume);
  byId('restart-button').addEventListener('click',restart);
  byId('end-button').addEventListener('click',endAttempt);
  byId('retry-button').addEventListener('click',restart);
  byId('menu-button').addEventListener('click',backToMenu);
  byId('hud-pause').addEventListener('click',pause);
  byId('hud-ind-left').addEventListener('click',()=>onAction('indicator-left'));
  byId('hud-ind-right').addEventListener('click',()=>onAction('indicator-right'));
  byId('hud-task-toggle').addEventListener('click',()=>hud.toggleTask());
  byId('briefing-go').addEventListener('click',endBriefing);
  byId('hud-tilt-centre').addEventListener('click',()=>tilt.recentre());
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-hold]')){
    const control=button.dataset.hold as 'throttle'|'brake'|'left'|'right';
    const set=(down:boolean)=>(event:Event)=>{event.preventDefault();input.setVirtual(control,down)};
    button.addEventListener('pointerdown',set(true));
    for(const type of ['pointerup','pointerleave','pointercancel'])button.addEventListener(type,set(false));
  }
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')){
    const view=button.dataset.view as ViewTarget;
    button.addEventListener('pointerdown',event=>{event.preventDefault();holdView(view,'touch')});
    for(const type of ['pointerup','pointerleave','pointercancel'])button.addEventListener(type,()=>{if(heldBy==='touch')holdView(null,'touch')});
  }
  byId('touch-controls').hidden=quality.id!=='phone';
  document.body.classList.toggle('phone',quality.id==='phone');

  // A hidden tab pauses; losing focus clears held controls (KeyboardInput).
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&session.state==='running')pause()});

  const xrSupport=await detectXr();
  const xrButton=byId<HTMLButtonElement>('xr-button');
  byId('xr-status').textContent=xrSupport.available?'Headset detected · experimental seated VR':xrSupport.reason;
  xrButton.hidden=!xrSupport.available;
  xrButton.addEventListener('click',async()=>{
    start('crossing-restricted-view');
    try{await xr.enter()}
    catch(error){hud.setStatus(`VR could not start: ${(error as Error).message}`)}
  });
  xr.onExit=()=>{if(session.state==='running')pause()};

  hud.setStatus(`${place.name} · ${place.fidelity} layout · ${quality.id} quality`);
  byId('location-label').textContent=`${place.name} — ${place.fidelity} layout, ${place.reviewStatus}.`;

  const hudWheel=byId('hud-wheel');
  const perf=new PerfProbe();
  engine.runRenderLoop(()=>{
    const dt=engine.getDeltaTime()/1000;
    if(session.state==='running'&&runtime){
      perf.record(engine.getDeltaTime());
      head.animate(dt);
      if(briefingLeft>0){
        briefingLeft-=dt;
        briefingCount.textContent=String(Math.max(1,Math.ceil(briefingLeft)));
        if(briefingLeft<=0)endBriefing();
      }
      const wantFov=heldView&&!heldView.endsWith('shoulder')?MIRROR_FOCUS_FOV:HORIZONTAL_FOV;
      camera.fov+=Math.max(-3*dt,Math.min(3*dt,wantFov-camera.fov));
      observation.source=observationSource();
      if(briefingLeft<=0)clock.advance(dt,step);
      // Stopping unusually early: the pedestrian waits; prompt the learner on.
      const trigger=runtime.zones.stats.get('pedestrian-trigger');
      stoppedEarlyFor=trigger&&!trigger.entered&&vehicle.state.speed<.15?stoppedEarlyFor+dt:0;
      if(stoppedEarlyFor>EARLY_STOP_HINT_SECONDS&&stoppedEarlyFor-dt<=EARLY_STOP_HINT_SECONDS)hud.setTask('Continue along the road towards the crossing.');
    }
    const alpha=session.state==='running'?clock.alpha:1;
    const pose=vehicle.interpolatedPose(alpha);
    applyPose(vehicleNode,pose);
    const eye=head.eyeWorld(pose),look=head.lookWorld(pose);
    camera.position.set(eye.x,eye.y,eye.z);
    camera.setTarget(new Vector3(eye.x+look.x,eye.y+look.y,eye.z+look.z));
    for(const mirror of mirrors){
      mirror.update(pose);
      mirror.setActive(camera.isInFrustum(mirror.glass));
    }
    runtime?.renderVisuals();
    tiltSteer=tilt.read(dt);
    const wheelTurn=`rotate(${Math.round((steeringMode==='tilt'?tiltSteer:vehicle.state.steerAngle/.6)*120)}deg)`;
    hudWheel.style.transform=wheelTurn;
    // Turning right turns the wheel clockwise as the driver sees it.
    cockpit.wheel.rotation.y=-vehicle.state.steerAngle*STEERING_RATIO;
    if(session.state==='ready')wheelPreview.style.transform=wheelTurn;
    if(tilt.stale)hud.setStatus('Motion sensor stopped sending readings.');
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
    briefing:()=>Math.max(0,briefingLeft),
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
