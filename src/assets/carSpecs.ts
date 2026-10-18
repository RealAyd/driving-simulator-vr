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
  /** Model size in its own units (metres): length, width and height. Parked cars use these as their collision box. */
  length:number;
  width:number;
  height:number;
}

export const CAR_MODELS={
  'quaternius-normal-car-1':{id:'quaternius-normal-car-1',url:'assets/models/vehicles/quaternius-normal-car-1.glb',parkedUrl:'assets/models/vehicles/quaternius-normal-car-1-parked.glb',paintMaterial:'Blue',yawOffset:Math.PI,length:4.22,width:1.81,height:1.18},
  'quaternius-normal-car-2':{id:'quaternius-normal-car-2',parkedUrl:'assets/models/vehicles/quaternius-normal-car-2-parked.glb',paintMaterial:'LightBlue',yawOffset:Math.PI,length:3.31,width:1.64,height:1.15},
  'quaternius-suv':{id:'quaternius-suv',parkedUrl:'assets/models/vehicles/quaternius-suv-parked.glb',paintMaterial:'White',yawOffset:Math.PI,length:4.2,width:2.12,height:1.53}
} as const satisfies Record<string,CarModelSpec>;

export type CarModelId=keyof typeof CAR_MODELS;

/** The model used for other road users' cars. */
export const CAR_MODEL:CarModelSpec=CAR_MODELS['quaternius-normal-car-1'];

/** Paint colours for parked cars: everyday colours, none purple or yellow (those identify the exercise's road users). */
export const PARKED_CAR_COLOURS=['#c9ccd1','#3f444b','#f1f1ee','#1f2f4f','#8e1f1f','#17191c','#2f4a3a','#6d737b'] as const;

/**
 * A plain white panel van drawn from project-owned geometry (src/world/streetscapeMesh.ts):
 * no free model with a clear licence was found. Its body fills exactly its collision box.
 */
export const PANEL_VAN={id:'project-panel-van',length:5.3,width:2.0,height:2.3} as const;
