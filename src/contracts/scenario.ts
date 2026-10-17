import {z} from 'zod';

/**
 * Scenario definition: what happens in a location. Zones are ranges of
 * distance along a road; triggers fire once per attempt unless re-armable.
 */
const point=z.object({x:z.number(),z:z.number()}).strict();

export const ZoneSchema=z.object({
  id:z.string().regex(/^[a-z0-9-]+$/),
  roadId:z.string(),
  from:z.number(),
  to:z.number(),
  /** Plain-language purpose, shown in feedback evidence. */
  label:z.string()
}).strict().refine(zone=>zone.to>zone.from,{message:'Zone "to" must be greater than "from"'});

export const PedestrianActorSchema=z.object({
  id:z.string().regex(/^[a-z0-9-]+$/),
  kind:z.literal('pedestrian'),
  waitAt:point,
  crossTo:point,
  walkSpeed:z.number().min(.5).max(2.5).default(1.3),
  /** Time spent looking and stepping to the kerb before crossing. */
  prepareSeconds:z.number().min(0).max(5).default(1.5),
  crossingId:z.string()
}).strict();

export const FollowingVehicleActorSchema=z.object({
  id:z.string().regex(/^[a-z0-9-]+$/),
  kind:z.literal('following-vehicle'),
  /** Path distance behind the learner at the start, metres. */
  startBehind:z.number().min(8).max(80).default(35),
  desiredSpeed:z.number().min(2).max(31).default(13.4),
  /** Time headway it tries to keep, seconds. */
  headway:z.number().min(.8).max(3).default(1.5),
  colour:z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#9aa3ad')
}).strict();

/** A vehicle or cyclist driving a fixed lane path at constant speed (overtaking, filtering). */
export const PassingVehicleActorSchema=z.object({
  id:z.string().regex(/^[a-z0-9-]+$/),
  kind:z.literal('passing-vehicle'),
  /** Shape: car or cyclist. */
  body:z.enum(['car','cyclist']).default('car'),
  path:z.array(point).min(2),
  speed:z.number().min(.5).max(31),
  delaySeconds:z.number().min(0).max(120).default(0),
  /** Start again from the beginning after reaching the end. */
  repeat:z.boolean().default(false),
  colour:z.string().regex(/^#[0-9a-fA-F]{6}$/),
  /** Slows or stops for the learner's car when it moves into this road user's path. */
  yieldsToLearner:z.boolean().default(false),
  /** Name used in feedback, e.g. "purple car". */
  name:z.string().optional()
}).strict();

export const ActorSchema=z.discriminatedUnion('kind',[PedestrianActorSchema,FollowingVehicleActorSchema,PassingVehicleActorSchema]);

export const ScenarioSchema=z.object({
  schemaVersion:z.literal(1),
  id:z.string().regex(/^[a-z0-9-]+$/),
  locationId:z.string(),
  title:z.string(),
  learningObjective:z.string(),
  briefing:z.string(),
  /** Rubric used for findings; 'none' for practice modes without scoring. */
  rubricId:z.string(),
  /** Path that optional steering assistance follows (lane-level, scene metres). */
  assistPath:z.array(point).min(2).optional(),
  /** Start position for this exercise instead of the location's default (e.g. a parking place). */
  start:z.object({position:point,headingDeg:z.number()}).strict().optional(),
  /**
   * Painted guide for the intended manoeuvre: chevrons along `path` and
   * arrows showing the traffic direction.
   */
  guide:z.object({path:z.array(point).min(2),arrows:z.array(point).default([])}).strict().optional(),
  /** The learner's car cannot move (introductions and demonstrations). */
  stationary:z.boolean().default(false),
  /**
   * Driving with a physical controller in the phone viewer: Accelerate is
   * held, and assisted speed and acceleration stay within these limits for
   * this exercise (our draft design values, not official figures).
   */
  controllerDriving:z.object({
    assistedSpeedMph:z.number().min(3).max(40),
    accelerationLimit:z.number().min(.3).max(3)
  }).strict().default({assistedSpeedMph:15,accelerationLimit:1.5}),
  /** Exercise offered next on the results screen. */
  next:z.object({scenarioId:z.string(),label:z.string()}).strict().optional(),
  /**
   * Timing variations: one is picked for each attempt, so success does not
   * depend on memorising when road users appear.
   */
  variants:z.array(z.object({
    id:z.string(),
    label:z.string(),
    actors:z.record(z.string(),z.object({delaySeconds:z.number().min(0).max(120),speed:z.number().min(.5).max(31).optional()}).strict())
  }).strict()).default([]),
  zones:z.array(ZoneSchema).default([]),
  actors:z.array(ActorSchema).default([]),
  triggers:z.array(z.object({
    id:z.string(),
    /** A zone being entered, or a time after the start (guided introductions). */
    when:z.union([z.object({zoneEntered:z.string()}).strict(),z.object({atSeconds:z.number().min(0)}).strict()]),
    /** Fires once per attempt unless explicitly re-armable. */
    once:z.boolean().default(true),
    actions:z.array(z.discriminatedUnion('do',[
      z.object({
        do:z.literal('start-crossing'),
        actor:z.string(),
        delaySeconds:z.number().min(0).max(30).default(0)
      }).strict(),
      /** Guidance shown to the learner (guided exercises). */
      z.object({do:z.literal('show-message'),text:z.string().min(1)}).strict()
    ])).min(1)
  }).strict()).default([]),
  end:z.object({
    /** The exercise completes when the learner enters this zone (omit for timed practice). */
    zone:z.string().optional(),
    /** Completes after this long (introductions with nothing to reach). */
    completeAfterSeconds:z.number().min(5).max(600).optional(),
    timeLimitSeconds:z.number().min(30).max(900).default(180)
  }).strict()
}).strict().superRefine((s,ctx)=>{
  const zones=new Set(s.zones.map(z=>z.id));
  const actors=new Set(s.actors.map(a=>a.id));
  if(s.end.zone!==undefined&&!zones.has(s.end.zone))ctx.addIssue({code:'custom',message:`End zone "${s.end.zone}" does not exist`});
  for(const v of s.variants)for(const id of Object.keys(v.actors))
    if(!actors.has(id))ctx.addIssue({code:'custom',message:`Variant "${v.id}" uses missing actor "${id}"`});
  for(const t of s.triggers){
    if('zoneEntered' in t.when&&!zones.has(t.when.zoneEntered))ctx.addIssue({code:'custom',message:`Trigger "${t.id}" uses missing zone "${(t.when as {zoneEntered:string}).zoneEntered}"`});
    for(const a of t.actions)if(a.do==='start-crossing'&&!actors.has(a.actor))ctx.addIssue({code:'custom',message:`Trigger "${t.id}" uses missing actor "${a.actor}"`});
  }
});

export type Scenario=z.infer<typeof ScenarioSchema>;
export type Zone=z.infer<typeof ZoneSchema>;
export type PedestrianActorDef=z.infer<typeof PedestrianActorSchema>;
export type FollowingVehicleActorDef=z.infer<typeof FollowingVehicleActorSchema>;
export type PassingVehicleActorDef=z.infer<typeof PassingVehicleActorSchema>;

export function parseScenario(data:unknown):Scenario{
  const result=ScenarioSchema.safeParse(data);
  if(!result.success){
    throw new Error('Invalid scenario file:\n'+result.error.issues
      .map(i=>`  ${i.path.join('.')||'(root)'}: ${i.message}`).join('\n'));
  }
  return result.data;
}
