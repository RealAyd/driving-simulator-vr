import locationJson from '../../content/locations/representative-residential-straight.json';
import scenarioJson from '../../content/scenarios/crossing-restricted-view.json';
import {
  degToRad,localToWorld,parseLocation,parseScenario,
  type FollowingVehicleActorDef,type PedestrianActorDef,type Pose
} from '../contracts';
import {pedestrianVisual,vehicleVisual} from '../actors/actorVisuals';
import {FOLLOWER_HALF_LENGTH,FOLLOWER_HALF_WIDTH,FollowingVehicle} from '../actors/followingVehicle';
import {PEDESTRIAN_RADIUS,Pedestrian} from '../actors/pedestrian';
import {Assessor} from '../assessment/assessor';
import {buildCockpit} from '../cockpit/cockpitModel';
import {INTERIOR_MIRROR,Mirror} from '../cockpit/mirror';
import {ObservationTracker} from '../cockpit/observation';
import {DriverHead} from '../cockpit/seat';
import {applyPose,configureScene} from '../engine/babylonAdapter';
import {Engine,FreeCamera,Matrix,Scene,TransformNode,Vector3} from '../engine/babylon';
import {FixedStepClock} from '../engine/clock';
import {PerfProbe} from '../engine/perfProbe';
import {pickQualityProfile} from '../engine/quality';
import {KeyboardInput,type InputAction} from '../input/keyboard';
import {ScenarioRunner} from '../scenarios/scenarioRunner';
import {ZoneTracker} from '../scenarios/zones';
import {openAttemptStore} from '../storage/attempts';
import {Hud} from '../ui/hud';
import {renderResults} from '../ui/results';
import {VehicleController} from '../vehicle/vehicleController';
import {buildWorld} from '../world/buildWorld';
import {CompositeCollisions,pointToBox} from '../world/collisions';
import {StaticObstacles} from '../world/obstacles';
import {sampleRoad,surfaceAt} from '../world/roadGeometry';
import {SeatedXr,detectXr} from '../xr/xrSession';
import {EventLog} from './eventLog';
import {Session} from './session';

const LOOK_SENSITIVITY=.004;
const EARLY_STOP_HINT_SECONDS=8;

