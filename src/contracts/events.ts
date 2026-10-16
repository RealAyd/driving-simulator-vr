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
  |'vehicle.stopped'
  |'vehicle.moving'
  |'vehicle.offroad'
  |'vehicle.collision'
  |'zone.entered'
  |'zone.exited'
  |'observation.dwell'
  |'scenario.triggered'
  |'actor.state.changed';

export interface SimEvent<T extends SimEventType=SimEventType,P=Record<string,unknown>>{
  id:string;
  type:T;
  time:Seconds;
  payload:P;
}

export interface EventSink{
  emit<T extends SimEventType>(type:T,payload?:Record<string,unknown>):SimEvent<T>;
}
