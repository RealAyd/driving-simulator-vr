import {Engine,FreeCamera,Scene,TransformNode,Vector3} from '@babylonjs/core';
import locationJson from '../../content/locations/representative-residential-straight.json';
import {degToRad,parseLocation,type Pose} from '../contracts';
import {applyPose,configureScene} from '../engine/babylonAdapter';
import {FixedStepClock} from '../engine/clock';
import {pickQualityProfile} from '../engine/quality';
import {buildCockpit} from '../cockpit/cockpitModel';
import {DriverHead} from '../cockpit/seat';
import {KeyboardInput,type InputAction} from '../input/keyboard';
import {Hud} from '../ui/hud';
import {VehicleController} from '../vehicle/vehicleController';
import {buildWorld} from '../world/buildWorld';
import {StaticObstacles} from '../world/obstacles';
import {surfaceAt} from '../world/roadGeometry';
import {SeatedXr,detectXr} from '../xr/xrSession';
import {EventLog} from './eventLog';
import {Session} from './session';

const LOOK_SENSITIVITY=.004;

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
  const world=buildWorld(scene,place,quality);

  const clock=new FixedStepClock(1/60);
  const events=new EventLog(()=>clock.time);
  const input=new KeyboardInput(window,window,document);
  const spawn:Pose={position:{x:place.spawn.position.x,y:0,z:place.spawn.position.z},heading:degToRad(place.spawn.headingDeg)};
  const vehicle=new VehicleController(
    spawn,input,
    {surfaceHeightAt:(x,z)=>surfaceAt(place,x,z)?.height??null,groundHeight:0},
    new StaticObstacles(place.blocks),
    events
  );

  const vehicleNode=new TransformNode('learner-car',scene);
  const head=new DriverHead();
  const cockpit=buildCockpit(scene,vehicleNode,head.seat);
  // Seat node: XR camera parent. The headset adds only physical head pose.
  const seatNode=new TransformNode('driver-seat',scene);
  seatNode.parent=vehicleNode;
  seatNode.position.set(head.seat.eye.x,head.seat.eye.y,head.seat.eye.z);

  const camera=new FreeCamera('driver-camera',Vector3.Zero(),scene);
  camera.inputs.clear();
  camera.minZ=.05;
  camera.maxZ=3000;
  camera.fov=degToRad(65);
  scene.activeCamera=camera;

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
    clock.resume();
    events.emit('session.started',{locationId:place.id,quality:quality.id});
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
    if(session.state!=='running'&&session.state!=='paused')return;
    input.clear();
    vehicle.reset();
    head.recentre();
    clock.reset();
    events.clear();
    events.emit('session.reset');
    if(session.state==='paused')resume();
  };
  const onAction=(action:InputAction)=>{
    if(action==='pause')return session.state==='running'?pause():resume();
    if(session.state!=='running')return;
    if(action==='reset')restart();
    else if(action==='recentre'){head.recentre();xr.recentre()}
    else vehicle.toggleIndicator(action==='indicator-left'?'left':'right',clock.time);
  };
  input.onAction=onAction;

  byId('start-button').addEventListener('click',start);
  byId('resume-button').addEventListener('click',resume);
  byId('restart-button').addEventListener('click',restart);
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
    try{await xr.enter()}
    catch(error){hud.setStatus(`VR could not start: ${(error as Error).message}`)}
  });
  xr.onExit=()=>{if(session.state==='running')pause()};

  hud.setStatus(`${place.name} · ${place.fidelity} layout · ${quality.id} quality`);
  byId('location-label').textContent=`${place.name} — ${place.fidelity} layout, ${place.reviewStatus}`;

  engine.runRenderLoop(()=>{
    const dt=engine.getDeltaTime()/1000;
    if(session.state==='running')clock.advance(dt,step=>vehicle.fixedUpdate(step));
    const pose=vehicle.interpolatedPose(session.state==='running'?clock.alpha:1);
    applyPose(vehicleNode,pose);
    const eye=head.eyeWorld(pose),look=head.lookWorld(pose);
    camera.position.set(eye.x,eye.y,eye.z);
    camera.setTarget(new Vector3(eye.x+look.x,eye.y+look.y,eye.z+look.z));
    hud.update(vehicle.state.speed,vehicle.indicators.state,vehicle.indicators.isLit(clock.time),engine.getFps());
    scene.render();
  });
  window.addEventListener('resize',()=>engine.resize());

  // Read-only handle for automated browser tests and manual diagnostics.
  Object.defineProperty(window,'__drivingPractice',{value:Object.freeze({
    session:()=>session.state,
    vehicle:()=>({...vehicle.state,indicator:vehicle.indicators.state}),
    head:()=>({yaw:head.yaw,pitch:head.pitch}),
    camera:()=>({position:camera.position.asArray(),forward:camera.getForwardRay(1).direction.asArray()}),
    events:()=>events.events.map(e=>({...e})),
    simTime:()=>clock.time,
    quality:quality.id,
    fps:()=>engine.getFps()
  })});

  window.addEventListener('pagehide',()=>{
    input.dispose();xr.dispose();cockpit.dispose();world.dispose();scene.dispose();engine.dispose();
  });

  session.to('ready');
}
