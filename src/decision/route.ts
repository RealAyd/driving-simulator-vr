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
  /** A car (the default), or a person on foot walking the path. */
  kind?:'car'|'pedestrian';
  /** Brakes for the learner's car when it is in the way (a car following it). */
  yields?:boolean;
  /** Stays parked at the end of its path (turned into a car park) rather than turning off out of sight. */
  parks?:boolean;
  /** Seen waiting at the start of its path before it moves (a car waiting to come out of a junction), while the
   * challenge that starts it is in hand. */
  waits?:boolean;
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
  /** Traffic lights the car comes to here, held green for it while the challenge is in hand (the stop line's middle,
   * near enough): the decision is about who is still in the way, not the lights' timing. */
  lights?:Vec2;
  /** Kept to the challenge's own road users while it is in hand: background traffic keeps out of these circles (the
   * junction, and the approaches its road users come along), so the decision is the one depicted. */
  quiet:readonly {x:number;z:number;radius:number}[];
}

export interface StagePlace{
  /** Paused on the move as the car passes a point, or stopped with the car's middle at a point (a give way line). */
  pause:{kind:'moving';at:Vec2}|{kind:'stop';at:Vec2};
  /** The traffic that matters, seen moving first: the pause comes once this road user reaches this point. */
  when?:{actor:string;at:Vec2};
  /** The camera behind the car: turned round it (degrees; negative shows the right) and raised (degrees). */
  frame:{yaw:number;pitch:number;
    /** Looking this far beside the car (metres right; negative: left): the junction's far side clear of the panel. */
    shift?:number};
  /** Where the car is and what is already done (shown with the buttons). */
  state:string;
}
