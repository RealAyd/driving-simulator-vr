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
  'batch-b-pickup':{id:'batch-b-pickup',parkedUrl:'assets/models/vehicles/batch-b-pickup-parked.glb',paintMaterial:'Body',yawOffset:Math.PI,length:5.69,width:2.26,height:1.87,parkedLength:5.3}
} as const satisfies Record<string,CarModelSpec>;

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

/** The models used for other road users' cars (alternating), and the one used when only one is wanted. */
export const ROAD_USER_CAR_MODELS:readonly CarModelSpec[]=[CAR_MODELS['batch-b-compact-hatchback'],CAR_MODELS['batch-b-saloon']];
export const CAR_MODEL:CarModelSpec=ROAD_USER_CAR_MODELS[0]!;

/** Paint colours for parked cars: everyday colours, none purple or yellow (those identify the exercise's road users). */
export const PARKED_CAR_COLOURS=['#c9ccd1','#3f444b','#f1f1ee','#1f2f4f','#8e1f1f','#17191c','#2f4a3a','#6d737b'] as const;

/**
 * A plain white panel van drawn from project-owned geometry (src/world/streetscapeMesh.ts):
 * no free model with a clear licence was found. Its body fills exactly its collision box.
 */
export const PANEL_VAN={id:'project-panel-van',length:5.3,width:2.0,height:2.3} as const;
