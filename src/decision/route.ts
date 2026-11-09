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
  /** Vehicles parked for the route (a van on the car's side of the road, to be passed): drawn, solid, and passed by
   * the car and by traffic, as the cars parked at the kerb are. */
  parked?:readonly {x:number;z:number;headingDeg:number;kind:'van'|'car';colour?:string}[];
  /** The car's way moved this far to the left of its lane (metres) from one point to the other, easing in and out:
   * pulled in to the kerb to stop. */
  shifts?:readonly {from:Vec2;to:Vec2;left:number}[];
}

export interface RouteActor{
  id:string;name:string;colour:string;speed:number;path:readonly Vec2[];
  /** A car (the default), someone on a bicycle, or a person on foot walking the path. */
  kind?:'car'|'cyclist'|'pedestrian';
  /** Brakes for the learner's car when it is in the way (a car following it). */
  yields?:boolean;
  /** Stays parked at the end of its path (turned into a car park) rather than turning off out of sight. */
  parks?:boolean;
  /** Its indicators where its path's turns alone do not tell (round a roundabout): a side from one point to another. */
  signals?:readonly {from:Vec2;to:Vec2;side:'left'|'right'|'off'}[];
  /** Seen waiting at the start of its path before it moves (a car waiting to come out of a junction), while the
   * challenge that starts it is in hand. */
  waits?:boolean;
}

export interface ChallengeDef extends ChallengeLogic{
  title:string;
  /** The way the car turns or pulls out here (a turn, pulling in, moving off, out round an obstruction): every stage
   * then shows both signals and both door mirrors (withTurnButtons). */
  turn?:'left'|'right';
  /** Where on the route it is, for the results ("Queen's Road roundabout, from Kings Road"). */
  where:string;
  /** What the examiner says, and where (the car passing this point). */
  instruction:string;instructAt:Vec2;
  /** Road users set going when the car passes a point (after `delay` seconds). */
  starts:readonly {actor:string;at:Vec2;delay:number}[];
  /** How each stage is set up in the scene. */
  place:Record<string,StagePlace>;
  /** The challenge is over once the car passes here: the signal cancels itself, as after a turn (not after pulling up:
   * `selfCancel` false, where cancelling it is the learner's to do). */
  endAt:Vec2;
  selfCancel?:false;
  /** Traffic lights the car comes to here, held green for it while the challenge is in hand (the stop line's middle,
   * near enough): the decision is about who is still in the way, not the lights' timing. */
  lights?:Vec2;
  /** The whole set those lights belong to held green (crossings close together, mapped as one set, no one using). */
  lightsAll?:true;
  /** Kept to the challenge's own road users while it is in hand: background traffic keeps out of these circles (the
   * junction, and the approaches its road users come along), so the decision is the one depicted. */
  quiet:readonly {x:number;z:number;radius:number}[];
}

export interface StagePlace{
  /** Paused on the move as the car passes a point, or stopped with the car's middle at a point (a give way line). */
  pause:{kind:'moving';at:Vec2}|{kind:'stop';at:Vec2};
  /** The traffic that matters, seen moving first: the pause comes once this road user reaches this point. */
  when?:{actor:string;at:Vec2};
  /** The buttons on the right of the screen, where what matters is on the left (a footway, a zebra, signals on the near
   * side): the panel would hide it. */
  panel?:'right';
  /** The challenge's lights shown red to the car in this stage (people crossing): held green otherwise. */
  lights?:'red';
  /** The camera behind the car: turned round it (degrees; negative shows the right) and raised (degrees). */
  frame:{yaw:number;pitch:number;
    /** Looking this far beside the car (metres right; negative: left): the junction's far side clear of the panel. */
    shift?:number};
  /** Where the car is and what is already done (shown with the buttons). */
  state:string;
}
