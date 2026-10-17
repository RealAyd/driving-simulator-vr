import type {Seconds} from './units';

/**
 * Assessment output. Severities are this simulator's training categories,
 * not official DVSA fault classifications.
 */
export type Severity='advice'|'minor'|'serious'|'dangerous';

export const SEVERITY_ORDER:Record<Severity,number>={advice:0,minor:1,serious:2,dangerous:3};

export interface Finding{
  /** Stable id for this finding within an attempt. */
  id:string;
  ruleId:string;
  /** One real-world incident; several rules can contribute to one incident. */
  incidentId:string;
  severity:Severity;
  /** Ids of the events that support this finding. */
  eventIds:string[];
  explanation:string;
  rubricVersion:string;
  time:Seconds;
  /** Set when a later rule raised the severity of the same incident. */
  upgradedFrom?:Severity;
}

export interface AttemptResult{
  scenarioId:string;
  rubricVersion:string;
  outcome:'completed'|'collision'|'left-route'|'time-limit'|'abandoned';
  findings:Finding[];
  /** Short positive or neutral observations. */
  notes:string[];
  durationSeconds:Seconds;
  finishedAt:string;
  /** How the attempt was driven (recorded with every attempt). */
  conditions?:AttemptConditions;
}

export interface AttemptConditions{
  /** touch: phone screen controls; keyboard: desktop keys; phone-viewer-controller: headset with a checked physical controller; webxr: WebXR headset. */
  controlMode:'touch'|'keyboard'|'phone-viewer-controller'|'phone-viewer-familiarisation'|'webxr';
  steering:'assist'|'tilt'|'buttons';
  /** Route guidance painted on the road. */
  guidance:boolean;
  /** Observation evidence came from head direction (phone viewer or WebXR), not view buttons. Not eye tracking. */
  headDirectionEvidence:boolean;
  /** The controller that passed the input check (phone viewer), if any. */
  controller?:string;
}

/** Prefix for a practice note that describes something to work on (results show it differently). */
export const IMPROVE='To improve: ';
/** Prefix for a neutral explanatory note (neither praise nor something to improve). */
export const INFO='Note: ';
