/** Vehicle models shipped in public/assets (see content/assets/register.json). Plain data: no engine imports. */
export interface CarModelSpec{
  id:string;
  /** Full model, relative to the page (moving road users), if shipped. */
  url?:string;
  /** Simplified model for static parked cars (about a quarter of the triangles, no normals: flat normals are rebuilt). */
  parkedUrl:string;
  /** Material that is the body paint, recoloured per car. */
  paintMaterial:string;
  /** Turn needed to face the simulator's forward (-Z); the model faces +Z. */
  yawOffset:number;
  /** Distance (model metres) the car travels in one loop of its wheel animation, if it has one. */
  wheelLoopMetres?:number;
  /**
   * Window openings with no glass (the buses' upper side windows): a dark tinted shell just inside the body is drawn
   * so they read as glass instead of showing the bare inside.
   */
  glassShell?:boolean;
  /** Model size in its own units (metres): length, width (with mirrors) and height. */
  length:number;
  width:number;
  height:number;
  /** Length a parked copy is drawn at (metres), if not the model's own: parked cars are scaled to this. */
  parkedLength?:number;
}

/** A parked copy's size (metres): the model's size scaled to its parked length. Parked cars use it as their collision box. */
export function parkedSize(spec:CarModelSpec):{length:number;width:number;height:number;scale:number}{
  const scale=(spec.parkedLength??spec.length)/spec.length;
  return {length:spec.length*scale,width:spec.width*scale,height:spec.height*scale,scale};
}

export const CAR_MODELS={
  // Asset Batch B (owner's models): WheelSpin_2s turns the 0.32 m wheels four times, 8.04 m of travel. The models are
  // drawn larger than the cars they show; road users are scaled to their collision length, parked copies to parkedLength.
  'batch-b-compact-hatchback':{id:'batch-b-compact-hatchback',url:'assets/models/vehicles/batch-b-compact-hatchback.glb',parkedUrl:'assets/models/vehicles/batch-b-compact-hatchback-parked.glb',paintMaterial:'Body',yawOffset:Math.PI,wheelLoopMetres:8.04,length:4.55,width:2.16,height:1.5,parkedLength:4},
  'batch-b-saloon':{id:'batch-b-saloon',url:'assets/models/vehicles/batch-b-saloon.glb',parkedUrl:'assets/models/vehicles/batch-b-saloon-parked.glb',paintMaterial:'Body',yawOffset:Math.PI,wheelLoopMetres:8.04,length:5.04,width:1.98,height:1.5,parkedLength:4.6},
  // Parked only (2026-10-20): the large saloon (uk_car_01) and the pickup (uk_car_07), for variety on drives.
  'batch-b-large-saloon':{id:'batch-b-large-saloon',parkedUrl:'assets/models/vehicles/batch-b-large-saloon-parked.glb',paintMaterial:'Body',yawOffset:Math.PI,length:5.24,width:1.98,height:1.47,parkedLength:4.9},
  'batch-b-pickup':{id:'batch-b-pickup',parkedUrl:'assets/models/vehicles/batch-b-pickup-parked.glb',paintMaterial:'Body',yawOffset:Math.PI,length:5.69,width:2.26,height:1.87,parkedLength:5.3},
  // The new set (2026-10-23, tried with ?cars=new; tools/assets/build-v2-vehicles.mjs), CC-BY 4.0: Peugeot 208 low
  // poly by muha692, Generic passenger car pack by Comrade1280, Mercedes-Benz Sprinter 2006 by Max (Sketchfab).
  // Real sizes, facing −Z; the pack's wheels turn (one turn per clip). Bodies painted by the app (badges and
  // lettering removed with the paint).
  ...v2('peugeot-208',4.06,1.87,1.6),
  ...v2('compact',3.7,1.82,1.48,1.733),
  ...v2('coupe',4.39,1.96,1.32,1.959),
  ...v2('hatchback',4.1,1.8,1.4,1.953),
  ...v2('minivan',4.79,1.95,1.82,2.081),
  ...v2('offroad',4.5,2.24,1.75,2.567),
  ...v2('pickup',5.28,2.11,1.71,2.416),
  ...v2('sedan',4.7,2.09,1.43,2.062),
  ...v2('suv',4.69,2.11,1.74,2.407),
  ...v2('wagon',4.69,2.09,1.46,2.051),
  // (Parked only: traffic is drawn at one car's length.)
  'v2-sprinter-van':{id:'v2-sprinter-van',parkedUrl:'assets/models/vehicles/v2/v2-sprinter-van-parked.glb',paintMaterial:'(none)',yawOffset:0,length:5.92,width:2.24,height:2.48}
} as const satisfies Record<string,CarModelSpec>;

