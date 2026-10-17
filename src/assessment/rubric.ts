import {mphToMps} from '../contracts';

/**
 * Draft rubric for the restricted-view crossing exercise. These thresholds
 * are training heuristics chosen for this prototype. They are NOT official
 * DVSA criteria and need review by an instructor before being relied on.
 */
export const CROSSING_RUBRIC={
  id:'crossing-restricted-view',
  version:'0.1-draft',
  reviewStatus:'unreviewed',
  approachZone:'restricted-approach',
  /** Above this through the restricted-view approach: minor. */
  approachIdealMax:mphToMps(20),
  /** Above this: serious (unlikely to stop for someone stepping out). */
  approachSeriousOver:mphToMps(25),
  /** A mirror glance this long before braking counts as checking. */
  mirrorLookbackSeconds:5,
  /** A follower within this distance makes a missing mirror check matter more. */
  followerRelevantWithin:40,
  /** Closer than this to a pedestrian while moving is dangerous. */
  pedestrianDangerDistance:1.5
} as const;
