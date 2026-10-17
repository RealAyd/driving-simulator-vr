import {z} from 'zod';

/**
 * Location definition (the physical environment). Scenarios and assessment
 * reference ids defined here but never live in this file.
 */
const point=z.object({x:z.number(),z:z.number()}).strict();

export const Fidelity=z.enum(['representative','geographically-inspired','reviewed-location']);

export const RoadSchema=z.object({
  id:z.string().min(1),
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
  kind:z.enum(['zebra']),
  /** Distance of the crossing centre along the road centreline, metres. */
  along:z.number(),
  /** Width of the striped area measured along the road. */
  width:z.number().min(2).max(10).default(4),
  /** Distance from the stripes to each give-way line. */
  giveWayOffset:z.number().min(0).max(3).default(1)
}).strict();

export const LocationSchema=z.object({
  schemaVersion:z.literal(1),
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
  spawn:z.object({position:point,headingDeg:z.number(),roadId:z.string()}).strict()
}).strict().superRefine((location,ctx)=>{
  const roadIds=new Set(location.roads.map(r=>r.id));
  if(roadIds.size!==location.roads.length)ctx.addIssue({code:'custom',message:'Road ids must be unique'});
  if(!roadIds.has(location.spawn.roadId))ctx.addIssue({code:'custom',message:`Spawn road "${location.spawn.roadId}" does not exist`});
  for(const crossing of location.crossings)
    if(!roadIds.has(crossing.roadId))ctx.addIssue({code:'custom',message:`Crossing "${crossing.id}" is on missing road "${crossing.roadId}"`});
});

export type Location=z.infer<typeof LocationSchema>;
export type Road=z.infer<typeof RoadSchema>;
export type Block=z.infer<typeof BlockSchema>;
export type Crossing=z.infer<typeof CrossingSchema>;

export function parseLocation(data:unknown):Location{
  const result=LocationSchema.safeParse(data);
  if(!result.success){
    throw new Error('Invalid location file:\n'+result.error.issues
      .map(i=>`  ${i.path.join('.')||'(root)'}: ${i.message}`).join('\n'));
  }
  return result.data;
}
