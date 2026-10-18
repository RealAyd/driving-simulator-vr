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
  /** Speed limit in mph where a reference gives one (shown in the location label; never used for scoring). */
  speedLimitMph:z.number().int().min(5).max(70).optional(),
  /** Where the speed limit comes from (for example an OpenStreetMap way's maxspeed tag). */
  speedLimitSource:z.string().optional(),
  /** One-way roads carry traffic only along the centreline direction. */
  oneway:z.boolean().default(false),
  /** Polyline along the road centre, in local metres. At least two points. */
  centreline:z.array(point).min(2),
  /** Running lanes; UK two-way roads have one each way. */
  lanes:z.object({count:z.number().int().min(1).max(6),width:z.number().min(2.5).max(4.5)}).strict(),
  /** Road surface height in metres. Flat sections only in schema v1. */
  surfaceHeight:z.number().default(0),
  pavementWidth:z.number().min(0).max(6).default(2),
  /**
   * Where the pavement is wider than `pavementWidth` (a town centre's wide
   * pavements up to the shop fronts): widths left and right of the travel
   * direction at stations along the road, interpolated between stations and
   * held beyond the first and last. Derived from map data, not surveyed.
   */
  pavementProfile:z.array(z.object({along:z.number(),left:z.number().min(0).max(16),right:z.number().min(0).max(16)}).strict()).optional(),
  kerbHeight:z.number().min(0).max(0.25).default(0.12),
  markings:z.object({
    centre:z.enum(['none','dashed','hazard','solid']).default('dashed'),
    /** Centre markings start this far along the road (map data says the road before it has no lane markings). */
    centreFrom:z.number().min(0).default(0),
    edges:z.boolean().default(false)
  }).strict().default({centre:'dashed',centreFrom:0,edges:false})
}).strict();

