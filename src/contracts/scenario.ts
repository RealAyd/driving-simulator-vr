import {z} from 'zod';

/**
 * Scenario definition (what happens in a location). Draft schema for G2;
 * the foundation validates its shape so content can be authored early.
 */
export const ScenarioSchema=z.object({
  schemaVersion:z.literal(1),
  id:z.string().regex(/^[a-z0-9-]+$/),
  locationId:z.string(),
  title:z.string(),
  learningObjective:z.string(),
  zones:z.array(z.object({
    id:z.string(),
    roadId:z.string(),
    /** Distance range along the road centreline, metres. */
    from:z.number(),
    to:z.number()
  }).strict()).default([]),
  triggers:z.array(z.object({
    id:z.string(),
    when:z.object({zoneEntered:z.string()}).strict(),
    /** Fires once per attempt unless explicitly re-armed. */
    once:z.boolean().default(true),
    actions:z.array(z.object({actor:z.string(),do:z.string()}).strict())
  }).strict()).default([])
}).strict();

export type Scenario=z.infer<typeof ScenarioSchema>;
