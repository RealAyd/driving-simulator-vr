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
  /**
   * Optional: where the pedestrian is at the start, walking along the pavement to `waitAt` (for example from a
   * bus that has just set down). A request to cross waits until they reach the kerb.
   */
  walkFrom:point.optional(),
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

/**
 * A background bus along one road: it may wait at its first stop, then drives
 * its lane, stops at each call (front of the bus at the stop's flag) with
 * controlled braking, and at the end either stays or leaves the scene. Never
 * assessed and never an exercise decision; it is a solid road user that slows
 * for the learner's car rather than driving into it.
 */
export const BusRunSchema=z.object({
  id:z.string().regex(/^[a-z0-9-]+$/),
  roadId:z.string(),
  /** Travels along the road's centreline direction ('with', in its left lane) or against it. */
  direction:z.enum(['with','against']),
  /** Distances along the road (centreline metres) where the front of the bus starts and finishes. */
  from:z.number().min(0),
  to:z.number().min(0),
  /** Stops on the way: where the front of the bus halts, and for how long. */
  calls:z.array(z.object({at:z.number().min(0),dwellSeconds:z.number().min(0).max(120)}).strict()).default([]),
  /** Seconds standing at `from` before pulling away. */
  startDwellSeconds:z.number().min(0).max(600).default(0),
  cruiseMph:z.number().min(5).max(40),
  /** At `to`: 'stay' (stands there) or 'leave' (gone from the scene, as if out of sight). */
  end:z.enum(['stay','leave']),
  colour:z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#e9ebee')
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
  /**
   * Traffic signals at the location's signal crossings, as this exercise runs
   * them. Heads are drawn only for crossings listed here, showing this state,
   * so what the learner sees always matches what the exercise does. 'green':
   * no pedestrian phase is simulated, the lights stay at green throughout.
   */
  signals:z.record(z.string(),z.enum(['green'])).default({}),
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
  /** What hides the pavement on the approach, as named in feedback (restricted-view crossing rubric). */
  restrictedViewBy:z.string().default('the parked van'),
  /** Background buses (scenery that moves; never assessed). */
  buses:z.array(BusRunSchema).default([]),
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
export type BusRunDef=z.infer<typeof BusRunSchema>;

export function parseScenario(data:unknown):Scenario{
  const result=ScenarioSchema.safeParse(data);
  if(!result.success){
    throw new Error('Invalid scenario file:\n'+result.error.issues
      .map(i=>`  ${i.path.join('.')||'(root)'}: ${i.message}`).join('\n'));
  }
  return result.data;
}
