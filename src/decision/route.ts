import type {Vec2} from '../contracts';
import type {ChallengeLogic} from './assess';

/**
 * A decision mock test route: the scene, where the drive starts, the points it passes (the way is planned through
 * them on the scene's roads, keeping to one-way streets), the road users scripted for it and the challenges on it.
 * Scene metres: x east, z south.
 */
export interface DecisionRoute{
  id:string;
  title:string;
  /** The scene built in advance (tools/scenes/build_scene.mjs) under public/scenes/. */
  scene:string;
  briefing:string;
  start:{x:number;z:number;headingDeg:number};
  through:readonly Vec2[];
  /** Scenario actors (passing vehicles): they wait at the start of their path until a challenge starts them. */
  actors:readonly RouteActor[];
  challenges:readonly ChallengeDef[];
}

export interface RouteActor{
  id:string;name:string;colour:string;speed:number;path:readonly Vec2[];
  /** Brakes for the learner's car when it is in the way (a car following it). */
  yields?:boolean;
}

export interface ChallengeDef extends ChallengeLogic{
  title:string;
  /** Where on the route it is, for the results ("Queen's Road roundabout, from Kings Road"). */
  where:string;
  /** What the examiner says, and where (the car passing this point). */
  instruction:string;instructAt:Vec2;
  /** Road users set going when the car passes a point (after `delay` seconds). */
  starts:readonly {actor:string;at:Vec2;delay:number}[];
  /** How each stage is set up in the scene. */
  place:Record<string,StagePlace>;
  /** The challenge is over (signal cancelled) once the car passes here. */
  endAt:Vec2;
}

export interface StagePlace{
  /** Paused on the move as the car passes a point, or stopped with the car's middle at a point (a give way line). */
  pause:{kind:'moving';at:Vec2}|{kind:'stop';at:Vec2};
  /** The traffic that matters, seen moving first: the pause comes once this road user reaches this point. */
  when?:{actor:string;at:Vec2};
  /** The camera behind the car: turned round it (degrees; negative shows the right) and raised (degrees). */
  frame:{yaw:number;pitch:number};
  /** Where the car is and what is already done (shown with the buttons). */
  state:string;
}
