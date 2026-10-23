import locationJson from '../../content/locations/representative-residential-straight.json';
import crossingJson from '../../content/scenarios/crossing-restricted-view.json';
import movingOffJson from '../../content/scenarios/moving-off-safely.json';
import movingOffIntroJson from '../../content/scenarios/moving-off-intro.json';
import movingOffLocationJson from '../../content/locations/residential-moving-off.json';
import movingOffRubric from '../../content/rubrics/moving-off.json';
import brentwoodJson from '../../content/locations/brentwood-paired-mini-roundabouts.json';
import brentwoodGuidedJson from '../../content/scenarios/brentwood-guided-traversal.json';
import kingsRoadJson from '../../content/locations/brentwood-kings-road-zebra.json';
import kingsRoadZebraJson from '../../content/scenarios/brentwood-kings-road-zebra.json';
import goodmayesJson from '../../content/locations/goodmayes.json';
import goodmayesFreeDriveJson from '../../content/scenarios/goodmayes-free-drive.json';
import {
  INFO,degToRad,headingDelta,localDirectionToWorld,localToWorld,parseLocation,parseScenario,
  type AttemptConditions,type AttemptResult,type FollowingVehicleActorDef,type PassingVehicleActorDef,type PedestrianActorDef,type Pose,type Scenario
} from '../contracts';
import {busVisual,pedestrianFigure,vehicleVisual} from '../actors/actorVisuals';
import {Bus,BUS_SIZE} from '../actors/bus';
import {layoutCrowd,personPose,type Person} from '../world/crowd';
import {PeopleRenderer} from '../world/peopleMesh';
import {AnimatedPeople} from '../world/animatedPeople';
import {junctionMouths,mouthPoint} from '../world/junctionControls';
import {layoutSignage,type SignPlan} from '../world/signage';
import {placeLabel,type PlaceLabel} from '../world/placeLabel';
import {buildSignage,type BuiltSignage} from '../world/signageMesh';
import {FOLLOWER_HALF_LENGTH,FOLLOWER_HALF_WIDTH,FollowingVehicle} from '../actors/followingVehicle';
import {PassingVehicle} from '../actors/passingVehicle';
import {PEDESTRIAN_RADIUS,Pedestrian,onwardPath} from '../actors/pedestrian';
import {Soundscape,type RoadUserSound} from '../audio/soundscape';
import {Traffic} from '../actors/traffic';
import {RoadNetwork} from '../test/route';
import {routeLanePath} from '../test/routePath';
import {FreeDriveAssist} from '../test/freeDriveAssist';
import {SHOW_ME,TELL_ME,pick} from '../test/vehicleChecks';
import {CarControls,type CarControlId} from '../vehicle/carControls';
import {CarControlsPanel,askTellMe,hideQuestion} from '../ui/carControlsPanel';
import {DRIVE_TOUR,HOME_TOUR,Tutorial} from '../ui/tutorial';
import {LESSONS,LESSONS_COMING,planLesson,type Lesson} from '../lessons/syllabus';
import {Instructor} from '../lessons/instructor';
import {DIFFICULTIES,savedDifficulty,saveDifficulty,type Difficulty} from './difficulty';
import type {ExaminerListener} from '../test/examiner';
import {Examiner} from '../test/examiner';
import {ExaminerVoice} from '../test/voice';
import {MockTestAssessor} from '../assessment/mockTest';
import goodmayesMockTestJson from '../../content/scenarios/goodmayes-mock-test.json';
import goodmayesLessonJson from '../../content/scenarios/goodmayes-lesson.json';
import {DriverBody} from '../cockpit/driverBody';
import {buildArea} from '../generator/area';
import {setUpAreaSearch,setUpCentreBrowser} from '../ui/areaSearch';
import {installed,setUpFullscreen} from '../ui/fullscreen';
import {Assessor} from '../assessment/assessor';
import {MovingOffAssessor} from '../assessment/movingOff';
import {CAR_MODELS,CarModel,PROP_ASSETS,PropLibrary,bakeParkedCars,loadCarModels,type ParkedCar} from '../assets/models';
import {addLPlates} from '../cockpit/lPlates';
import {roadUserCarModels,useVehicleSet,activeVehicleSet} from '../assets/carSpecs';
import {BUS_MODELS,PANEL_VAN,type CarModelId} from '../assets/carSpecs';
import {RouteSummary} from '../assessment/routeSummary';
import {ViewPracticeSummary} from '../assessment/viewPractice';
import {STEERING_RATIO,buildCockpit} from '../cockpit/cockpitModel';
import {ALL_MIRRORS,Mirror} from '../cockpit/mirror';
import {ObservationTracker,type ObservationSource,type ObservationTarget} from '../cockpit/observation';
import {DriverHead} from '../cockpit/seat';
import {applyPose,configureScene,groundAt,onGround,setGround} from '../engine/babylonAdapter';
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
import {applyTextSize,loadTextSize,openGlossary} from '../ui/glossary';
import {lessonsDone,markLessonDone} from '../lessons/progress';
import type {SheetExtras} from '../ui/markSheet';
import type {SimModule} from '../contracts';
import {SteeringAssist} from '../vehicle/steeringAssist';
import {VehicleController,type ControlSource} from '../vehicle/vehicleController';
import {buildWorld} from '../world/buildWorld';
import {layoutStreetscape} from '../world/streetscape';
import {kerbFootprints,layoutTownscape,type KerbFootprint} from '../world/townscape';
import {buildStreetscape} from '../world/streetscapeMesh';
import {CompositeCollisions,pointToBox,type DynamicFootprint} from '../world/collisions';
import {StaticObstacles} from '../world/obstacles';
import {pointAtAlong,sampleRoad,surfaceAt} from '../world/roadGeometry';
import {buildGuide} from '../world/guide';
import {buildSignalHeads} from '../world/signals';
import {TrafficSignals} from '../world/trafficSignals';
import {buildSignalLights} from '../world/signalLights';
import {StreetModels} from '../world/streetModels';
import {SunShadows,rendererName,shadowsWanted} from '../world/shadows';
import {drape,terrainFor} from '../world/terrain';
import {SeatedXr,detectXr} from '../xr/xrSession';
import {yawPitch} from '../xr/headOrientation';
import {HeadTracker,PhoneViewer} from '../xr/phoneViewer';
import {MENU,ViewerHud,type GazeItem} from '../xr/viewerHud';
import {ControllerInput,DRIVE_ACTIONS,DRIVE_ACTION_LABEL,describeBinding,loadBindings,loadCheckedDevice,saveBindings,saveCheckedDevice,storageWorks,type ControllerState,type DriveAction} from '../xr/controllerInput';
import {SETTINGS_LIMITS,VIEWER_SLOTS,activeSettings,applySettings,clampSettings,defaultSettings,loadViewers,saveViewers,type ViewerSettings} from '../xr/viewerSettings';
import type {Controls} from '../vehicle/kinematics';
import {VIEWER_PROFILES} from '../xr/viewerProfiles';
import {EventLog} from './eventLog';
import {Session} from './session';
import {reloadWhenStale} from './staleBuild';
import {AdaptiveScale} from '../engine/renderScale';

const LOOK_SENSITIVITY=.004;
const SIM_STEP=1/60;
type SteeringMode='assist'|'tilt'|'buttons';
const EARLY_STOP_HINT_SECONDS=8;
const HORIZONTAL_FOV=degToRad(95);
/** Looking ahead, the camera glances slightly down (as a seated driver does), so the wheel and hands are in view.
 * Camera only: the head direction, and so observations, are unchanged. Not applied to mirror and shoulder views. */
const FORWARD_GLANCE=degToRad(11);
/** While a mirror view is selected the view narrows, like focusing on the glass (door mirrors are smaller). */
const MIRROR_FOCUS_FOV={interior:degToRad(50),door:degToRad(40)};
/**
 * Vehicle-local points the shoulder checks look towards: sideways and back
 * (about 110°), the area beside the car that the door mirrors do not cover.
 */
