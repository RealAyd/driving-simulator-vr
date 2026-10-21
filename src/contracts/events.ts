import type {Seconds} from './units';

/**
 * Simulation events are the evidence trail for assessment. Every event has a
 * unique id and a simulation timestamp; assessment findings cite event ids.
 */
export type SimEventType=
  |'session.started'
  |'session.paused'
  |'session.resumed'
  |'session.reset'
  |'session.finished'
  |'vehicle.indicator.changed'
  |'vehicle.braking'
  |'vehicle.gear.changed'
  |'area.built'
  /** Mock test: the examiner gave a direction, or new directions after a different way was taken. */
  |'examiner.direction'
  |'examiner.redirected'
  |'vehicle.surface.changed'
  |'vehicle.stopped'
  |'vehicle.moving'
  |'vehicle.offroad'
  |'vehicle.collision'
  |'zone.entered'
  |'zone.exited'
  |'observation.dwell'
  |'scenario.triggered'
  |'actor.state.changed'
  |'exercise.ended'
  |'assessment.finding'
  |'assist.changed'
  |'view.selected'
  /** A road user braked or stopped because the learner's car was in its path. */
  |'actor.avoiding'
  /** A road user drew level with and passed the learner's car. */
  |'actor.passed';

export interface SimEvent<T extends SimEventType=SimEventType,P=Record<string,unknown>>{
  id:string;
  type:T;
  time:Seconds;
  payload:P;
}

export interface EventSink{
  emit<T extends SimEventType>(type:T,payload?:Record<string,unknown>):SimEvent<T>;
}
