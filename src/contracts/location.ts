import {z} from 'zod';

/**
 * Location definition (the physical environment). Scenarios and assessment
 * reference ids defined here but never live in this file.
 */
const point=z.object({x:z.number(),z:z.number()}).strict();

export const Fidelity=z.enum(['representative','geographically-inspired','reviewed-location']);

export const RoadSchema=z.object({
  id:z.string().min(1),
  /** Street name shown in feedback; several road pieces may share it. */
  name:z.string().optional(),
  /** One-way roads carry traffic only along the centreline direction. */
  oneway:z.boolean().default(false),
  /** Polyline along the road centre, in local metres. At least two points. */
  centreline:z.array(point).min(2),
  /** Running lanes; UK two-way roads have one each way. */
  lanes:z.object({count:z.number().int().min(1).max(6),width:z.number().min(2.5).max(4.5)}).strict(),
  /** Road surface height in metres. Flat sections only in schema v1. */
  surfaceHeight:z.number().default(0),
  pavementWidth:z.number().min(0).max(6).default(2),
  kerbHeight:z.number().min(0).max(0.25).default(0.12),
  markings:z.object({
    centre:z.enum(['none','dashed','hazard','solid']).default('dashed'),
    edges:z.boolean().default(false)
  }).strict().default({centre:'dashed',edges:false})
}).strict();

export const BlockSchema=z.object({
  id:z.string().min(1),
  kind:z.enum(['building','wall','hedge','parked-vehicle']),
  position:point,
  /** Clockwise from north, degrees. */
  headingDeg:z.number().default(0),
  size:z.object({width:z.number().positive(),depth:z.number().positive(),height:z.number().positive()}).strict(),
  /** Blocks driver sight lines (true) or is decorative only. */
  occludes:z.boolean().default(true),
  /** Optional display colour, #rrggbb. */
  colour:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
}).strict();

export const CrossingSchema=z.object({
  id:z.string().min(1),
  roadId:z.string(),
  /** Signal crossings are drawn with stop lines and studs; their lights are not simulated yet. */
  kind:z.enum(['zebra','signal']),
  /** Distance of the crossing centre along the road centreline, metres. */
  along:z.number(),
  /** Width of the striped area measured along the road. */
  width:z.number().min(2).max(10).default(4),
  /** Distance from the stripes to each give-way line. */
  giveWayOffset:z.number().min(0).max(3).default(1)
}).strict();

/**
 * A junction where road ends meet. Roads stop at `radius` from the centre;
 * the junction surface, painted disc and give-way lines fill the space.
 */
export const JunctionSchema=z.object({
  id:z.string().regex(/^[a-z0-9-]+$/),
  kind:z.enum(['mini-roundabout']),
  position:point,
  /** Clear area around the centre, metres. */
  radius:z.number().min(3).max(20),
  /** Painted central disc that traffic passes around (clockwise in the UK). */
  discDiameter:z.number().min(1).max(5).default(3),
  /** Roads whose centrelines end here and carry traffic into the junction (give-way lines). */
  entries:z.array(z.string()).default([])
}).strict();

/** Building outline extruded as walls only (never seen from above at driver height). */
export const BuildingSchema=z.object({
  id:z.string().min(1),
  footprint:z.array(point).min(3),
  height:z.number().min(2).max(60),
  colour:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
}).strict();

/**
 * A scenery model placed by asset id (src/assets/models.ts). Optional at run
 * time: licensed models may be absent, and then the location looks as before.
 */
export const PlacedModelSchema=z.object({
  id:z.string().min(1),
  asset:z.string().min(1),
  position:point,
  /** Compass direction the model's front faces, degrees. */
  facingDeg:z.number(),
  /** Block whose simple box is hidden when the model is shown (its collision stays). */
  replacesBlock:z.string().optional()
}).strict();

export const LocationSchema=z.object({
  /** v2 adds junctions, one-way roads, building outlines and trees. */
  schemaVersion:z.union([z.literal(1),z.literal(2)]),
  id:z.string().regex(/^[a-z0-9-]+$/),
  name:z.string().min(1),
  fidelity:Fidelity,
  drivingSide:z.enum(['left','right']),
  description:z.string().default(''),
  sources:z.array(z.object({
    title:z.string(),
    licence:z.string(),
    url:z.string().url().optional(),
    notes:z.string().optional()
  }).strict()),
  reviewStatus:z.enum(['unreviewed','in-review','approved']),
  roads:z.array(RoadSchema).min(1),
  blocks:z.array(BlockSchema).default([]),
  crossings:z.array(CrossingSchema).default([]),
  junctions:z.array(JunctionSchema).default([]),
  buildings:z.array(BuildingSchema).default([]),
  trees:z.array(point).default([]),
  models:z.array(PlacedModelSchema).default([]),
  spawn:z.object({position:point,headingDeg:z.number(),roadId:z.string()}).strict()
}).strict().superRefine((location,ctx)=>{
  const roadIds=new Set(location.roads.map(r=>r.id));
  if(roadIds.size!==location.roads.length)ctx.addIssue({code:'custom',message:'Road ids must be unique'});
  if(!roadIds.has(location.spawn.roadId))ctx.addIssue({code:'custom',message:`Spawn road "${location.spawn.roadId}" does not exist`});
  for(const crossing of location.crossings)
    if(!roadIds.has(crossing.roadId))ctx.addIssue({code:'custom',message:`Crossing "${crossing.id}" is on missing road "${crossing.roadId}"`});
  const blockIds=new Set(location.blocks.map(b=>b.id));
  for(const model of location.models)
    if(model.replacesBlock&&!blockIds.has(model.replacesBlock))ctx.addIssue({code:'custom',message:`Model "${model.id}" replaces missing block "${model.replacesBlock}"`});
  for(const junction of location.junctions)for(const entry of junction.entries)
    if(!roadIds.has(entry))ctx.addIssue({code:'custom',message:`Junction "${junction.id}" lists missing road "${entry}"`});
});

export type Location=z.infer<typeof LocationSchema>;
export type Road=z.infer<typeof RoadSchema>;
export type Block=z.infer<typeof BlockSchema>;
export type Crossing=z.infer<typeof CrossingSchema>;
export type Junction=z.infer<typeof JunctionSchema>;
export type Building=z.infer<typeof BuildingSchema>;
export type PlacedModel=z.infer<typeof PlacedModelSchema>;

export function parseLocation(data:unknown):Location{
  const result=LocationSchema.safeParse(data);
  if(!result.success){
    throw new Error('Invalid location file:\n'+result.error.issues
      .map(i=>`  ${i.path.join('.')||'(root)'}: ${i.message}`).join('\n'));
  }
  return result.data;
}
