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
  // Kenney Car Kit (CC0, www.kenney.nl), tried with ?cars=kenney (2026-10-26; tools/assets/build-kenney-cars.mjs):
  // stylised, one flat colour per face, stretched to real sizes; one static model for traffic and parked cars.
  ...kenney('saloon',4.5,1.82,1.45),...kenney('hatchback',4.05,1.78,1.42),...kenney('suv',4.55,1.86,1.68),
  ...kenney('estate',4.75,1.85,1.55),...kenney('people-carrier',4.75,1.88,1.75),...kenney('taxi',4.6,1.85,1.6),
  ...kenney('van',5.3,2.0,2.3),
  // Low Poly Car Pack, 20 vehicles (aq3d-models, CGTrader Royalty Free; bought 2026-10-26), tried with ?cars=pack20
  // (tools/assets/export-aq3d-cars.py, build-aq3d-cars.mjs): fictional everyday cars, real sizes, facing -Z; textured
  // for traffic, textures baked into the vertex colours for parked copies; the body painted by the app. Licensed, not
  // redistributable: built locally into public/assets/licensed/aq3d (git-ignored), never committed; a build without
  // them draws plain boxes for parked cars.
  ...aq('hatchback',4.16,2.07,1.38),...aq('hatchback-low',4.15,1.84,1.29),...aq('hatchback-sport',4.18,1.85,1.35),
  ...aq('hatchback-tall',4.18,2.03,1.53),...aq('hatchback-old',3.98,2.06,1.33),...aq('saloon',4.62,2.01,1.35),
  ...aq('saloon-modern',4.56,1.97,1.37),...aq('saloon-classic',5.05,2.27,1.49),...aq('suv',4.45,2.01,1.48),
  ...aq('estate-suv',4.84,2.2,1.65),...aq('crossover',4.64,2.1,1.63),...aq('people-carrier',5.24,2.4,1.89),
  ...aq('van',4.28,1.9,1.65),...aq('box-van',5.56,2.26,2.49),
  // (Parked only: traffic is drawn at one car's length.)
  'v2-sprinter-van':{id:'v2-sprinter-van',parkedUrl:'assets/models/vehicles/v2/v2-sprinter-van-parked.glb',paintMaterial:'(none)',yawOffset:0,length:5.92,width:2.24,height:2.48}
} as const satisfies Record<string,CarModelSpec>;

/** A car of the new set: its traffic and parked models. */
function v2<N extends string>(name:N,length:number,width:number,height:number,wheelLoopMetres?:number):Record<`v2-${N}`,CarModelSpec>{
  const id=`v2-${name}` as const;
  return {[id]:{id,url:`assets/models/vehicles/v2/${id}.glb`,parkedUrl:`assets/models/vehicles/v2/${id}-parked.glb`,paintMaterial:'Body',yawOffset:0,
    ...(wheelLoopMetres?{wheelLoopMetres}:{}),length,width,height}} as Record<`v2-${N}`,CarModelSpec>;
}

/** A Kenney Car Kit car: the same model for traffic and parked copies, in its own colours. */
function kenney<N extends string>(name:N,length:number,width:number,height:number):Record<`kenney-${N}`,CarModelSpec>{
  const id=`kenney-${name}` as const,url=`assets/models/vehicles/kenney/${id}.glb`;
  return {[id]:{id,url,parkedUrl:url,paintMaterial:'(none)',yawOffset:0,length,width,height}} as Record<`kenney-${N}`,CarModelSpec>;
}