export const BlockSchema=z.object({
  id:z.string().min(1),
  kind:z.enum(['building','wall','hedge','parked-vehicle']),
  /** Parked vehicles: the car model shown (src/assets/models.ts CAR_MODELS); its size must match `size`. */
  vehicleModel:z.string().optional(),
  position:point,
  /** Clockwise from north, degrees. */
  headingDeg:z.number().default(0),
  size:z.object({width:z.number().positive(),depth:z.number().positive(),height:z.number().positive()}).strict(),
  /** Blocks driver sight lines (true) or is decorative only. */
  occludes:z.boolean().default(true),
  /** How it is drawn: a plain box, or a stone obelisk on a plinth (a memorial) filling the same box. */
  shape:z.enum(['box','obelisk']).default('box'),
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

/**
 * Building outline (from map data) drawn with brick or render walls, windows
 * on each storey, a flat roof and, where a business is mapped, shopfronts on
 * the ground floor facing the road (src/world/townscape.ts).
 */
export const BuildingSchema=z.object({
  id:z.string().min(1),
  footprint:z.array(point).min(3),
  height:z.number().min(2).max(60),
  /** Storeys (from map data where given, otherwise estimated: see heightSource). */
  levels:z.number().int().min(1).max(20).optional(),
  /** Where the height comes from: map data (building:levels) or our estimate from the building's use. */
  heightSource:z.enum(['map-levels','reference-estimated','estimated']).default('estimated'),
  /** What the building is used for (map data): shops get shopfronts; car parks open decks; others windows. */
  use:z.enum(['shop','residential','office','civic','church','school','parking','utility','other']).default('other'),
  /** Optional name from map data: drawn as plain lettering on a shop's fascia (signage.ts), and shown in review documents. */
  name:z.string().optional(),
  /**
   * 'map': the outline is from map data (OpenStreetMap). 'reference': from a
   * licensed reference where the map has none (machine-detected outlines,
   * documented with the location). 'approximate': our placeholder where the
   * street is built up but neither has an outline (position, size and use
   * are not from any survey).
   */
  source:z.enum(['map','reference','approximate']).default('map'),
  /** Why an approximate building is there (a mapped business or address point, or a gap in a built-up frontage). */
  evidence:z.string().optional(),
  /** Roof drawn: flat behind a parapet, or pitched (a gable along the longer side; four-sided outlines only). */
  roof:z.enum(['flat','pitched']).default('flat'),
  /** 'low': a background building (far from the modelled roads) drawn with walls and roof only, no windows. */
  detail:z.enum(['full','low']).default('full'),
  colour:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
}).strict();

/**
 * A ground area: grass or a park and a surface car park (map data); a garden
 * around houses and an access route (footway, service road) are drawn from
 * map data and our estimate (see the location's description). A street is
 * the carriageway of a mapped road not driven in the exercise (surface only).
 */
export const AreaSchema=z.object({
  kind:z.enum(['grass','parking','garden','green','access','street']),
  polygon:z.array(point).min(3)
}).strict();

/** Street furniture placed from map data (a bus stop pole where one is mapped). */
export const FurnitureSchema=z.object({
  kind:z.enum(['bus-stop']),
  position:point,
  /** Compass direction the flag faces (towards the road), degrees. */
  facingDeg:z.number().default(0),
  source:z.string().optional(),
  /** Stop name and indicator from the reference (for example "High Street", "Stop C"), drawn on the flag. */
  name:z.string().optional(),
  indicator:z.string().optional(),
  /** A shelter is mapped at this stop. */
  shelter:z.boolean().default(false)
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

export const HouseStyle=z.enum(['terrace','semi','semi-bay','detached']);
export const HousePalette=z.enum(['red-brick','brown-brick','buff-brick','render-cream','render-white']);

/**
 * A row of houses along one side of a road, generated from a few reusable
 * variants (src/world/streetscape.ts). Styles and palettes repeat in the
 * order given, so a street reads as planned rather than random.
 */
export const FrontageSchema=z.object({
  side:z.enum(['left','right']),
  /** Distances along the road centreline, metres. */
  from:z.number(),
  to:z.number(),
  styles:z.array(HouseStyle).min(1),
  palettes:z.array(HousePalette).min(1),
  /** Front garden depth from the back of the pavement to the house front. */
  setback:z.number().min(1.5).max(15).default(6),
  backGarden:z.number().min(4).max(30).default(14)
}).strict();

export const StreetscapeSchema=z.object({
  roadId:z.string(),
  /** Seed for door colours, boundaries, bins and cars on drives. */
  seed:z.number().int().default(1),
  frontages:z.array(FrontageSchema).min(1),
  /** Street lights alternate sides at this spacing (0 = none). */
  lampSpacing:z.number().min(0).default(32),
  /** Road gullies in the gutter on both sides at this spacing (0 = none). */
  drainSpacing:z.number().min(0).default(24),
  /** Share of drives with a car on them. */
  carsOnDrives:z.number().min(0).max(1).default(.45),
  /** Kerbside spots where a car is parked (e.g. the learner's start): no drive or dropped kerb within 4 m. */
  noDrivesAt:z.array(point).default([])
}).strict();

export const LocationSchema=z.object({
  /** v2 adds junctions, one-way roads, building outlines and trees. */
  schemaVersion:z.union([z.literal(1),z.literal(2)]),
  id:z.string().regex(/^[a-z0-9-]+$/),
  name:z.string().min(1),
  /** Town shown in the location label (real places only; omitted for representative streets). */
  placeName:z.string().optional(),
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
  /** Ground between roads and buildings: grass (residential verges) or paving (a town centre). */
  ground:z.enum(['grass','paved']).default('grass'),
  areas:z.array(AreaSchema).default([]),
  furniture:z.array(FurnitureSchema).default([]),
  /** Street lights along every road at this spacing, in town layouts without a streetscape (0 = none). */
  townLampSpacing:z.number().min(0).default(0),
  models:z.array(PlacedModelSchema).default([]),
  streetscape:StreetscapeSchema.optional(),
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
  if(location.streetscape&&!roadIds.has(location.streetscape.roadId))ctx.addIssue({code:'custom',message:`Streetscape road "${location.streetscape.roadId}" does not exist`});
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
export type Streetscape=z.infer<typeof StreetscapeSchema>;
export type Frontage=z.infer<typeof FrontageSchema>;

export function parseLocation(data:unknown):Location{
  const result=LocationSchema.safeParse(data);
  if(!result.success){
    throw new Error('Invalid location file:\n'+result.error.issues
      .map(i=>`  ${i.path.join('.')||'(root)'}: ${i.message}`).join('\n'));
  }
  return result.data;
}