const SHOULDER_POINTS={left:{x:-1.8,y:1.1,z:.9},right:{x:2.4,y:1.1,z:.9}};
/** Recorded voices (tools/voice/make_voice.mjs): the instructor (Sonia) and the examiner (Ryan). */
const INSTRUCTOR_CLIPS='voice/',EXAMINER_CLIPS='voice/examiner/';

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
  /** The free-driving assistance (no route): its way ahead is kept up to date each frame. */
  freeAssist:FreeDriveAssist|null;
  pedestrian:Pedestrian|null;
  follower:FollowingVehicle|null;
  passers:PassingVehicle[];
  buses:Bus[];
  traffic:Traffic|null;
  /** Mock test: the examiner (directions; the Task button repeats the last). */
  examiner:Examiner|null;
  /** Traffic lights running at this location (generated areas), or null. */
  trafficSignals:TrafficSignals|null;
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
  // ---- Loading: building a place or starting a drive blocks the page for a few seconds; say so first ----
  const busyBox=byId('busy'),busyText=byId('busy-text'),busyStep=byId('busy-step'),busyPct=byId('busy-pct'),busyBar=byId('busy-bar');
  /** Lets the browser draw (two frames; a moment at most, should frames not come, as in a hidden tab). */
  const drawn=()=>new Promise<void>(r=>{let done=false;const go=()=>{if(!done){done=true;r()}};requestAnimationFrame(()=>requestAnimationFrame(go));setTimeout(go,120)});
  type Report=(percent:number,step?:string)=>Promise<void>;
  const report:Report=async(percent,step)=>{
    const p=Math.max(1,Math.min(100,Math.round(percent)));
    busyPct.textContent=`${p}%`;busyBar.style.width=`${p}%`;busyBar.parentElement!.setAttribute('aria-valuenow',String(p));
    if(step!==undefined)busyStep.textContent=step;
    await drawn();
  };
  /** Shows the loading screen (1–100%), lets the browser draw it, runs `work` (which reports as it goes), hides it. */
  const withLoading=async<T,>(text:string,work:(report:Report)=>T|Promise<T>):Promise<T>=>{
    busyText.textContent=text;busyStep.textContent='';busyBox.hidden=false;
    await report(1);
    try{const result=await work(report);await report(100);return result}finally{busyBox.hidden=true}
  };
  /** Builds a place with the loading screen's percent going from `from` to `to`. */
  const loadLocation=async(id:string,rep:Report,from=0,to=100)=>{for(const [p,step] of locationStages(id))await rep(from+(to-from)*p/100,step)};
  // ---- Tutorial: the home and driving tours, first time by themselves, and from the Tutorial buttons ----
  const tutorial=new Tutorial();
  /** The driving tour with the drive held still (the clock stops until it is finished). */
  const driveTour=(once:boolean)=>{
    if(session.state!=='running'||tutorial.active)return;
    const resume=()=>{if(session.state==='running')clock.resume()};
    if(once?tutorial.startOnce('drive',DRIVE_TOUR,resume):(tutorial.start(DRIVE_TOUR,resume),true))clock.pause();
  };
  session.onChange(state=>{
    if(state==='ready')setTimeout(()=>{if(session.state==='ready'&&!byId('exercise-list').hidden)tutorial.startOnce('home',HOME_TOUR)},400);
    else if(state==='running')setTimeout(()=>driveTour(true),700);
    else tutorial.close();
  });
  byId('tutorial-home').addEventListener('click',()=>tutorial.start(HOME_TOUR));
  byId('hud-tutorial').addEventListener('click',()=>driveTour(false));
  hud.showOnly('loading');
  // ?cars=new: the new set of vehicles, being tried (the plain link keeps the current set). Before any street is laid out.
  useVehicleSet(new URLSearchParams(location.search).get('cars')==='new'?'new':'current');
  // A page from before an update: reload for the current version (not during a drive).
  reloadWhenStale(()=>session.state==='running');
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
  // Babylon counts its scaling level in CSS pixels; the levels here count the screen's own pixels (an iPhone has three
  // to each CSS pixel: at level 1 in CSS pixels it drew a third as many each way, at 1.5 under a fifth).
  const devicePixels=Math.min(window.devicePixelRatio||1,quality.id==='phone'?3:2);
  const setSharpness=(level:number)=>engine.setHardwareScalingLevel(level/devicePixels);
  setSharpness(quality.hardwareScaling);
  const sharpness=quality.id==='phone'?new AdaptiveScale(quality.hardwareScaling,3):null;

  const scene=new Scene(engine);
  configureScene(scene);
  const locations=new Map([locationJson,brentwoodJson,kingsRoadJson,goodmayesJson,movingOffLocationJson].map(raw=>{const l=parseLocation(raw);return [l.id,l] as const}));
  const scenarios=new Map([crossingJson,movingOffJson,movingOffIntroJson,brentwoodGuidedJson,kingsRoadZebraJson,goodmayesFreeDriveJson,goodmayesMockTestJson,goodmayesLessonJson].map(raw=>{
    const s=parseScenario(raw);
    if(!locations.has(s.locationId))throw new Error(`Scenario ${s.id} is for unknown location ${s.locationId}`);
    return [s.id,s] as const;
  }));
  // The world is rebuilt when an exercise takes place somewhere else.
  let place=locations.get(parseLocation(locationJson).id)!;
  // Real ground heights where a location has them (content/terrain); the world is laid on them once dressed.
  let terrain=terrainFor(place.id);
  setGround(terrain?(x,z)=>terrain!.heightAt(x,z):null);
  let world=buildWorld(scene,place,quality,terrain);
  // Sun shadows near the car (the sun belongs to the world, so they are remade with it).
  const shadowsOn=shadowsWanted(location.search,rendererName(engine._gl as WebGLRenderingContext|null));
  let shadows=shadowsOn?new SunShadows(scene,world.sun,quality):null;
  let staticObstacles=new StaticObstacles(place.blocks);
  // Streets from map data: a start facing somewhere to go (RoadNetwork.startNear), worked out once per place.
  // Set as the place's own start before its streets are laid out, so parked cars keep clear of where the car is.
  const settled=new WeakSet<typeof place>();
  const settleStart=(l:typeof place)=>{
    if(l.roads.length<20||settled.has(l))return;
    settled.add(l);
    const net=new RoadNetwork(l),b=net.startNear(l.spawn.position.x,l.spawn.position.z,degToRad(l.spawn.headingDeg));
    const on=net.locate(b.x,b.z,b.heading);
    l.spawn={position:{x:b.x,z:b.z},headingDeg:(b.heading*180/Math.PI+360)%360,roadId:on?.road.id??l.spawn.roadId};
  };
  const spawnOf=(l:typeof place):Pose=>{
    settleStart(l);
    return {position:{x:l.spawn.position.x,y:0,z:l.spawn.position.z},heading:degToRad(l.spawn.headingDeg)};
  };
  /** Building a place, in stages: [percent done, what comes next] after each (the loading screen shows them). */
  function* locationStages(id:string):Generator<[number,string]>{
    if(place.id===id)return;
    yield [3,'Clearing away the last place'];
    shadows?.dispose();
    world.dispose();
    place=locations.get(id)!;
    settleStart(place);
    terrain=terrainFor(place.id);
    setGround(terrain?(x,z)=>terrain!.heightAt(x,z):null);
    yield [8,'Laying the roads and buildings'];
    world=buildWorld(scene,place,quality,terrain);
    if(shadowsOn){shadows=new SunShadows(scene,world.sun,quality);shadows.castOnlyUnder(cockpit.root)}
    placeModels();
    yield* dressStages(40,97);
    vehicle.setSpawn(spawnOf(place));
    hud.setStatus(`${place.name} · ${place.fidelity} layout · ${quality.id} quality`);
    showCredit();
    yield [100,'Ready'];
  }
  const useLocation=(id:string)=>{for(const _ of locationStages(id)){/* all at once */}};
  // Scenery models for the location; any that are unavailable leave the simple shapes in place.
  const props=new PropLibrary(scene);
  const placeModels=()=>{
    const root=world.root;
    for(const m of place.models)void props.place(root,m.asset,`model-${m.id}`,m.position.x,m.position.z,m.facingDeg).then(node=>{
      if(node)node.position.y+=groundAt(m.position.x,m.position.z);
      if(node&&m.replacesBlock)scene.getMeshByName(m.replacesBlock)?.setEnabled(false);
    });
  };
  placeModels();
  // Houses, gardens and street furniture (streetscape) and parked cars; collisions match what is drawn.
  let carModels=new Map<CarModelId,CarModel|null>();
  let sceneryStats={houses:0,parkedCars:0,colliders:0};
  let signPlan:SignPlan={panels:[],shelters:[],canopies:[],colliders:[]};
  let signage:BuiltSignage|null=null;
  let crowd:Person[]=[];
  /** Cars parked at the kerb (generated areas): background traffic passes them. */
  let kerbCars:KerbFootprint[]=[];
  let people!:PeopleRenderer;
  let animatedPeople:AnimatedPeople|null=null;
  /** Street furniture models (asset Batch A); null until loaded. */
  let streetModels:StreetModels|null=null;
  /** Dressing the place in stages, reporting percent from `from` to `to`. */
  function* dressStages(from:number,to:number):Generator<[number,string]>{
    const at=(k:number)=>from+(to-from)*k;
    yield [at(0),'Planning houses, shops and parked cars'];
    const layout=layoutStreetscape(place)??layoutTownscape(place);
    yield [at(.25),'Building houses and gardens'];
    kerbCars=kerbFootprints(layout);
    const parked:ParkedCar[]=[
      ...place.blocks.filter(b=>b.vehicleModel&&b.vehicleModel in CAR_MODELS).map(b=>({model:b.vehicleModel as CarModelId,colour:b.colour??'#c9ccd1',x:b.position.x,y:0,z:b.position.z,heading:degToRad(b.headingDeg)})),
      ...(layout?.cars??[]).map(c=>({model:c.model,colour:c.colour,x:c.x,y:c.y,z:c.z,heading:c.heading}))
    ];
    const vans=place.blocks.filter(b=>b.vehicleModel===PANEL_VAN.id).map(b=>({x:b.position.x,y:0,z:b.position.z,heading:degToRad(b.headingDeg),width:b.size.width,length:b.size.depth,height:b.size.height,colour:b.colour??'#e9e9e4'}));
    // Modelled trees replace the drawn ones (positions and trunk colliders unchanged).
    const modelTrees=!!layout&&!!streetModels?.has('tree');
    if(layout||vans.length>0)buildStreetscape(scene,modelTrees?{...layout!,trees:[]}:layout,world.root,parked.map(c=>({...c,width:CAR_MODELS[c.model].width,length:CAR_MODELS[c.model].length})),vans);
    if(modelTrees)streetModels!.placeTrees(world.root,layout!.trees);
    yield [at(.55),'Parking cars'];
    bakeParkedCars(scene,world.root,parked,carModels);
    yield [at(.7),'Signs, bus stops and people'];
    signPlan=layoutSignage(place,layout);
    // Modelled shelters replace the drawn ones (the plan, and so the colliders, are unchanged).
    const modelShelters=!!streetModels?.has('shelter');
    signage=buildSignage(scene,modelShelters?{...signPlan,shelters:[]}:signPlan,world.root);
    if(modelShelters)streetModels!.placeShelters(world.root,signPlan.shelters);
    streetModels?.replaceBeacons(world.root,place);
    // Background people on the pavements (scenery: no colliders, never in the road, never assessed).
    crowd=layoutCrowd(place,layout,signPlan);
    people=new PeopleRenderer(scene,world.root);
    people.animated=animatedPeople;
    for(const p of crowd)people.add({id:p.id,look:p.look,pose:t=>personPose(p,t)});
    const colliders=[...place.blocks,...(layout?.colliders??[]),...signPlan.colliders];
    staticObstacles=new StaticObstacles(colliders);
    sceneryStats={houses:(layout?.houses.length??0)+(layout?.town?.buildings.length??0),parkedCars:parked.length,colliders:colliders.length};
    yield [at(.88),'Laying it on the ground'];
    if(terrain)drape(world.root,terrain);
  }
  const dressLocation=()=>{for(const _ of dressStages(0,100)){/* all at once */}};
  // ODbL requires the OpenStreetMap credit wherever its map data is shown.
  const showCredit=()=>{
    const osm=place.sources.some(source=>source.licence.includes('ODbL'));
    // The test car set's models are CC BY 4.0: their authors are credited while they are on screen.
    const cars=activeVehicleSet()==='new';
    byId('hud-credit').hidden=!osm&&!terrain&&!cars;
    // Terrain data (AWS Terrain Tiles: SRTM, EU-DEM/Copernicus and others) asks for attribution too.
    byId('hud-credit').textContent=[osm?'Map data © OpenStreetMap contributors (ODbL) · area-inspired, not an official test route':'',terrain?'terrain: AWS Terrain Tiles (Mapzen; SRTM, Copernicus)':'',cars?'cars: muha692, Comrade1280, Max (Sketchfab, CC BY 4.0)':''].filter(Boolean).join(' · ');
  };
  const store=await openAttemptStore();
  // Car models (content/assets/register.json): other road users and parked cars; simple shapes for any that cannot load.
  // Animated people load in the background: the light figures are drawn until they are ready.
  void AnimatedPeople.load(scene).then(a=>{animatedPeople=a;if(people)people.animated=a});
  const [loadedParked,roadUserModels,loadedStreet,singleDecker,doubleDecker]=await Promise.all([loadCarModels(scene),Promise.all(roadUserCarModels().map(spec=>CarModel.load(scene,spec))),StreetModels.load(scene),CarModel.load(scene,BUS_MODELS.single),CarModel.load(scene,BUS_MODELS.double)]);
  // Red buses (asset Batch A): each deck falls back to the other, then to the drawn bus.
  const busModels={single:singleDecker??doubleDecker,double:doubleDecker??singleDecker};
  // Other road users' cars alternate between the models that loaded (simple shapes if none did).
  const roadUserCars=roadUserModels.filter((m):m is CarModel=>m!==null);
  const carModel=roadUserCars[0]??null;
  const roadUserModel=(i:number)=>roadUserCars.length?roadUserCars[i%roadUserCars.length]!:null;
  carModels=loadedParked;
  streetModels=loadedStreet;
  dressLocation();

  const clock=new FixedStepClock(SIM_STEP);
  const events=new EventLog(()=>clock.time);
  /** The car's position about once a second during the attempt (the mock test report draws it). */
  const driveTrack:Array<{t:number;x:number;z:number}>=[];
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
    // Assisted steering follows the lane forwards only; reversing is steered by the driver (straight back otherwise).
    if(steeringMode==='assist'&&runtime?.freeAssist&&c.steer===0)runtime.freeAssist.update(vehicle.pose,vehicle.indicators.state);
    // (Reversing in a manoeuvre: the assistance follows its reverse path where it has one.)
    const steer=c.steer!==0?c.steer:steeringMode==='tilt'?tiltSteer:steeringMode==='assist'&&runtime?.assist&&vehicle.state.speed>=0&&!keys.reverse?runtime.assist.steer(vehicle.pose,vehicle.state.speed)
      :steeringMode==='assist'&&runtime?.assist?.canReverse&&keys.reverse?runtime.assist.steerReverse(vehicle.pose,vehicle.state.speed):0;
    // In the phone viewer only the checked physical controller drives the car.
    const viewerDrive=viewerControls(steer);
    // Assisted steering also eases off for a bend too tight for the speed (only what keeps the car on the road: the
    // speed a test expects is slower, and still the learner's to judge).
    const bendBrake=steeringMode==='assist'&&c.steer===0&&runtime?.assist&&vehicle.state.speed>0&&!keys.reverse?runtime.assist.brakeFor(vehicle.pose,vehicle.state.speed):0;
    lastControls=viewerDrive??{throttle:bendBrake>0?0:c.throttle,brake:Math.max(c.brake,bendBrake),steer,reverse:!!keys.reverse,...(bendBrake>0?{driverBrake:c.brake}:{})};
    // The tell me question comes before the drive: the car stays where it is until it is answered.
    if(runtime?.examiner?.phase==='tell-me')lastControls={throttle:0,brake:1,steer:0};
    return lastControls;
  }};
  let lastControls:Controls={throttle:0,brake:0,steer:0};
  // ---- Sound: starts with the first tap or key press (browsers allow audio only after one) ----
  const sound=new Soundscape();
  const examinerVoice=new ExaminerVoice();
  // Sound stays on: resumed after each spoken sentence, when the page comes back, and checked each second.
  examinerVoice.onSpoken=()=>sound.keepAlive();
  // Recorded sentences, played through the car's sound (the device's voice for anything else): the examiner's in
  // Ryan's voice, the instructor's (lessons, practice) in Sonia's.
  examinerVoice.audio=()=>sound.context;
  examinerVoice.onSpeaking=speaking=>sound.duck(speaking);
  void examinerVoice.loadClips(INSTRUCTOR_CLIPS);
  void examinerVoice.loadClips(EXAMINER_CLIPS);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sound.keepAlive()});
  addEventListener('pageshow',()=>sound.keepAlive());
  setInterval(()=>{if(session.state==='running')sound.keepAlive()},1000);
  /** The lesson chosen on the lesson list (a lesson scenario runs it). */
  let chosenLessonId:string|null=null;
  /** How hard: traffic, mock test length, lesson reminders (home screen; remembered on this device). */
  let difficulty:Difficulty=savedDifficulty();
  // Lights, washers and wipers, demisters, horn and window (the Controls panel; the show me questions use them).
  const carControls=new CarControls(events);
  const pressControl=(id:CarControlId)=>{
    if(session.state!=='running')return;
    carControls.press(id);
    if(id==='horn')sound.horn();
  };
  const controlsPanel=new CarControlsPanel(carControls,pressControl);
  let wiperPhase=0;
  // Safari starts audio only from a completed tap (touchend, pointerup, click) or a key, not from pointerdown.
  for(const type of ['pointerdown','pointerup','touchend','click','keydown'])document.addEventListener(type,()=>{void sound.unlock();examinerVoice.unlock()},{capture:true});
  let soundActive=false;
  let edgeTimer=0,edgeWarned=false;
  vehicle=new VehicleController(spawn,controls,{
    surfaceHeightAt:(x,z)=>surfaceAt(place,x,z)?.height??null,
    groundHeight:0,
    surfaceKindAt:(x,z)=>surfaceAt(place,x,z)?.kind??'none'
  },new CompositeCollisions({firstCollision:(pose,w,l)=>staticObstacles.firstCollision(pose,w,l)},dynamicFootprints),events);

  // ---- Cockpit, mirrors, camera ----
  const vehicleNode=new TransformNode('learner-car',scene);
  const head=new DriverHead();
  const cockpit=buildCockpit(scene,vehicleNode,head.seat);
  shadows?.castOnlyUnder(cockpit.root);
  // The original hands and arms are drawn; `?driver=1` tries a people model's arms reaching them instead (experimental).
  let driverBody:DriverBody|null=null;
  // ?routeSeed=N: the same mock test route every time (tests, or to drive a route again); otherwise a new one each test.
  const routeSeed=Number(new URLSearchParams(location.search).get('routeSeed'))||null;
  if(new URLSearchParams(location.search).get('driver')==='1')
    void DriverBody.load(scene,cockpit.root,head.seat.eye,...(new URLSearchParams(location.search).get('driverModel')?[`assets/models/people/${new URLSearchParams(location.search).get('driverModel')}.glb`]:[])).then(d=>{driverBody=d;if(d)cockpit.hideSimpleArms()});
  const seatNode=new TransformNode('driver-seat',scene);
  seatNode.parent=vehicleNode;
  seatNode.position.set(head.seat.eye.x,head.seat.eye.y,head.seat.eye.z);
  const mirrors=ALL_MIRRORS.map(spec=>new Mirror(scene,vehicleNode,cockpit.root,spec,quality,head.seat.eye));
  // The learner's own car as seen from behind (hidden from the driver's seat).
  const learnerBody=carModel?.instantiate(vehicleNode,'learner-car','#c81e1e',4.3)??null;
  // L plates, front and back: this is the learner's car.
  const lPlates=learnerBody?addLPlates(learnerBody):null;
  learnerBody?.setEnabled(false);lPlates?.setEnabled(false);
  const learnerBox=scene.getMeshByName('car-body');
  let learnerTravelled=0;

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
    // Looking ahead needs no label (it would sit over the interior mirror); any other view says what it is.
    label.classList.toggle('forward',view==='forward');
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
    // A view button is a driver's view: back to the driver's seat first.
    if(behind){setBehind(false);if(view==='forward')return}
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
    const follower=followerDef?new FollowingVehicle(followerDef,()=>vehicle.pose,()=>Math.max(0,vehicle.state.speed)):null;
    const learnerFootprint=()=>({pose:vehicle.pose,halfWidth:vehicle.halfWidth,halfLength:vehicle.halfLength});
    const passers=scenario.actors.filter((a):a is PassingVehicleActorDef=>a.kind==='passing-vehicle').map(d=>new PassingVehicle(d,learnerFootprint,events));
    if(pedestrian){
      pedestrian.onward=onwardPath(place,pedestrian.def);
      dynamicFootprints.push({id:pedestrian.id,shape:()=>({kind:'circle',x:pedestrian.position.x,z:pedestrian.position.z,radius:PEDESTRIAN_RADIUS})});
    }
    if(follower){
      dynamicFootprints.push({id:follower.id,shape:()=>({kind:'box',pose:follower.pose,halfWidth:FOLLOWER_HALF_WIDTH,halfLength:FOLLOWER_HALF_LENGTH})});
    }
    for(const p of passers)dynamicFootprints.push({id:p.id,shape:()=>({kind:'box',pose:p.pose,...p.size}),active:()=>p.started});
    // Traffic lights from the map (generated areas): they run, traffic obeys them, a mock test marks the learner.
    // Exercises that set their own signals (scenario `signals`) keep those instead.
    const trafficSignals=place.signals.length>0&&Object.keys(scenario.signals).length===0?new TrafficSignals(place):null;
    const signalLights=trafficSignals?buildSignalLights(scene,trafficSignals.stops):null;
    for(const pole of signalLights?.poles??[])dynamicFootprints.push({id:pole.id,shape:()=>({kind:'circle',x:pole.x,z:pole.z,radius:.1})});
    // Background traffic on generated areas' roads: solid, never assessed.
    const level=DIFFICULTIES[difficulty];
    const traffic=place.streetParking>0?new Traffic(place,{count:level.traffic.cars+level.traffic.buses,buses:level.traffic.buses,busStops:place.furniture.filter(f=>f.kind==='bus-stop').map(f=>f.position),
      parked:kerbCars,learner:()=>({pose:vehicle.pose,speed:vehicle.state.speed}),signals:()=>trafficSignals?.stops??[]}):null;
    for(const c of traffic?.cars??[])dynamicFootprints.push({id:c.id,shape:()=>({kind:'box',pose:c.pose,halfWidth:c.halfWidth,halfLength:c.halfLength}),active:()=>c.visible});
    // Background buses: solid road users that slow for the learner; never assessed.
    const buses=scenario.buses.map(d=>new Bus(d,place,learnerFootprint));
    for(const b of buses)dynamicFootprints.push({id:b.id,shape:()=>({kind:'box',pose:b.pose,halfWidth:BUS_SIZE.halfWidth,halfLength:BUS_SIZE.halfLength}),active:()=>b.visible});
    const figures=pedestrian?[pedestrianFigure(pedestrian,(x,z)=>surfaceAt(place,x,z)?.height??0)]:[];
    for(const f of figures)people.add(f);
    const visuals=[
      ...(traffic?.cars.map((c,i)=>c.kind==='bus'
        ?busVisual(scene,{id:c.id,get pose(){return c.pose},get visible(){return c.visible},indicating:false,def:{colour:c.colour}},BUS_SIZE,()=>clock.time,busModels[i%2?'double':'single'])
        :vehicleVisual(scene,c.id,c.colour,()=>c.pose,'car',()=>c.visible,roadUserModel(i),4.3))??[]),

      ...(follower?[vehicleVisual(scene,follower.id,follower.def.colour,()=>follower.pose,'car',()=>true,carModel,2*FOLLOWER_HALF_LENGTH)]:[]),
      ...passers.map((p,i)=>vehicleVisual(scene,p.id,p.def.colour,()=>p.pose,p.def.body,()=>p.started,roadUserModel(i+1),2*p.size.halfLength)),
      ...buses.map(b=>busVisual(scene,b,BUS_SIZE,()=>clock.time,busModels[b.def.deck]))
    ];
    // Route guidance on the road is optional: off for an independent attempt, on while learning the controls.
    const guided=!!scenario.guide&&showGuide;
    const guide=guided?buildGuide(scene,scenario.guide!.path,scenario.guide!.arrows):null;
    const signals=buildSignalHeads(scene,place,scenario.signals);
    streetModels?.replaceSignalHeads(scenario.signals);
    if(terrain)for(const name of ['signal-heads','exercise-guide']){const n=scene.getTransformNodeByName(name);if(n)drape(n,terrain)}
    // Signal poles are solid, like lamp columns.
    for(const pole of signals.poles)dynamicFootprints.push({id:pole.id,shape:()=>({kind:'circle',x:pole.x,z:pole.z,radius:.1})});

    // Mock test: the examiner's route and directions, and the marking.
    // A lesson runs the same route, directions and marking as a mock test, with an instructor coaching on top.
    const lesson:Lesson|null=scenario.rubricId==='lesson'&&!familiarisation?LESSONS.find(l=>l.id===chosenLessonId)??LESSONS[0]!:null;
    const mock=(scenario.rubricId==='mock-test'||!!lesson)&&!familiarisation;
    // The examiner speaks on a mock test, the instructor in a lesson.
    examinerVoice.use(mock&&!lesson?EXAMINER_CLIPS:INSTRUCTOR_CLIPS);
    const mockAssessor=mock?new MockTestAssessor({location:place,events,now:()=>clock.time,
      learner:()=>({pose:vehicle.pose,speed:vehicle.state.speed,indicator:vehicle.indicators.state,surface:vehicle.surfaceKind}),
      traffic:()=>(traffic?.cars??[]).filter(c=>c.visible).map(c=>({x:c.pose.position.x,z:c.pose.position.z,heading:c.pose.heading,speed:c.speed})),
      parked:kerbCars,signals:()=>trafficSignals?.stops??[]}):null;
    let finishTest:()=>void=()=>{};
    /** A lesson's report: the instructor's notes, and from the marking only what the instructor does not cover
     *  (safety: speed, kerbs, collisions, lights, positioning), with no pass or fail. */
    const COACHED=/^(mirrors-change-direction|signals-|junctions-approach-speed|moving-off-safety|normal-stops|mirrors-change-speed|vehicle-checks)/;
    const lessonResult=(r:AttemptResult):AttemptResult=>{
      if(!lesson||!instructor)return r;
      const findings=r.findings.filter(f=>!COACHED.test(f.ruleId));
      const notes=[...(lessonMissing?[`${INFO}${lessonMissing}`]:[]),...instructor.notes()];
      const c=instructor.counts;
      const {mockTest:_,...rest}=r;
      return {...rest,rubricVersion:'lesson-0.1',findings,notes,lesson:{number:lesson.number,title:lesson.title,junctions:c.manoeuvres,good:c.good,improve:c.improve+findings.length}};
    };
    // Assisted steering follows the examiner's route in the left lane (src/test/routePath.ts), and the new route
    // after a wrong turn.
    let routeAssist:SteeringAssist|null=null;
    // The route and the vehicle safety questions come from one number (?routeSeed= repeats them).
    const testSeed=routeSeed??Math.floor(Math.random()*1e9);
    const net=new RoadNetwork(place);
    const instructor=lesson?new Instructor({location:place,lesson,events,now:()=>clock.time,
      learner:()=>({x:vehicle.state.position.x,z:vehicle.state.position.z,heading:vehicle.state.heading,speed:Math.abs(vehicle.state.speed),indicator:vehicle.indicators.state}),
      traffic:()=>(traffic?.cars??[]).filter(c=>c.visible).map(c=>({x:c.pose.position.x,z:c.pose.position.z,heading:c.pose.heading,speed:c.speed})),
      signals:()=>trafficSignals?.stops??[],parked:kerbCars,
      say:text=>{examinerVoice.say(text,true);hud.setTask(text)},reminders:level.reminders}):null;
    // The examiner tells the marking and the instructor about each direction.
    const listeners:ExaminerListener[]=[mockAssessor,instructor].filter((x):x is NonNullable<typeof x>=>!!x);
    const listener:ExaminerListener={
      direction:step=>{for(const l of listeners)l.direction?.(step)},done:(step,ok)=>{for(const l of listeners)l.done?.(step,ok)},
      pullUp:()=>{for(const l of listeners)l.pullUp?.()},pulledUp:()=>{for(const l of listeners)l.pulledUp?.()},
      tellMe:(q,ok,a)=>{for(const l of listeners)l.tellMe?.(q,ok,a)},showMe:q=>{for(const l of listeners)l.showMe?.(q)},
      manoeuvreStart:k=>{for(const l of listeners)l.manoeuvreStart?.(k)},manoeuvreDone:(k,f,n)=>{for(const l of listeners)l.manoeuvreDone?.(k,f,n)}};
    const lessonScore=(r:import('../test/route').Route)=>lesson?r.steps.reduce((n,st)=>n+lesson.score(st),0)+(lesson.routeScore?.(r,place)??0):0;
    const lessonWords=lesson?{briefing:`${lesson.briefing[0]} When you're ready: mirrors, look over your right shoulder, and move off.`,
      pullUp:'That\'s the end of the lesson route. Pull up on the left at the next safe place, please.',
      end:'Well done. Let\'s go through how it went.'}:null;
    const examiner=mock?new Examiner(net,()=>{
      const {x,z}=vehicle.state.position,h=vehicle.state.heading,fx=Math.sin(h),fz=-Math.cos(h);
      // Traffic stopped just in front: queueing, not pulling up.
      const blocked=(traffic?.cars??[]).some(c=>{const dx=c.pose.position.x-x,dz=c.pose.position.z-z,a=dx*fx+dz*fz;return c.visible&&a>0&&a<12&&Math.abs(dx*fz-dz*fx)<2});
      return {x,z,heading:h,speed:Math.abs(vehicle.state.speed),blocked};
    },{
      target:lesson?.length??level.mockMetres,seed:testSeed,events,listener,
      // A lesson: its own route (the topic's junctions), the instructor's words, no vehicle safety questions.
      ...(lesson?{
        planner:(start,target,seed)=>planLesson(net,lesson,place,start,target,seed),
        words:lessonWords!
      }:{tellMe:pick(TELL_ME,testSeed),showMe:pick(SHOW_ME,Math.floor(testSeed/7))}),
      askTellMe:q=>{hud.setTask(examiner!.lastSaid,false);askTellMe(q,testSeed,text=>examiner!.answerTellMe(text))},
      say:text=>{examinerVoice.say(text);hud.setTask(text)},onComplete:()=>finishTest(),
      onPlan:()=>{const path=routeLanePath(examiner!.legs,kerbCars);if(path.length>1)routeAssist?.setPath(path);routeAssist?.setReversePath(null)},
      // The manoeuvres (DVSA: one of them on every test, the emergency stop on about one in three); a lesson's own.
      manoeuvres:lesson?lesson.manoeuvres??[]:[...(testSeed%3===0?['emergency-stop' as const]:[]),testSeed%2===0?'parallel-park' as const:'pull-up-right' as const],
      manoeuvreInput:{location:place,parked:kerbCars,now:()=>clock.time,
        learner:()=>({x:vehicle.state.position.x,z:vehicle.state.position.z,heading:vehicle.state.heading,speed:vehicle.state.speed,indicator:vehicle.indicators.state}),
        looks:()=>{const out:Array<{time:number;target:string}>=[];for(let i=events.events.length-1;i>=0&&out.length<40;i--){const e=events.events[i]!;if(e.type==='observation.dwell')out.push({time:e.time,target:String(e.payload['target'])})}return out},
        traffic:()=>(traffic?.cars??[]).filter(c=>c.visible).map(c=>({x:c.pose.position.x,z:c.pose.position.z,heading:c.pose.heading,speed:c.speed})),
        flash:text=>hud.flash(text),
        setPath:(forward,reverse)=>{
          if(forward)routeAssist?.setPath(forward);
          else if(!reverse){const path=routeLanePath(examiner!.legs,kerbCars);if(path.length>1)routeAssist?.setPath(path)}
          routeAssist?.setReversePath(reverse);
        }}}):null;
    if(examiner){
      examiner.reset();
      const path=routeLanePath(examiner.legs,kerbCars);
      if(path.length>1)routeAssist=new SteeringAssist(path,vehicle.params);
    }
    // A lesson about something these streets do not have (no mini-roundabout, no lights): said once at the start.
    const lessonMissing=lesson?.needs&&examiner&&lessonScore({steps:examiner.steps,legs:examiner.legs,length:0})===0
      ?`There are no ${lesson.needs} on these streets, so we'll practise the routine on the junctions there are. Try a test centre that has some.`:null;
    if(lessonMissing&&lessonWords)lessonWords.briefing+=` ${lessonMissing}`;
    const zones=new ZoneTracker(place,scenario.zones,()=>({x:vehicle.state.position.x,z:vehicle.state.position.z,speed:vehicle.state.speed}),events);
    const assist=scenario.assistPath?new SteeringAssist(scenario.assistPath,vehicle.params):routeAssist;
    // Free driving (no route): the assistance keeps to the lane, past parked cars, and takes the turning signalled.
    const freeAssist=assist?null:new FreeDriveAssist(net,kerbCars,vehicle.params);
    const road=place.roads[0]!;
    let lastCollision:string|null=null;
    // A mock test lasts as long as the level says (the examiner ends it when the route is done).
    const runner=new ScenarioRunner(scenario.rubricId==='mock-test'?{...scenario,end:{...scenario.end,timeLimitSeconds:level.mockSeconds}}:scenario,zones,new Map(pedestrian?[[pedestrian.id,pedestrian]]:[]),()=>{
      const {x,z}=vehicle.state.position;
      // Wrong way is judged against the exercise route where there is one (junctions join several roads).
      // Free driving on a road network: the nearest road, either way along it unless it is one-way.
      let r=road,s=sampleRoad(road,x,z);
      if(!assist)for(const other of place.roads){if(other===road)continue;const o=sampleRoad(other,x,z);if(o.distance<s.distance){r=other;s=o}}
      let roadHeading=assist?assist.headingAt(x,z):Math.atan2(s.direction.x,-s.direction.z);
      if(!assist&&place.roads.length>1&&!r.oneway&&Math.abs(headingDelta(vehicle.state.heading,roadHeading))>Math.PI/2)roadHeading+=Math.PI;
      return {surface:vehicle.surfaceKind,heading:vehicle.state.heading,roadHeading,collidedWith:lastCollision};
    },events);
    runner.onMessage=text=>hud.setTask(text);
    finishTest=()=>runner.finish('completed');

    const crossing=pedestrian?place.crossings.find(c=>c.id===pedestrian.def.crossingId)??null:null;
    const assessor=scenario.rubricId==='crossing-restricted-view'&&pedestrian&&crossing?new Assessor({
      events:()=>events.events,
      learner:()=>({pose:vehicle.pose,speed:vehicle.state.speed,halfWidth:vehicle.halfWidth,halfLength:vehicle.halfLength}),
      followerGap:()=>follower?follower.gap:null,
      zones,crossing,pedestrian,now:()=>clock.time,restriction:scenario.restrictedViewBy
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

    // The car's controls: off at the start of each attempt (and any question card closed).
    const controlsModule:SimModule={id:'car-controls',fixedUpdate:dt=>carControls.update(dt),
      reset:()=>{carControls.reset();hideQuestion();controlsPanel.open(false)},dispose(){}};
    const modules:SimModule[]=[
      controlsModule,...(trafficSignals?[trafficSignals]:[]),...(instructor?[instructor]:[]),
      ...(pedestrian?[pedestrian]:[]),...(follower?[follower]:[]),...passers,...buses,...(traffic?[traffic]:[]),
      zones,runner,observation,...(examiner?[examiner]:[]),...(mockAssessor?[mockAssessor]:[]),...(assessor?[assessor]:[]),...(practice?[practice]:[]),...(route?[route]:[]),...(movingOff?[movingOff]:[])
    ];
    const names=Object.fromEntries(passers.map(p=>[p.id,p.name]));
    let variant:Scenario['variants'][number]|null=null;
    return {
      scenario,familiarisation,modules,runner,zones,assist:assist??freeAssist?.assist??null,freeAssist,pedestrian,follower,passers,buses,traffic,examiner,trafficSignals,
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
          if(e.type==='vehicle.collision'){if(!e.payload['struck'])lastCollision=String(e.payload['obstacleId']);sound.collision(Number(e.payload['speed'])||0)}
        }
      },
      finish(outcome){
        examinerVoice.stop();
        const base=mockAssessor?lessonResult(mockAssessor.finish(scenario.id,outcome,runner.elapsed)):assessor?assessor.finish(scenario.id,outcome,runner.elapsed)
          :movingOff?movingOff.finish(scenario.id,outcome,runner.elapsed):{
          scenarioId:scenario.id,rubricVersion:'none (practice)',outcome,findings:[],
          notes:route?route.notes():practice!.notes(names),durationSeconds:runner.elapsed,finishedAt:new Date().toISOString()
        };
        if(steeringMode==='assist'&&assist)base.notes.push('Steering assistance was on: it kept the car on the lane path while you controlled speed and observations.');
        if(guided)base.notes.push('Route guidance was shown on the road (the pull-out path).');
        if(steeringMode==='tilt')base.notes.push('You steered by tilting the phone.');
        if(behindSeconds>=1)base.notes.push(`${INFO}You used the behind-the-car view for ${Math.round(behindSeconds)} s. It is not a driver's view: only the mirrors, shoulder checks and forward view count as observations.`);
        if(variant)base.notes.push(`${INFO}Timing this attempt: ${variant.label.toLowerCase()}.`);
        const mode=controlMode();
        if(mode==='phone-viewer-controller'||mode==='webxr')base.notes.push(`${INFO}Observations were recorded from your head direction (motion sensors), not eye tracking.`);
        if(familiarisation)base.notes.push(`${INFO}Parked familiarisation in the phone viewer: not scored and not saved.`);
        base.conditions={controlMode:mode,steering:steeringMode,guidance:guided,headDirectionEvidence:mode==='phone-viewer-controller'||mode==='webxr'||!!viewerMode,
          ...(mode==='phone-viewer-controller'&&checkedDevice?{controller:checkedDevice}:{})};
        return base;
      },
      current:()=>mockAssessor?mockAssessor.current:assessor?assessor.current:movingOff?movingOff.current:[],
      renderVisuals(){for(const v of visuals)v.update();signalLights?.update()},
      dispose(){
        for(const v of visuals)v.dispose();
        signalLights?.dispose();
        for(const f of figures)people.remove(f.id);
        guide?.dispose();
        signals.dispose();
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
    if(behind)setBehind(false);
    behindSeconds=0;
    if(runtime){
      const s=runtime.scenario;
      vehicle.setSpawn(s.start?{position:{x:s.start.position.x,y:0,z:s.start.position.z},heading:degToRad(s.start.headingDeg)}:spawnOf(place));
      runtime.chooseVariant(forcedVariant);
    }
    vehicle.reset();
    setGear(false);
    for(const m of runtime?.modules??[])m.reset();
    head.recentre();
    heldBy=null;
    heldView=null;
    showView('forward');
    camera.fov=HORIZONTAL_FOV;
    clock.reset();
    events.clear();
    driveTrack.length=0;
    stoppedEarlyFor=0;
    if(runtime){
      // The Task button shows the briefing again; nothing reveals where road users are.
      hud.setTask(runtime.scenario.briefing.replace(/\n\n/g,' '),false);
      document.body.classList.toggle('stationary',runtime.scenario.stationary);
    }
    // Calibrated on the exercise screen, or else where the phone is held as the drive begins.
    if(steeringMode==='tilt'&&tilt.receiving&&!tilt.calibrated)tilt.calibrate();
  };
  /** The mock test report's route line and map: the way driven, and the kinds of junction directed through. */
  const sheetExtras=(result:AttemptResult):SheetExtras=>{
    const metres=driveTrack.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-driveTrack[i]!.x,p.z-driveTrack[i]!.z),0);
    const said=events.events.filter(e=>e.type==='examiner.direction').map(e=>String(e.payload['text']??''));
    const kinds=[...new Set(said.map(t=>/traffic lights/i.test(t)?'traffic lights':/roundabout/i.test(t)?'roundabout':/pull up/i.test(t)?null:'junction').filter((k):k is NonNullable<typeof k>=>!!k))];
    return {route:{metres,seconds:result.durationSeconds,kinds},map:{roads:place.roads.map(r=>r.centreline),track:[...driveTrack]}};
  };
  const attachRunner=()=>{
    runtime!.runner.onEnded=async outcome=>{
      input.clear();
      clearHeldButtons();
      head.hold(null);
      clock.pause();
      const result=runtime!.finish(outcome);
      // A lesson driven to its end counts as done (the home screen then offers the next one).
      if(result.lesson&&outcome==='completed'){const l=LESSONS.find(x=>x.number===result.lesson!.number);if(l)markLessonDone(l.id)}
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
      renderResults(result,id=>events.events.find(e=>e.id===id)?.time,saved,store.kind,saveFailed,result.mockTest?sheetExtras(result):null);
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
  /** The device (controller id or 'keyboard') that passed the input check (remembered between visits), or null. */
  let checkedDevice:string|null=loadCheckedDevice(localStore);
  /** The device whose saved controls are in use: a controller's are set up again whenever it is connected. */
  let boundDevice:string|null=null;
  const useSavedControls=(device:string)=>{
    const saved=loadBindings(localStore,device);
    if(saved){controller.bindings={...saved};boundDevice=device}
  };
  if(checkedDevice)useSavedControls(checkedDevice);
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
  // In the browser (not opened from the Home Screen) the address bar takes part of the screen the lenses look at.
  byId('viewer-install').hidden=installed();
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
    // (A keyboard, or a headset remote that acts as one, cannot be seen until a key is pressed: once checked, it is
    // ready; its first key press starts the drive.)
    const ready=!!checkedDevice&&(checkedDevice==='keyboard'||!!controllerState?.connected&&controllerState.device===checkedDevice);
    const text=ready?`Controller checked: ${checkedDevice} (saved on this phone).`
      :checkedDevice?`Checked before: ${checkedDevice}. Connect it (or press one of its controls) to drive, or check another.`
      :'Not available yet: run the controller check first.';
    if(text===driveStatus&&driveButton.disabled===!ready)return;
    driveStatus=text;
    driveButton.disabled=!ready;
    byId('viewer-drive-status').textContent=text;
  };

  /** Picture sharpness in the headset (its own: the screen-mode level is restored on leaving). */
  let viewerSharpness:AdaptiveScale|null=null;
  const leaveViewer=()=>{
    if(!viewer.active)return;
    // Calibration: say what was kept.
    if(viewerMode==='calibration'){
      const s=viewerSettings,p=VIEWER_PROFILES.find(v=>v.id===s.profileId)!;
      viewerStatus.textContent=`Viewer settings saved for ${viewers.active}: ${p.label.split(' (')[0]}, eye spacing ${s.ipdMm} mm, image alignment ${s.lensSeparationMm} mm, field of view ${s.fovDeg}°.`;
    }
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
    viewerSharpness=null;
    setSharpness(sharpness?.level??quality.hardwareScaling);
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
  /** What is saved on this phone, and whether this browser keeps it at all. */
  const showSavedControls=(note='')=>{
    const saved=checkedDevice?loadBindings(localStore,checkedDevice):null;
    byId('controller-saved').textContent=!storageWorks(localStore)
      ?'This browser is not keeping settings (Private Browsing, or website data blocked in Settings › Safari), so controls must be set again on each visit.'
      :saved?`Saved on this phone: ${checkedDevice}, ${Object.keys(saved).length} controls.${note}`
      :`Nothing saved yet on this phone.${note}`;
    byId('controller-saved').classList.toggle('warn',!storageWorks(localStore));
  };
  const openControllerCheck=()=>{
    byId('screen-controller').hidden=false;
    showSavedControls();
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
      // (Saved at once: leaving the check part-way keeps what was set.)
      if(b){
        controller.bindings={...controller.bindings,[capturing]:b};capturing=null;
        if(checkDevice){const ok=saveBindings(localStore,checkDevice,controller.bindings);boundDevice=checkDevice;byId('controller-saved').textContent=ok?`Saved: ${describeBinding(b)} for ${checkDevice}.`:'Could not save: this browser is not keeping settings.'}
      }
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
  byId('controller-standard').addEventListener('click',()=>{
    controller.bindings={...controller.defaultsFor({id:'',connected:true,mapping:'standard',buttons:[],axes:[]})};checkTested.clear();
    if(checkDevice){saveBindings(localStore,checkDevice,controller.bindings);boundDevice=checkDevice}
  });
  byId('controller-cancel').addEventListener('click',()=>{
    capturing=null;controller.cancelCapture();byId('screen-controller').hidden=true;
    if(checkDevice){saveBindings(localStore,checkDevice,controller.bindings);boundDevice=checkDevice}
    refreshDriveButton();
  });
  byId('controller-done').addEventListener('click',()=>{
    const st=controllerState;
    if(!st?.device)return;
    checkedDevice=st.device;
    const kept=saveBindings(localStore,st.device,controller.bindings)&&saveCheckedDevice(localStore,st.device);
    if(!kept)viewerStatus.textContent='Controller checked for this visit only: this browser is not keeping settings (Private Browsing, or website data blocked).';
    boundDevice=st.device;
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
      // In the headset the lenses magnify the screen: as many pixels as the phone has, stepping back only if the
      // frame rate drops (a low frame rate in a headset is worse than a softer picture).
      viewerSharpness=new AdaptiveScale(1,1.25,{slowFps:28});
      setSharpness(viewerSharpness.level);
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
  const MENU_PANEL={x:EYE.x,y:EYE.y+.02,z:EYE.z-MENU.distance,w:MENU.w,h:MENU.h};
  /** World height of the middle of text line i on the menu panel (viewerHud MENU: baselines `step` apart from `first`). */
  const menuLineY=(i:number)=>MENU_PANEL.y+MENU_PANEL.h/2-(MENU.first+i*MENU.step-MENU.linePx*.35)/MENU.texH*MENU_PANEL.h;
  const belowMenu=(ids:Array<[string,string]>,dwell:number):GazeItem[]=>ids.map(([id,label],i)=>({id,label,x:MENU_PANEL.x+(i-(ids.length-1)/2)*.27,y:MENU_PANEL.y-MENU_PANEL.h/2-.07,z:MENU_PANEL.z+.02,w:.24,h:.09,dwell}));
  const FAMILIARISATION_MENU:GazeItem={id:'menu',label:'Menu',x:-.05,y:.82,z:-.66,w:.14,h:.06,dwell:1.5};
  const START_ITEM:GazeItem={id:'start',label:'Start',x:EYE.x,y:EYE.y-.3,z:EYE.z-1.2,w:.24,h:.09,dwell:1.5};
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
      {id:`cal-${i}-minus`,label:'−',x:MENU_PANEL.x+.29,y:menuLineY(i+2),z:MENU_PANEL.z+.02,w:.07,h:.05,dwell:.7},
      {id:`cal-${i}-plus`,label:'+',x:MENU_PANEL.x+.38,y:menuLineY(i+2),z:MENU_PANEL.z+.02,w:.07,h:.05,dwell:.7}
    ]),
    // Done finishes (2 s look); Reset back to the preset needs a deliberate 3 s look, well apart from Done.
    ...belowMenu([['cal-reset','Reset to preset'],['cal-recentre','Recentre'],['cal-done','Done']],1.2).map(item=>
      item.id==='cal-reset'?{...item,x:item.x-.08,dwell:3}:item.id==='cal-done'?{...item,x:item.x+.08,dwell:2}:item)
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
    // A controller with saved controls, connected now (outside the check): its controls are set up again.
    if(byId('screen-controller').hidden&&typeof navigator.getGamepads==='function'){
      const pad=[...navigator.getGamepads()].find(p=>p&&p.connected);
      if(pad&&pad.id!==boundDevice&&loadBindings(localStore,pad.id))useSavedControls(pad.id);
    }
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
      // Any of the checked controller's controls starts (Accelerate counts only once released and pressed again).
      if(viewerMode==='driving'&&c.pressed.length>0&&headTracker.receiving&&performance.now()-viewerEnteredAt>=VIEWER_SETTLE*1000){
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
      menu=[`Adjust the picture: ${viewers.active} (saves as you go)`,
        'Look at − or + to change a setting until the crosses look like one.',
        ...CAL_ROWS.map((r,i)=>`${checkedDevice&&i===calRow?'▶ ':''}${r.label}: ${value(r.key)}`),
        `Head tracking ${headTracker.rate}/s; drift ${drift===null?'measuring (hold still)':`${drift.toFixed(1)}°/min`}`];
      items=calibrationItems();
    }else if(session.state==='paused'){
      if(viewerMode==='driving'){
        const ok=!!(c?.connected&&c.device===checkedDevice);
        menu=[`Paused${viewerPauseReason&&viewerPauseReason!=='Paused'?`: ${viewerPauseReason.toLowerCase()}`:''}`,
          ok?`Resume: press Pause (${describeBinding(controller.bindings.pause)})`:'Reconnect the checked controller to resume',
          `Recentre: press Recentre (${describeBinding(controller.bindings.recentre)})`,`Exit: hold Brake (${describeBinding(controller.bindings.brake)}) for 2 seconds`,
          headTracker.readingAge>TRACKING_STALE_MS?'Head tracking has stopped: it must return before resuming':'',
          'Traffic and timing are frozen while paused.'].filter(Boolean);
      }else{
        menu=['Paused (parked, not scored)','Look at a button below for a moment, or tap the screen to leave.'];
        items=belowMenu([['resume','Resume'],['recentre','Recentre'],['exit','Exit']],1.5);
      }
    }else if(viewerStarting){
      if(!headTracker.receiving)menu=['Waiting for head tracking…','Check that motion access is allowed.'];
      else if(!settled)menu=['Put the phone in the headset…'];
      else if(viewerMode==='driving'){
        // (No gaze buttons while driving with a controller: everything is on the controller.)
        menu=['Look straight ahead','To start: press any button on your controller.',
          `Accelerate (${describeBinding(controller.bindings.accelerate)}): hold to move, release to coast.`,
          `Brake (${describeBinding(controller.bindings.brake)}) acts at once. Up to ${runtime?.scenario.controllerDriving.assistedSpeedMph??15} mph.`];
      }
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
    document.body.classList.toggle('steer-buttons',mode==='buttons'||mode==='tilt');
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
  /** `test`: the mock test at the same place (chosen on the home screen with Mock test / Free drive). */
  const EXERCISES:Record<string,{scenario:string;intro?:string;test?:string;lesson?:string}>={
    brentwood:{scenario:'brentwood-guided-traversal'},
    'kings-road':{scenario:'brentwood-kings-road-zebra'},
    goodmayes:{scenario:'goodmayes-free-drive',test:'goodmayes-mock-test',lesson:'goodmayes-lesson'},
    zebra:{scenario:'crossing-restricted-view'},
    'moving-off':{scenario:'moving-off-safely',intro:'moving-off-intro'}
  };
  let chosen:{scenario:string;intro?:string}|null=null;
  // Home screen: a mock test (directions and marking) or a free drive, for the test centres and places.
  let driveMode:'test'|'free'|'lesson'='test';
  for(const b of document.querySelectorAll<HTMLButtonElement>('[data-drive-mode]'))b.addEventListener('click',()=>{
    driveMode=b.dataset.driveMode as 'test'|'free'|'lesson';
    for(const o of document.querySelectorAll<HTMLButtonElement>('[data-drive-mode]'))o.setAttribute('aria-pressed',String(o===b));
  });
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
  /** A place being built behind the loading screen (Start waits for it). */
  let placeLoading:Promise<void>|null=null;
  const preview=async(scenario:Scenario)=>{
    // A different place: its streets, buildings and traffic are built now (a few seconds).
    // Real streets take seconds: built in stages behind the loading screen. Small practice streets: at once.
    if(scenario.locationId!==place.id&&(locations.get(scenario.locationId)?.streetParking??0)>0){
      placeLoading=withLoading(`Loading ${locations.get(scenario.locationId)?.name??'the streets'}…`,rep=>loadLocation(scenario.locationId,rep));
      try{await placeLoading}finally{placeLoading=null}
    }
    // (Started meanwhile: the drive has placed the car.)
    if(session.state!=='ready')return;
    useLocation(scenario.locationId);
    vehicle.setSpawn(scenario.start?{position:{x:scenario.start.position.x,y:0,z:scenario.start.position.z},heading:degToRad(scenario.start.headingDeg)}:spawnOf(place));
    vehicle.reset();
    head.recentre();
  };
  // Difficulty: three levels on the home screen.
  const showDifficulty=()=>{
    for(const b of document.querySelectorAll<HTMLButtonElement>('[data-difficulty]'))b.setAttribute('aria-pressed',String(b.dataset['difficulty']===difficulty));
    byId('difficulty-summary').textContent=DIFFICULTIES[difficulty].summary;
  };
  for(const b of document.querySelectorAll<HTMLButtonElement>('[data-difficulty]'))b.addEventListener('click',()=>{
    difficulty=b.dataset['difficulty'] as Difficulty;saveDifficulty(difficulty);showDifficulty();
  });
  showDifficulty();
  /** Lessons: the place's lessons are listed first; choosing one shows its briefing, and Start begins it. */
  const lessonList=byId('lesson-list'),lessonBack=byId('lesson-back'),startButton=byId<HTMLButtonElement>('start-practice');
  const showLesson=(lesson:Lesson|null)=>{
    chosenLessonId=lesson?.id??null;
    lessonList.hidden=!!lesson;lessonBack.hidden=!lesson;
    byId('exercise-briefing').hidden=!lesson;
    startButton.disabled=!lesson;
    startButton.textContent=lesson?'Start lesson':'Choose a lesson';
    if(!lesson){byId('exercise-objective').textContent='Choose a lesson. Each one teaches one topic, with an instructor who coaches you as you drive.';return}
    byId('exercise-objective').textContent=lesson.objective;
    renderBriefing(byId('exercise-briefing'),[`Lesson ${lesson.number}: ${lesson.title}`,...lesson.briefing,lesson.rules].join('\n\n'));
  };
  lessonBack.addEventListener('click',()=>showLesson(null));
  lessonList.replaceChildren(...LESSONS.map(l=>{
    const b=document.createElement('button');b.type='button';b.dataset['lesson']=l.id;b.setAttribute('role','listitem');
    const n=document.createElement('span');n.className='n';n.textContent=String(l.number);
    const t=document.createElement('b');t.textContent=l.title;
    const d=document.createElement('small');d.textContent=l.summary;
    b.append(n,t,d);b.addEventListener('click',()=>showLesson(l));
    return b;
  }),...LESSONS_COMING.map(l=>{
    const b=document.createElement('button');b.type='button';b.disabled=true;b.setAttribute('role','listitem');
    const n=document.createElement('span');n.className='n';n.textContent='·';
    const t=document.createElement('b');t.textContent=l.title;
    const d=document.createElement('small');d.textContent=l.summary;
    b.append(n,t,d);
    return b;
  }));
  const showExercise=(key:string|null)=>{
    const entry=key?EXERCISES[key]!:null;
    chosen=entry&&driveMode==='test'&&entry.test?{scenario:entry.test}:entry&&driveMode==='lesson'&&entry.lesson?{scenario:entry.lesson}:entry;
    byId('exercise-list').hidden=!!chosen;
    byId('exercise-detail').hidden=!chosen;
    const lessons=!!chosen&&!!entry?.lesson&&chosen.scenario===entry.lesson;
    lessonList.hidden=!lessons;lessonBack.hidden=true;byId('exercise-briefing').hidden=false;
    startButton.disabled=false;startButton.textContent='Start practice';
    if(!chosen)return;
    const scenario=scenarios.get(chosen.scenario)!;
    byId('exercise-title').textContent=scenario.title;
    byId('exercise-objective').textContent=scenario.learningObjective;
    renderBriefing(byId('exercise-briefing'),scenario.briefing);
    if(lessons)showLesson(null);
    byId('guide-option').hidden=!scenario.guide;
    showGuide=guideToggle.checked=false;
    byId('intro-option').hidden=!chosen.intro;
    void preview(scenario);
  };
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-exercise]'))
    button.addEventListener('click',()=>showExercise(button.dataset.exercise!));

  // ---- First steps: a new learner starts lesson 1; after that, the next lesson not yet finished ----
  const nextLesson=()=>{const done=lessonsDone();return LESSONS.find(l=>!done.includes(l.id))??null};
  const showFirstSteps=()=>{
    const done=lessonsDone(),next=nextLesson();
    byId('first-title').textContent=done.length===0?'New to driving? Start here':next?'Welcome back':'All the lessons done';
    byId('first-body').textContent=done.length===0
      ?'Your first lesson, with an instructor beside you: moving off and stopping, on real streets. The steering is done for you, so you can learn the checks first.'
      :next?`Next: lesson ${next.number}, ${next.title.toLowerCase()}. ${next.summary}`
      :'Well done. Try a mock test: the examiner gives directions and marks you as on the real test.';
    byId('first-start').textContent=done.length===0?'Start lesson 1':next?`Continue: lesson ${next.number}`:'Try a mock test';
  };
  byId('first-start').addEventListener('click',()=>{
    const next=nextLesson();
    if(!next){document.querySelector<HTMLButtonElement>('[data-drive-mode=test]')!.click();showExercise('goodmayes');return}
    // The first lesson: the easiest level and assisted steering (both can be changed on the next screen).
    if(lessonsDone().length===0){difficulty='easy';saveDifficulty(difficulty);showDifficulty();setSteeringMode('assist')}
    document.querySelector<HTMLButtonElement>('[data-drive-mode=lesson]')!.click();
    showExercise('goodmayes');
    showLesson(next);
  });
  showFirstSteps();
  session.onChange(state=>{if(state==='ready')showFirstSteps()});
  // What each mode is, in a line.
  const MODE_SUMMARY={lesson:'Lesson: an instructor teaches one topic at a time and coaches you as you drive.',
    test:'Mock test: practise the real test. An examiner gives directions and marks you as on the DVSA sheet.',
    free:'Free drive: drive anywhere at your own pace. Nothing is marked.'} as const;
  const showMode=()=>{byId('mode-summary').textContent=MODE_SUMMARY[driveMode]};
  for(const b of document.querySelectorAll<HTMLButtonElement>('[data-drive-mode]'))b.addEventListener('click',showMode);
  showMode();
  // Words explained, and text size.
  for(const id of ['words-home','words-briefing','words-results'])byId(id).addEventListener('click',()=>openGlossary());
  let textSize=loadTextSize();
  const showTextSize=()=>{applyTextSize(textSize);byId('text-size').setAttribute('aria-label',`Text size: ${textSize}. Tap to change`)};
  byId('text-size').addEventListener('click',()=>{textSize=textSize==='normal'?'large':textSize==='large'?'larger':'normal';showTextSize()});
  showTextSize();
  byId('exercise-back').addEventListener('click',()=>showExercise(null));

  // ---- Full screen (or, on iPhone, how to add the app to the Home Screen) ----
  let pausedForHowTo=false;
  setUpFullscreen([byId<HTMLButtonElement>('home-fullscreen'),byId<HTMLButtonElement>('hud-fullscreen')],()=>{
    pausedForHowTo=session.state==='running';
    if(pausedForHowTo)pause();
    byId('screen-fullscreen').hidden=false;
  });
  byId('fullscreen-close').addEventListener('click',()=>{byId('screen-fullscreen').hidden=true;if(pausedForHowTo)resume()});

  // ---- Drive anywhere: an area built on the phone round a test centre, postcode or place ----
  const areaStatus=byId('area-status');
  let building=false;
  const openArea=async(request:import('../generator/area').AreaRequest)=>{
    if(building||session.state!=='ready')return;
    building=true;
    try{
      // One loading screen: the map data and the streets (the first half), then the place itself.
      const built=await withLoading(`Building the streets round ${request.label}…`,async rep=>{
        const b=await buildArea(request,(step,percent)=>{areaStatus.textContent=step;void rep(percent*.5,step)});
        const {location:l,scenario:sc,mockTest,lesson:lessonScenario}=b;
        locations.set(l.id,l);
        scenarios.set(sc.id,sc);
        scenarios.set(mockTest.id,mockTest);
        scenarios.set(lessonScenario.id,lessonScenario);
        EXERCISES[l.id]={scenario:sc.id,test:mockTest.id,lesson:lessonScenario.id};
        await loadLocation(l.id,rep,50,100);
        return b;
      });
      const {location:l}=built;
      events.emit('area.built',{locationId:l.id,label:request.label,lat:request.lat,lon:request.lon,summary:built.summary});
      areaStatus.textContent='';
      showExercise(l.id);
    }catch(error){
      areaStatus.textContent=error instanceof Error&&/OpenStreetMap|dense|road/.test(error.message)?error.message:'Could not build this area (no connection, or no roads there). Try again or pick another place.';
      console.warn('[Driving Practice] area not built',error);
    }finally{building=false}
  };
  setUpAreaSearch(byId<HTMLInputElement>('area-query'),byId('area-results'),areaStatus,request=>void openArea(request));
  setUpCentreBrowser(byId('centre-browser'),request=>{byId('area-status').scrollIntoView({block:'nearest'});void openArea(request)});

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
  // Real streets (traffic, people, lights to set up) take a moment: the loading screen first. The small practice
  // streets start at once.
  const startShowing=(id:string)=>{
    const sc=scenarios.get(id);
    if(placeLoading){const waiting=placeLoading;void waiting.then(()=>startShowing(id));return}
    if(sc&&(locations.get(sc.locationId)?.streetParking??0)>0)void withLoading('Starting…',async rep=>{
      await loadLocation(sc.locationId,rep,0,40);
      await rep(45,'Traffic, people, lights and your route');
      start(id);
    });
    else start(id);
  };
  byId('start-practice').addEventListener('click',()=>{if(chosen)startShowing(chosen.scenario)});
  byId('start-intro').addEventListener('click',()=>{if(chosen?.intro)startShowing(chosen.intro)});

  const soundButton=byId<HTMLButtonElement>('hud-sound');
  const showSound=()=>{soundButton.setAttribute('aria-pressed',String(!sound.muted));soundButton.setAttribute('aria-label',sound.muted?'Sound off. Tap to turn on':'Sound on. Tap to mute')};
  // The examiner's voice follows the sound button (directions are still shown on screen).
  const muteVoice=()=>{examinerVoice.muted=sound.muted;if(sound.muted)examinerVoice.stop()};
  muteVoice();
  soundButton.addEventListener('click',()=>{sound.setMuted(!sound.muted);showSound();muteVoice()});
  showSound();
  const pause=()=>{
    if(!session.to('paused'))return;
    examinerVoice.stop();
    controlsPanel.open(false);
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
    else if(action==='gear'){if(!runtime?.scenario.stationary)setGear(!input.reverse)}
    else if(action==='horn')pressControl('horn');
    else if(action==='lights')pressControl('dipped');
    else vehicle.toggleIndicator(action==='indicator-left'?'left':'right',clock.time);
  };
  /** Drive or Reverse: the switch beside the pedals (or X). Go then moves the car that way. */
  const gearButton=byId<HTMLButtonElement>('gear-toggle');
  const setGear=(reverse:boolean)=>{
    input.reverse=reverse;
    gearButton.setAttribute('aria-pressed',String(reverse));
    gearButton.setAttribute('aria-label',reverse?'Gear: reverse. Tap for drive':'Gear: drive. Tap for reverse');
    document.body.classList.toggle('reverse',reverse);
    events.emit('vehicle.gear.changed',{gear:reverse?'reverse':'drive'});
  };
  gearButton.addEventListener('pointerdown',event=>{event.preventDefault();onAction('gear')});
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
  // On a mock test the Task button says the examiner's last direction again (and shows it).
  byId('hud-task-toggle').addEventListener('click',()=>{if(runtime?.examiner?.lastSaid){runtime.examiner.repeat();hud.setTask(runtime.examiner.lastSaid)}else hud.toggleTask()});
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
    byId('about-quality').textContent=`${quality.id} (render scale 1/${engine.getHardwareScalingLevel()}, ${engine.getRenderWidth()}×${engine.getRenderHeight()} px)`;
    const p=perf.stats();
    byId('about-perf').textContent=p.frames?`${p.averageFps.toFixed(0)} fps average, ${p.p95Ms.toFixed(0)} ms at the 95th percentile, over the last ${p.frames} frames`:'start an exercise to measure';
    byId('about-models').textContent=[
      roadUserCars.length?`${roadUserCars.map(m=>m.spec.id).join(' and ')} (asset Batch B) for other cars`:'simple car shapes (model not loaded)',
      busModels.single||busModels.double?`red buses (asset Batch A): ${[singleDecker&&'single-decker',doubleDecker&&'double-decker'].filter(Boolean).join(' and ')}`:'drawn buses (models not loaded)',
      streetModels?.available.length?`street furniture (asset Batch A): ${streetModels.available.join(', ')}`:'drawn street furniture',
      animatedPeople?`animated people (owner's Tripo characters): ${animatedPeople.capacity} copies, used near the car and for exercise pedestrians`:'drawn people (animated models not loaded yet)',
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
  let glance=FORWARD_GLANCE;
  // Behind-the-car view: a camera following the car, for getting a feel for its position on the road. Not a driver's
  // view: the head (and so observations) stays in the driver's seat, and the results say how long it was used.
  let behind=false,behindSeconds=0;
  const behindButton=byId('hud-behind');
  const setBehind=(on:boolean)=>{
    behind=on;
    behindButton.setAttribute('aria-pressed',String(on));
    document.body.classList.toggle('behind',on);
    behindButton.setAttribute('aria-label',on?'Camera: back to the driver\'s seat':'Camera: switch to behind the car');
    const label=byId('hud-view-label');
    if(on){label.textContent='View: Behind the car (not a driver\'s view)';label.classList.add('behind');label.classList.remove('forward')}
    else{label.classList.remove('behind');showView(heldView??'forward')}
  };
  behindButton.addEventListener('click',()=>{if(session.state==='running'&&!viewer.active)setBehind(!behind)});
  /** Diagnostics: a top-down camera (or one looking at `target`) for layout review screenshots. */
  let overhead:{x:number;z:number;height:number;target?:{x:number;y:number;z:number}}|null=null;
  const perf=new PerfProbe();
  const hudPlace=byId('hud-place');
  let placeTimer=0,lastPlace:PlaceLabel|null=null;
  engine.runRenderLoop(()=>{
    const dt=engine.getDeltaTime()/1000;
    pollController();
    if(!byId('exercise-detail').hidden)refreshDriveButton();
    if(session.state==='running'&&runtime){
      perf.record(engine.getDeltaTime());
      head.animate(dt);
      if(behind)behindSeconds+=dt;
      const wantFov=behind||!heldView||heldView.endsWith('shoulder')?HORIZONTAL_FOV:heldView==='interior'?MIRROR_FOCUS_FOV.interior:MIRROR_FOCUS_FOV.door;
      camera.fov+=Math.max(-3*dt,Math.min(3*dt,wantFov-camera.fov));
      observation.source=observationSource();
      clock.advance(dt,step);
      // Stopping unusually early: the pedestrian waits; prompt the learner on.
      const trigger=runtime.zones.stats.get('pedestrian-trigger');
      stoppedEarlyFor=trigger&&!trigger.entered&&vehicle.state.speed<.15?stoppedEarlyFor+dt:0;
      if(stoppedEarlyFor>EARLY_STOP_HINT_SECONDS&&stoppedEarlyFor-dt<=EARLY_STOP_HINT_SECONDS)hud.setTask('Continue along the road towards the crossing.');
    }
    const alpha=session.state==='running'?clock.alpha:1;
    const flat=vehicle.interpolatedPose(alpha);
    applyPose(vehicleNode,flat);
    // The cameras and mirrors go where the car is drawn: on the ground.
    const pose=onGround(flat);
    if(viewer.active)updateViewer(dt,pose);
    const eye=head.eyeWorld(pose),look=head.lookWorld(pose);
    if(viewer.active&&!overhead){/* cameras placed by updateViewer */}
    else if(overhead){
      camera.position.set(overhead.x,overhead.height,overhead.z+.01);
      const t=overhead.target;
      camera.setTarget(t?new Vector3(t.x,t.y,t.z):new Vector3(overhead.x,0,overhead.z));
    }else if(behind){
      const from=localToWorld(pose,{x:0,y:3.2,z:7.5}),to=localToWorld(pose,{x:0,y:0,z:-7});
      camera.position.set(from.x,from.y,from.z);
      camera.setTarget(new Vector3(to.x,to.y,to.z));
    }else{
      glance+=Math.max(-dt*.5,Math.min(dt*.5,(heldView||viewer.active?0:FORWARD_GLANCE)-glance));
      const across=Math.hypot(look.x,look.z);
      camera.position.set(eye.x,eye.y,eye.z);
      camera.setTarget(new Vector3(eye.x+look.x,eye.y+look.y-Math.tan(glance)*across,eye.z+look.z));
    }
    // From behind, the learner's car is drawn with a car model (wheels turning) in place of the plain body box.
    if(learnerBody){
      const show=behind&&!viewer.active;
      if(learnerBody.isEnabled()!==show){learnerBody.setEnabled(show);lPlates?.setEnabled(show);if(learnerBox)learnerBox.isVisible=!show;cockpit.root.setEnabled(!show)}
      if(show&&carModel){learnerTravelled+=vehicle.state.speed*dt;carModel.roll(learnerBody,learnerTravelled)}
    }
    for(const mirror of mirrors){
      mirror.update(pose);
      mirror.setActive(mirrorsOn&&!behind&&(allMirrorsLive||camera.isInFrustum(mirror.glass)));
      // The mirror being looked at updates every frame so approaching traffic stays readable.
      mirror.setRefresh(allMirrorsLive||heldView===mirror.spec.id?1:quality.mirrorUpdateInterval);
    }
    runtime?.renderVisuals();
    people.update(clock.time,vehicle.state.position);
    // Where the car goes, once a second (the report's map).
    if(session.state==='running'&&clock.time-(driveTrack.at(-1)?.t??-9)>=1)driveTrack.push({t:clock.time,x:vehicle.state.position.x,z:vehicle.state.position.z});
    tiltSteer=tilt.read(dt);
    const wheelTurn=`rotate(${Math.round((steeringMode==='tilt'?tiltSteer:vehicle.state.steerAngle/.6)*120)}deg)`;
    hudWheel.style.transform=wheelTurn;
    // Turning right turns the wheel clockwise as the driver sees it.
    cockpit.setWheel(vehicle.state.steerAngle*STEERING_RATIO);
    if(driverBody&&!behind)driverBody.update(cockpit.grips());
    cockpit.setInstruments(Math.round(Math.abs(vehicle.state.speed)*2.237),vehicle.indicators.state,vehicle.indicators.isLit(clock.time));
    // Wipers: a sweep up and back every 1.2 s while wiping, finishing the sweep to park.
    if(carControls.wiping.front||wiperPhase>0){wiperPhase+=dt/1.2;if(!carControls.wiping.front&&wiperPhase%1<dt/1.2)wiperPhase=0}
    cockpit.setWipers(1.75*(.5-.5*Math.cos(2*Math.PI*wiperPhase)));
    controlsPanel.update();
    if(session.state==='ready'){
      wheelPreview.style.transform=wheelTurn;
      if(steeringMode==='tilt')showTiltState();
    }
    if(steeringMode==='tilt'){
      const state=tilt.receiving?'tilt on':'no tilt: use Steer';
      if(hudTiltState.textContent!==state)hudTiltState.textContent=state;
    }
    // Sound plays while driving; paused, menus and results are quiet.
    const driving=session.state==='running'&&!!runtime;
    if(driving!==soundActive){soundActive=driving;if(!driving)sound.hush()}
    if(driving){
      const users:RoadUserSound[]=[];
      const r=runtime!;
      if(r.follower)users.push({id:r.follower.id,kind:'car',x:r.follower.pose.position.x,z:r.follower.pose.position.z,speed:r.follower.speed});
      for(const p of r.passers)if(p.started)users.push({id:p.id,kind:'car',x:p.pose.position.x,z:p.pose.position.z,speed:p.speed});
      for(const b of r.buses)if(b.visible)users.push({id:b.id,kind:'bus',x:b.pose.position.x,z:b.pose.position.z,speed:b.speed});
      for(const c of r.traffic?.cars??[])if(c.visible)users.push({id:c.id,kind:c.kind,x:c.pose.position.x,z:c.pose.position.z,speed:c.speed});
      sound.update({speed:vehicle.state.speed,throttle:lastControls.throttle,brake:lastControls.brake},users,
        {x:pose.position.x,z:pose.position.z,heading:pose.heading},vehicle.indicators.isLit(clock.time));
    }
    hud.update(vehicle.state.speed,input.reverse,vehicle.indicators.state,vehicle.indicators.isLit(clock.time),engine.getFps());
    // Phones: as sharp a picture as the phone can draw at a steady frame rate (renderScale.ts).
    if(sharpness&&session.state==='running'&&!viewer.active){const level=sharpness.update(dt,engine.getFps());if(level!==null)setSharpness(level)}
    if(viewerSharpness&&viewer.active){const level=viewerSharpness.update(dt,engine.getFps());if(level!==null){setSharpness(level);viewer.layout()}}
    // Approaching the edge of a generated area: say so, once per approach.
    if((edgeTimer-=dt)<=0){
      edgeTimer=.5;
      const {x,z}=vehicle.state.position;
      const near=session.state==='running'&&place.blocks.some(b=>b.id.startsWith('edge-barrier')&&!b.id.startsWith('edge-barrier-hedge')&&Math.hypot(b.position.x-x,b.position.z-z)<35);
      if(near&&!edgeWarned)hud.setTask('End of the mapped area ahead: the road is closed at the red barrier. Turn round, or tap R to reverse.');
      edgeWarned=near;
    }
    // Location label: the street the car is on (a few times a second; the DOM only changes with the street).
    if((placeTimer-=dt)<=0){
      placeTimer=.25;
      const label=placeLabel(place,vehicle.state.position.x,vehicle.state.position.z,lastPlace?.road??null);
      if(label.text!==lastPlace?.text){hudPlace.textContent=label.text;hudPlace.title=label.title}
      // The speed limit sign: the mapped limit, or 30 (the usual limit in towns) on a real street with none mapped.
      hud.setLimit(label.speedLimitMph??(label.road?30:null),vehicle.state.speed);
      lastPlace=label;
    }
    shadows?.follow(pose.position.x,pose.position.z,dt);
    scene.render();
  });
  window.addEventListener('resize',()=>{engine.resize();viewer.layout()});
  // Turning the phone, or opening from the Home Screen, can report the new size only after the resize event: the
  // picture is resized whenever the canvas itself changes size, so it is never drawn small and stretched.
  if(typeof ResizeObserver==='function')new ResizeObserver(()=>{engine.resize();viewer.layout()}).observe(canvas);

  let instrumentation:import('@babylonjs/core/Instrumentation/sceneInstrumentation').SceneInstrumentation|null=null;
  // Read-only handle for automated browser tests and manual diagnostics.
  Object.defineProperty(window,'__drivingPractice',{value:Object.freeze({
    session:()=>session.state,
    /** Diagnostics (review screenshots): put the car at a point on the road, stationary. Not a driving feature. */
    placeCar:(x:number,z:number,headingDeg:number)=>{vehicle.setSpawn({position:{x,y:0,z},heading:degToRad(headingDeg)});vehicle.reset()},
    /** Diagnostics: background people (where each is at the current simulated time) and the figures drawn. */
    people:()=>({drawn:people.ids(),animated:[...people.animatedIds],animatedModelsLoaded:!!animatedPeople,modelHeights:animatedPeople?[...animatedPeople.modelHeights]:[],animatedHeights:animatedPeople?.drawnHeights()??[],crowd:crowd.map(p=>({id:p.id,kind:p.kind,...personPose(p,clock.time)}))}),
    /** The location label as shown. */
    place:()=>lastPlace,
    scenario:()=>runtime?.scenario.id??null,
    vehicle:()=>({...vehicle.state,indicator:vehicle.indicators.state,surface:vehicle.surfaceKind}),
    /** The examiner's and instructor's voice: what was said, how (recorded clips or the device's voice). */
    voice:()=>({...examinerVoice.stats,voice:examinerVoice.voiceName,muted:examinerVoice.muted,audio:sound.context?.state??null}),
    head:()=>({yaw:head.yaw,pitch:head.pitch}),
    look:(yaw:number,pitch:number)=>{head.recentre();head.look(yaw,pitch)},
    holdView:(view:ViewTarget|null)=>holdView(view,'touch'),
    /** Diagnostics: stop simulation time while views can still be turned, to compare views at one instant. */
    freezeTime:(frozen:boolean)=>{if(session.state==='running')frozen?clock.pause():clock.resume()},
    camera:()=>({position:camera.position.asArray(),forward:camera.getForwardRay(1).direction.asArray()}),
    events:()=>events.events.map(e=>({...e})),
    simTime:()=>clock.time,
    sound:()=>sound.stats,
    surfaceAt:(x:number,z:number)=>surfaceAt(place,x,z)?.kind??null,
    /** The nearest road to a point: the nearest point on its centreline and its direction there. */
    roadAt:(x:number,z:number)=>{let best:{x:number;z:number;dx:number;dz:number;d:number}|null=null;for(const r of place.roads){const s=sampleRoad(r,x,z);if(!best||s.distance<best.d){const p=pointAtAlong(r,s.along);best={x:p.x,z:p.z,dx:s.direction.x,dz:s.direction.z,d:s.distance}}}return best},
    signs:()=>({panels:signPlan.panels.map(p=>({id:p.id,kind:p.face.kind,text:'text' in p.face?p.face.text:null,x:p.x,y:p.y,z:p.z,normal:p.normal})),canopies:signPlan.canopies.map(c=>({id:c.id,x:c.x,z:c.z,away:c.away,text:c.text}))}),
    /** Junction mouths (give way or STOP lines): a point 12 m back in the lane coming out, facing the line. */
    mouths:()=>junctionMouths(place).map(m=>{const p=mouthPoint(m,12,1.6);return {id:m.id,kind:m.kind,road:m.road.name??m.road.id,x:p.x,z:p.z,headingDeg:Math.atan2(p.dir.x,-p.dir.z)*180/Math.PI}}),
    signals:()=>runtime?.trafficSignals?.stops.map(s=>({id:s.id,road:s.road.name??s.road.id,state:s.state}))??[],
    examiner:()=>runtime?.examiner?{phase:runtime.examiner.phase,index:runtime.examiner.index,manoeuvre:runtime.examiner.manoeuvre?{kind:runtime.examiner.manoeuvre.kind,phase:runtime.examiner.manoeuvre.phase,faults:runtime.examiner.manoeuvre.faults.map(f=>f.rule),notes:[...runtime.examiner.manoeuvre.notes],waiting:runtime.examiner.manoeuvre.waiting}:null,lastSaid:runtime.examiner.lastSaid,steps:runtime.examiner.steps.map(s=>({say:s.say,at:s.at,to:s.to.road.name??s.to.road.id}))}:null,
    meshMaterials:(pattern:string)=>scene.meshes.filter(m=>new RegExp(pattern).test(m.name)).slice(0,60).map(m=>({name:m.name,material:m.material?.name??null,alpha:m.material?.alpha??null,diffuse:(m.material as unknown as {diffuseColor?:{asArray():number[]}}|null)?.diffuseColor?.asArray()??null,enabled:m.isEnabled(),at:m.getAbsolutePosition().asArray().map(v=>Math.round(v*10)/10),visible:m.isVisible})),
    driver:()=>({loaded:!!driverBody,arms:driverBody?.debug()??null,grips:cockpit.grips().map(g=>g.point.asArray()),eye:camera.position.asArray()}),
    gear:()=>input.reverse?'reverse':'drive',
    pedestrian:()=>runtime?.pedestrian?{state:runtime.pedestrian.state,position:{...runtime.pedestrian.position}}:null,
    /** Diagnostics (tests only): show or hide a road user's drawing (its simulation is unaffected), e.g. to measure what it hides. */
    showActor:(id:string,on:boolean)=>{for(const m of scene.getTransformNodeByName(`actor-${id}`)?.getChildMeshes()??[])m.isVisible=on},
    follower:()=>runtime?.follower?{gap:runtime.follower.gap,speed:runtime.follower.speed,pose:runtime.follower.pose}:null,
    passers:()=>runtime?.passers.map(p=>({id:p.id,pose:p.pose}))??[],
    traffic:()=>{const why=new Map((runtime?.traffic?.reasons()??[]).map(r=>[r.id,r]));return runtime?.traffic?.cars.map(c=>({id:c.id,visible:c.visible,speed:c.speed,pose:c.pose,why:why.get(c.id)?.why??'',waited:why.get(c.id)?.waited??0}))??[]},
    findings:()=>(runtime?.current()??[]).map(f=>({...(f as object)})),
    result:()=>lastResult,
    assist:()=>steeringMode==='assist',
    steering:()=>steeringMode,
    location:()=>place.id,
    carModel:()=>carModel?.spec.id??null,
    /** The bus models loaded (red buses, asset Batch A). */
    busModels:()=>[singleDecker,doubleDecker].filter(m=>m).map(m=>m!.spec.id),
    sceneryModels:()=>[...props.available],
    /** Sun shadows: on or off (off with software rendering unless ?shadows=1), map size and casters. */
    shadows:()=>({on:!!shadows,...(shadows?.stats??{})}),
    /** Terrain: the location has real ground heights, and the height under the car. */
    terrain:()=>({on:!!terrain,heightUnderCar:terrain?+terrain.heightAt(vehicle.state.position.x,vehicle.state.position.z).toFixed(2):0}),
    /** Street furniture models in use (asset Batch A). */
    streetModels:()=>streetModels?.available??[],
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
    /** Diagnostics: signs placed in this location (kind, text, position, how placed). */
    signage:()=>({sheet:signage?.sheet??null,shelters:signPlan.shelters.map(s=>({id:s.id,x:s.x,z:s.z})),
      panels:signPlan.panels.map(p=>({id:p.id,kind:p.face.kind,text:'text' in p.face?p.face.text:'name' in p.face?p.face.name:null,x:+p.x.toFixed(2),z:+p.z.toFixed(2),y:+p.y.toFixed(2),normal:p.normal,width:+p.width.toFixed(2),placement:p.placement}))}),
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
    mirrorPixels:async(id:string,colour:'yellow'|'purple'|'red'|'blue')=>{
      const m=mirrors.find(x=>x.spec.id===id);
      const data=await m?.texture.readPixels() as Uint8Array|undefined;
      if(!m||!data)return null;
      const w=m.texture.getSize().width;
      let n=0,sx=0;
      for(let i=0;i<data.length;i+=4){
        const r=data[i]!,g=data[i+1]!,b=data[i+2]!;
        // Red and blue are strict (car paint), so brick, clay roofs and sky do not count.
        const hit=colour==='purple'?r>90&&b>150&&g<90:colour==='red'?r>110&&g<45&&b<45:colour==='blue'?b>110&&r<50&&g<95&&b>g+40:r>140&&g>110&&b<80&&r>=g;
        if(hit){n++;sx+=(i/4)%w}
      }
      // The image is mirrored on the glass (uScale −1), so the glass position is 1 − x.
      return {n,x:n?1-sx/n/w:null};
    },
    /** Diagnostics: the static collider (scenery, parked vehicle) a box at this pose would touch, or null. */
    staticObstacleAt:(x:number,z:number,heading:number,halfWidth:number,halfLength:number)=>staticObstacles.firstCollision({position:{x,y:0,z},heading},halfWidth,halfLength),
    /** Diagnostics: switch mirror rendering off to measure what it costs. */
    mirrorsEnabled:(on:boolean)=>{mirrorsOn=on},
    /** Diagnostics: use this timing variation from the next attempt (null = random). */
    forceVariant:(id:string|null)=>{forcedVariant=id},
    /** Same as tapping a view button (or Forward). */
    selectView:(view:ViewTarget|'forward')=>selectView(view),
    hands:()=>cockpit.handsTurn,
    behind:()=>({on:behind,seconds:behindSeconds,carModel:!!learnerBody?.isEnabled(),lPlates:!!lPlates?.isEnabled()}),
    viewLabel:()=>byId('hud-view-label').textContent,
    buses:()=>runtime?.buses.map(b=>({id:b.id,pose:b.pose,speed:b.speed,state:b.state,visible:b.visible,indicating:b.indicating}))??[],
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