/** A car of the 20-vehicle pack: its traffic and parked models. */
function aq<N extends string>(name:N,length:number,width:number,height:number):Record<`aq-${N}`,CarModelSpec>{
  const id=`aq-${name}` as const;
  return {[id]:{id,url:`assets/licensed/aq3d/${id}.glb`,parkedUrl:`assets/licensed/aq3d/${id}-parked.glb`,paintMaterial:'Body',yawOffset:0,length,width,height}} as Record<`aq-${N}`,CarModelSpec>;
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
 * Which set of vehicles is drawn. 'current' (the default, 2026-10-26): the earlier set, the owner's pick of the
 * good-looking cars (hatchback, saloon, large saloon). 'mixed' (?cars=mixed): those with the new pack's Peugeot 208
 * and pickup, which read as one colour all over. 'new' (?cars=new): the whole new pack, kept for checking. Chosen
 * once at start (main.ts), before any street is laid out.
 */
export type VehicleSet='current'|'new'|'mixed'|'kenney'|'pack20';
let vehicleSet:VehicleSet='current';
export function useVehicleSet(set:VehicleSet):void{vehicleSet=set}
export function activeVehicleSet():VehicleSet{return vehicleSet}

const SETS:Record<VehicleSet,{road:CarModelId[];kerb:CarModelId[]}>={
  mixed:{road:['v2-peugeot-208','batch-b-compact-hatchback','batch-b-saloon','v2-pickup'],
    kerb:['v2-peugeot-208','batch-b-compact-hatchback','batch-b-compact-hatchback','batch-b-saloon','batch-b-saloon','batch-b-large-saloon','v2-pickup']},
  current:{road:['batch-b-compact-hatchback','batch-b-saloon'],
    kerb:['batch-b-compact-hatchback','batch-b-compact-hatchback','batch-b-saloon','batch-b-saloon','batch-b-large-saloon']},
  // The Kenney Car Kit (?cars=kenney): the owner's look at a stylised set; the van parked only.
  kenney:{road:['kenney-hatchback','kenney-saloon','kenney-suv','kenney-estate','kenney-people-carrier','kenney-taxi'],
    kerb:['kenney-hatchback','kenney-hatchback','kenney-saloon','kenney-saloon','kenney-suv','kenney-estate','kenney-people-carrier','kenney-van']},
  // The 20-vehicle pack (?cars=pack20): its everyday cars; the older ones, the vans and the box van parked only.
  pack20:{road:['aq-hatchback','aq-saloon','aq-hatchback-low','aq-suv','aq-hatchback-sport','aq-saloon-modern','aq-crossover','aq-hatchback-tall','aq-estate-suv','aq-people-carrier'],
    kerb:['aq-hatchback','aq-hatchback','aq-hatchback-low','aq-hatchback-sport','aq-hatchback-tall','aq-hatchback-old','aq-saloon','aq-saloon','aq-saloon-modern','aq-saloon-classic','aq-suv','aq-estate-suv','aq-crossover','aq-people-carrier','aq-van','aq-box-van']},
  // Everyday cars most, the pickup and the van now and then.
  new:{road:['v2-peugeot-208','v2-hatchback','v2-sedan','v2-compact','v2-wagon','v2-suv','v2-minivan','v2-coupe','v2-offroad','v2-pickup'],
    kerb:['v2-peugeot-208','v2-peugeot-208','v2-hatchback','v2-hatchback','v2-sedan','v2-sedan','v2-compact','v2-wagon','v2-suv','v2-minivan','v2-coupe','v2-offroad','v2-pickup','v2-sprinter-van']}
};

/** The models used for other road users' cars (alternating). */
export function roadUserCarModels():CarModelSpec[]{return SETS[vehicleSet].road.map(id=>CAR_MODELS[id])}
/** The learner's own car (seen from behind the car): the Peugeot 208, the owner's choice, in every set. */
export const LEARNER_CAR:CarModelId='v2-peugeot-208';
export function learnerCarModel():CarModelSpec{return CAR_MODELS[LEARNER_CAR]}
/** Models for cars parked at the kerb (drawn in proportion: some appear more than once). */
export function kerbCarModels():readonly CarModelId[]{return SETS[vehicleSet].kerb}
/** Parked models to load: every one of the earlier set's (hand-made places use them), and the new pack's that the set uses. */
export function parkedModelIds():CarModelId[]{
  const used=new Set<CarModelId>([...SETS[vehicleSet].road,...SETS[vehicleSet].kerb]);
  return (Object.keys(CAR_MODELS) as CarModelId[]).filter(id=>!(id.startsWith('v2-')||id.startsWith('kenney-')||id.startsWith('aq-'))||used.has(id));
}
/**
 * The CC BY 4.0 credit for the new pack's models in use, the learner's car included (shown while they are on screen): the Peugeot 208 by muha692, the passenger car pack by Comrade1280, the Sprinter by Max (Sketchfab).
 */
export function vehicleCredit():string{
  const used=new Set([LEARNER_CAR,...SETS[vehicleSet].road,...SETS[vehicleSet].kerb]);
  const authors=[...new Set([...used].filter(id=>id.startsWith('v2-')).map(id=>id==='v2-peugeot-208'?'muha692':id==='v2-sprinter-van'?'Max':'Comrade1280'))]
    .sort((a,b)=>['muha692','Comrade1280','Max'].indexOf(a)-['muha692','Comrade1280','Max'].indexOf(b));
  return authors.length?`cars: ${authors.join(', ')} (Sketchfab, CC BY 4.0)`:'';
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