/** A car of the new set: its traffic and parked models. */
function v2<N extends string>(name:N,length:number,width:number,height:number,wheelLoopMetres?:number):Record<`v2-${N}`,CarModelSpec>{
  const id=`v2-${name}` as const;
  return {[id]:{id,url:`assets/models/vehicles/v2/${id}.glb`,parkedUrl:`assets/models/vehicles/v2/${id}-parked.glb`,paintMaterial:'Body',yawOffset:0,
    ...(wheelLoopMetres?{wheelLoopMetres}:{}),length,width,height}} as Record<`v2-${N}`,CarModelSpec>;
}

export type CarModelId=keyof typeof CAR_MODELS;

/**
 * Red buses (asset Batch A, the owner's): the lightweight single- and double-decker. They face −Z (no turn), are
 * scaled to the bus's collision length, and their wheels-rolling clip (one turn in 2 s, 0.47 m wheels) turns the
 * wheels backwards for forward travel, hence the negative distance per loop. No paint material: they stay red.
 */
export const BUS_MODELS={
  single:{id:'batch-a-bus-single-decker-red',url:'assets/models/vehicles/batch-a-bus-single-decker-red.glb',parkedUrl:'assets/models/vehicles/batch-a-bus-single-decker-red.glb',paintMaterial:'(none)',yawOffset:0,wheelLoopMetres:-2.953,glassShell:true,length:11.26,width:3.12,height:3.2},
  double:{id:'batch-a-bus-double-decker-red',url:'assets/models/vehicles/batch-a-bus-double-decker-red.glb',parkedUrl:'assets/models/vehicles/batch-a-bus-double-decker-red.glb',paintMaterial:'(none)',yawOffset:0,wheelLoopMetres:-2.953,glassShell:true,length:11.26,width:3.12,height:4.21}
} as const satisfies Record<string,CarModelSpec>;

/**
 * Which set of vehicles is drawn: the current one, or the new one being tried (?cars=new). Chosen once at start
 * (main.ts), before any street is laid out.
 */
export type VehicleSet='current'|'new';
let vehicleSet:VehicleSet='current';
export function useVehicleSet(set:VehicleSet):void{vehicleSet=set}
export function activeVehicleSet():VehicleSet{return vehicleSet}

const SETS:Record<VehicleSet,{road:CarModelId[];kerb:CarModelId[]}>={
  current:{road:['batch-b-compact-hatchback','batch-b-saloon'],
    kerb:['batch-b-compact-hatchback','batch-b-compact-hatchback','batch-b-saloon','batch-b-saloon','batch-b-large-saloon']},
  // Everyday cars most, the pickup and the van now and then.
  new:{road:['v2-peugeot-208','v2-hatchback','v2-sedan','v2-compact','v2-wagon','v2-suv','v2-minivan','v2-coupe','v2-offroad','v2-pickup'],
    kerb:['v2-peugeot-208','v2-peugeot-208','v2-hatchback','v2-hatchback','v2-sedan','v2-sedan','v2-compact','v2-wagon','v2-suv','v2-minivan','v2-coupe','v2-offroad','v2-pickup','v2-sprinter-van']}
};

/** The models used for other road users' cars (alternating); the first is also the learner's car seen from behind. */
export function roadUserCarModels():CarModelSpec[]{return SETS[vehicleSet].road.map(id=>CAR_MODELS[id])}
/** Models for cars parked at the kerb (drawn in proportion: some appear more than once). */
export function kerbCarModels():readonly CarModelId[]{return SETS[vehicleSet].kerb}
/** Parked models to load: every one of the current set's (as before; hand-made places use them), and the new set's when in use. */
export function parkedModelIds():CarModelId[]{
  const ids=Object.keys(CAR_MODELS) as CarModelId[];
  return ids.filter(id=>!id.startsWith('v2-')||vehicleSet==='new');
}
/** @deprecated The current set's road-user models (tests); use roadUserCarModels(). */
export const ROAD_USER_CAR_MODELS:readonly CarModelSpec[]=SETS.current.road.map(id=>CAR_MODELS[id]);
export const CAR_MODEL:CarModelSpec=ROAD_USER_CAR_MODELS[0]!;

/** Paint colours for parked cars: everyday colours, none purple or yellow (those identify the exercise's road users). */
export const PARKED_CAR_COLOURS=['#c9ccd1','#3f444b','#f1f1ee','#1f2f4f','#8e1f1f','#17191c','#2f4a3a','#6d737b'] as const;

/**
 * A plain white panel van drawn from project-owned geometry (src/world/streetscapeMesh.ts):
 * no free model with a clear licence was found. Its body fills exactly its collision box.
 */
export const PANEL_VAN={id:'project-panel-van',length:5.3,width:2.0,height:2.3} as const;