function byId<T extends HTMLElement>(id:string):T{
  const el=document.getElementById(id);
  if(!el)throw new Error(`Missing #${id}`);
  return el as T;
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
  const scenario=parseScenario(scenarioJson);
  if(scenario.locationId!==place.id)throw new Error(`Scenario ${scenario.id} is for location ${scenario.locationId}, not ${place.id}`);
  const world=buildWorld(scene,place,quality);
  const store=await openAttemptStore();

  const clock=new FixedStepClock(1/60);
  const events=new EventLog(()=>clock.time);
  const input=new KeyboardInput(window,window,document);
  const spawn:Pose={position:{x:place.spawn.position.x,y:0,z:place.spawn.position.z},heading:degToRad(place.spawn.headingDeg)};

  // ---- Road users (scenario actors) ----
  const pedDef=scenario.actors.find((a):a is PedestrianActorDef=>a.kind==='pedestrian');
  const followerDef=scenario.actors.find((a):a is FollowingVehicleActorDef=>a.kind==='following-vehicle');
  if(!pedDef)throw new Error('This exercise needs a pedestrian actor');
  const crossing=place.crossings.find(c=>c.id===pedDef.crossingId);
  if(!crossing)throw new Error(`Crossing ${pedDef.crossingId} is not in location ${place.id}`);

  // The learner car is created first: the pedestrian and following car read
  // its pose, and its collision query reads theirs (through closures).
  let follower:FollowingVehicle|null=null;
  let pedestrian!:Pedestrian;
  const collisions=new CompositeCollisions(new StaticObstacles(place.blocks),[
    {id:pedDef.id,shape:()=>({kind:'circle',x:pedestrian.position.x,z:pedestrian.position.z,radius:PEDESTRIAN_RADIUS})},
    ...(followerDef?[{id:followerDef.id,shape:()=>({kind:'box' as const,pose:follower!.pose,halfWidth:FOLLOWER_HALF_WIDTH,halfLength:FOLLOWER_HALF_LENGTH})}]:[])
  ]);
  const vehicle=new VehicleController(spawn,input,{
    surfaceHeightAt:(x,z)=>surfaceAt(place,x,z)?.height??null,
    groundHeight:0,
    surfaceKindAt:(x,z)=>surfaceAt(place,x,z)?.kind??'none'
  },collisions,events);
  pedestrian=new Pedestrian(pedDef,events,(p,r)=>pointToBox(p.x,p.z,vehicle.pose,vehicle.halfWidth,vehicle.halfLength)<r);
  follower=followerDef?new FollowingVehicle(followerDef,()=>vehicle.pose,()=>vehicle.state.speed):null;

  // ---- Cockpit, mirror, camera ----
  const vehicleNode=new TransformNode('learner-car',scene);
  const head=new DriverHead();
  const cockpit=buildCockpit(scene,vehicleNode,head.seat);
  const seatNode=new TransformNode('driver-seat',scene);
  seatNode.parent=vehicleNode;
  seatNode.position.set(head.seat.eye.x,head.seat.eye.y,head.seat.eye.z);
  const mirrors=[new Mirror(scene,vehicleNode,cockpit.root,INTERIOR_MIRROR,quality,head.seat.eye)];
  const pedVisual=pedestrianVisual(scene,pedestrian);
  const followerVisual=follower?vehicleVisual(scene,follower.id,follower.def.colour,()=>follower.pose):null;

  const camera=new FreeCamera('driver-camera',Vector3.Zero(),scene);
  camera.inputs.clear();
  camera.minZ=.05;
  camera.maxZ=3000;
  camera.fov=degToRad(65);
  scene.activeCamera=camera;

  // ---- Scenario, observation, assessment ----
  const road=place.roads.find(r=>r.id===crossing.roadId)!;
  const zones=new ZoneTracker(place,scenario.zones,()=>({x:vehicle.state.position.x,z:vehicle.state.position.z,speed:vehicle.state.speed}),events);
  let lastCollision:string|null=null;
  const runner=new ScenarioRunner(scenario,zones,new Map([[pedestrian.id,pedestrian]]),()=>{
    const s=sampleRoad(road,vehicle.state.position.x,vehicle.state.position.z);
    return {surface:vehicle.surfaceKind,heading:vehicle.state.heading,roadHeading:Math.atan2(s.direction.x,-s.direction.z),collidedWith:lastCollision};
  },events);
  const observation=new ObservationTracker(
    [{id:'interior',position:pose=>localToWorld(pose,INTERIOR_MIRROR.glass),angularRadius:degToRad(9)}],
    ()=>vehicle.pose,pose=>head.eyeWorld(pose),pose=>head.lookWorld(pose),events
  );
  const assessor=new Assessor({
    events:()=>events.events,
    learner:()=>({pose:vehicle.pose,speed:vehicle.state.speed,halfWidth:vehicle.halfWidth,halfLength:vehicle.halfLength}),
    followerGap:()=>follower?follower.gap:null,
    zones,crossing,pedestrian,
    now:()=>clock.time
  },events);

  // Fixed-step order (brief §10): controls → learner → road users → zones
  // and triggers → observation → assessment. Rendering comes after.
  const modules=[vehicle,pedestrian,...(follower?[follower]:[]),zones,runner,observation,assessor];
  const step=(dt:number,time:number)=>{
    const before=events.events.length;
    vehicle.fixedUpdate(dt);
    lastCollision=null;
    for(let i=before;i<events.events.length;i++){
      const e=events.events[i]!;
      if(e.type==='vehicle.collision')lastCollision=String(e.payload['obstacleId']);
    }
    pedestrian.fixedUpdate(dt);
    follower?.fixedUpdate(dt);
    zones.fixedUpdate(dt);
    runner.fixedUpdate(dt);
    observation.fixedUpdate(dt,time);
    assessor.fixedUpdate();
  };

  // ---- Lifecycle ----
  let stoppedEarlyFor=0;
  let lastResult:ReturnType<Assessor['finish']>|null=null;
  const resetAttempt=()=>{
    input.clear();
    for(const m of modules)m.reset();
    head.recentre();
    clock.reset();
    events.clear();
    lastCollision=null;
    stoppedEarlyFor=0;
    hud.setTask(scenario.briefing);
  };
  runner.onEnded=async outcome=>{
    input.clear();
    clock.pause();
    const result=assessor.finish(scenario.id,outcome,runner.elapsed);
    lastResult=result;
    session.to('finished');
    let saved=0;
    try{
      await store.save(result);
      saved=(await store.list(scenario.id)).length;
    }catch(error){
      console.warn('[Driving Practice] could not save attempt',error);
    }
    renderResults(result,id=>events.events.find(e=>e.id===id)?.time,saved,store.kind);
  };

  // Mouse/touch look: drag to move the head relative to the seat.
  let dragging:number|null=null,lastX=0,lastY=0;
  canvas.addEventListener('pointerdown',event=>{
    dragging=event.pointerId;lastX=event.clientX;lastY=event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(event.pointerId!==dragging||session.state!=='running')return;
    head.look((event.clientX-lastX)*LOOK_SENSITIVITY,-(event.clientY-lastY)*LOOK_SENSITIVITY);
    lastX=event.clientX;lastY=event.clientY;
  });
  const endDrag=(event:PointerEvent)=>{if(event.pointerId===dragging)dragging=null};
  canvas.addEventListener('pointerup',endDrag);
  canvas.addEventListener('pointercancel',endDrag);

  const xr=new SeatedXr(scene,seatNode);

  const start=()=>{
    if(!session.to('running'))return;
    resetAttempt();
    clock.resume();
    events.emit('session.started',{locationId:place.id,scenarioId:scenario.id,quality:quality.id});
    canvas.focus();
  };
  const pause=()=>{
    if(!session.to('paused'))return;
    clock.pause();
    input.clear();
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
  const onAction=(action:InputAction)=>{
    if(action==='pause')return session.state==='running'?pause():session.state==='paused'?resume():undefined;
    if(action==='reset')return restart();
    if(session.state!=='running')return;
    if(action==='recentre'){head.recentre();xr.recentre()}
    else vehicle.toggleIndicator(action==='indicator-left'?'left':'right',clock.time);
  };
  input.onAction=onAction;

  byId('start-button').addEventListener('click',start);
  byId('resume-button').addEventListener('click',resume);
  byId('restart-button').addEventListener('click',restart);
  byId('retry-button').addEventListener('click',restart);
  byId('hud-pause').addEventListener('click',pause);
  byId('hud-ind-left').addEventListener('click',()=>onAction('indicator-left'));
  byId('hud-ind-right').addEventListener('click',()=>onAction('indicator-right'));
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-hold]')){
    const control=button.dataset.hold as 'throttle'|'brake'|'left'|'right';
    const set=(down:boolean)=>(event:Event)=>{event.preventDefault();input.setVirtual(control,down)};
    button.addEventListener('pointerdown',set(true));
    for(const type of ['pointerup','pointerleave','pointercancel'])button.addEventListener(type,set(false));
  }
  byId('touch-controls').hidden=quality.id!=='phone';

  // A hidden tab pauses; losing focus clears held controls (KeyboardInput).
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&session.state==='running')pause()});

  const xrSupport=await detectXr();
  const xrButton=byId<HTMLButtonElement>('xr-button');
  byId('xr-status').textContent=xrSupport.available?'Headset detected · experimental seated VR':xrSupport.reason;
  xrButton.hidden=!xrSupport.available;
  xrButton.addEventListener('click',async()=>{
    start();
    observation.source='head direction';
    try{await xr.enter()}
    catch(error){hud.setStatus(`VR could not start: ${(error as Error).message}`)}
  });
  xr.onExit=()=>{observation.source='mouse-controlled view';if(session.state==='running')pause()};

  hud.setStatus(`${place.name} · ${place.fidelity} layout · ${quality.id} quality`);
  byId('location-label').textContent=`${scenario.title}. ${place.name} — ${place.fidelity} layout, ${place.reviewStatus}.`;
  byId('scenario-objective').textContent=scenario.learningObjective;

  const perf=new PerfProbe();
  engine.runRenderLoop(()=>{
    const dt=engine.getDeltaTime()/1000;
    if(session.state==='running'){
      perf.record(engine.getDeltaTime());
      clock.advance(dt,step);
      // Stopping unusually early: the pedestrian waits; prompt the learner on.
      const pedTriggered=zones.stats.get('pedestrian-trigger')?.entered;
      stoppedEarlyFor=vehicle.state.speed<.15&&!pedTriggered?stoppedEarlyFor+dt:0;
      hud.setTask(stoppedEarlyFor>EARLY_STOP_HINT_SECONDS?'Continue along the road towards the crossing.':scenario.briefing);
    }
    const alpha=session.state==='running'?clock.alpha:1;
    const pose=vehicle.interpolatedPose(alpha);
    applyPose(vehicleNode,pose);
    const eye=head.eyeWorld(pose),look=head.lookWorld(pose);
    camera.position.set(eye.x,eye.y,eye.z);
    camera.setTarget(new Vector3(eye.x+look.x,eye.y+look.y,eye.z+look.z));
    for(const mirror of mirrors)mirror.update(pose);
    pedVisual.update();
    followerVisual?.update();
    hud.update(vehicle.state.speed,vehicle.indicators.state,vehicle.indicators.isLit(clock.time),engine.getFps());
    scene.render();
  });
  window.addEventListener('resize',()=>engine.resize());

  // Read-only handle for automated browser tests and manual diagnostics.
  Object.defineProperty(window,'__drivingPractice',{value:Object.freeze({
    session:()=>session.state,
    vehicle:()=>({...vehicle.state,indicator:vehicle.indicators.state,surface:vehicle.surfaceKind}),
    head:()=>({yaw:head.yaw,pitch:head.pitch}),
    look:(yaw:number,pitch:number)=>{head.recentre();head.look(yaw,pitch)},
    camera:()=>({position:camera.position.asArray(),forward:camera.getForwardRay(1).direction.asArray()}),
    events:()=>events.events.map(e=>({...e})),
    simTime:()=>clock.time,
    pedestrian:()=>({state:pedestrian.state,position:{...pedestrian.position}}),
    follower:()=>follower?{gap:follower.gap,speed:follower.speed,pose:follower.pose}:null,
    findings:()=>assessor.current.map(f=>({...f})),
    result:()=>lastResult,
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
    /** On-screen rectangle of each mirror's glass, in CSS pixels. */
    mirrors:()=>mirrors.map(m=>{
      m.glass.computeWorldMatrix(true);
      const box=m.glass.getBoundingInfo().boundingBox.vectorsWorld;
      const viewport=camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
      const ratio=canvas.clientWidth/engine.getRenderWidth();
      const points=box.map(v=>Vector3.Project(v,Matrix.IdentityReadOnly,scene.getTransformMatrix(),viewport));
      const xs=points.map(p=>p.x*ratio),ys=points.map(p=>p.y*ratio);
      return {id:m.spec.id,left:Math.min(...xs),top:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys)};
    })
  })});

  window.addEventListener('pagehide',()=>{
    input.dispose();xr.dispose();for(const mirror of mirrors)mirror.dispose();
    pedVisual.dispose();followerVisual?.dispose();
    for(const m of modules)m.dispose();
    cockpit.dispose();world.dispose();scene.dispose();engine.dispose();
  });

  session.to('ready');
}
