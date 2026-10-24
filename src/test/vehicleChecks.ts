import type {CarControlId} from '../vehicle/carControls';

/**
 * The vehicle safety questions of the car driving test, as DVSA publishes them: "Car show me tell me vehicle safety
 * questions", GOV.UK (Driver and Vehicle Standards Agency; Open Government Licence v3.0). Only DVSA's main
 * questions, in DVSA's words; the tell me answers are DVSA's. The examiner asks one tell me question at the start,
 * before driving, and one show me question while driving. Getting one or both wrong is one driving fault; driving
 * dangerously or potentially dangerously while answering the show me question is a fail.
 */

export const DVSA_SOURCE='DVSA, “Car show me tell me vehicle safety questions”, GOV.UK (Open Government Licence v3.0)';

export interface TellMeQuestion{
  id:string;
  question:string;
  /** DVSA's answer, in DVSA's words (shown once a choice is made, and in the report). */
  answer:string;
  /** DVSA's answer shortened to a plain line (at most 90 characters): what the choices show. */
  short:string;
  /** Questions about the same kind of check: their answers are the other choices shown. */
  group:'brakes'|'tyres'|'lights'|'bonnet'|'cab';
}

export interface ShowMeQuestion{
  id:string;
  question:string;
  /** The control that answers it in this simulator. */
  control:CarControlId;
}

export const TELL_ME:readonly TellMeQuestion[]=[
  {id:'brakes',group:'brakes',question:'Tell me how you’d check that the brakes are working before starting a journey.',
    short:'Not spongy or slack; test them as you set off; the car should not pull to one side.',
    answer:'Brakes should not feel spongy or slack. Brakes should be tested as you set off. Vehicle should not pull to one side.'},
  {id:'tyre-pressures',group:'tyres',question:'Tell me where you’d find the information for the recommended tyre pressures for this car and how tyre pressures should be checked.',
    short:'Car handbook; a reliable gauge; check when the tyres are cold; include the spare.',
    answer:'Manufacturer’s guide, use a reliable pressure gauge, check and adjust pressures when tyres are cold, don’t forget spare tyre, remember to refit valve caps.'},
  {id:'head-restraint',group:'cab',question:'Tell me how you make sure your head restraint is correctly adjusted so it provides the best protection in the event of a crash.',
    short:'Rigid part as high as your eyes or top of your ears, close to the back of your head.',
    answer:'The head restraint should be adjusted so the rigid part of the head restraint is at least as high as the eye or top of the ears, and as close to the back of the head as is comfortable. Note: Some restraints might not be adjustable.'},
  {id:'tread',group:'tyres',question:'Tell me how you’d check the tyres to ensure that they have sufficient tread depth and that their general condition is safe to use on the road.',
    short:'No cuts or bulges; at least 1.6 mm of tread across the middle three-quarters, all round.',
    answer:'No cuts and bulges, 1.6mm of tread depth across the central three-quarters of the breadth of the tyre, and around the entire outer circumference of the tyre.'},
  {id:'lights',group:'lights',question:'Tell me how you’d check that the headlights and tail lights are working. You don’t need to exit the vehicle.',
    short:'Switch the lights on (ignition on if needed), then walk round the car to look.',
    answer:'Explain you’d operate the switch (turn on ignition if necessary), then walk round vehicle (as this is a ‘tell me’ question, you don’t need to physically check the lights).'},
  {id:'abs',group:'brakes',question:'Tell me how you’d know if there was a problem with your anti-lock braking system.',
    short:'A warning light comes on if the anti-lock brakes have a fault.',
    answer:'Warning light should illuminate if there is a fault with the anti-lock braking system.'},
  {id:'indicators',group:'lights',question:'Tell me how you’d check the direction indicators are working. You don’t need to exit the vehicle.',
    short:'Operate the indicator switch (ignition on if needed), then walk round the car.',
    answer:'Explain you’d operate the switch (turn on ignition if necessary), and then walk round vehicle (as this is a ‘tell me’ question, you don’t need to physically check the lights).'},
  {id:'brake-lights',group:'lights',question:'Tell me how you’d check the brake lights are working on this car.',
    short:'Press the brake pedal; use reflections in windows or doors, or ask someone to help.',
    answer:'Explain you’d operate the brake pedal, make use of reflections in windows or doors, or ask someone to help.'},
  {id:'steering',group:'brakes',question:'Tell me how you’d check the power-assisted steering is working before starting a journey.',
    short:'Gentle pressure on the wheel as the engine starts: it should move slightly.',
    answer:'If the steering becomes heavy, the system may not be working properly. Before starting a journey, 2 simple checks can be made. Gentle pressure on the steering wheel, maintained while the engine is started, should result in a slight but noticeable movement as the system begins to operate. Alternatively turning the steering wheel just after moving off will give an immediate indication that the power assistance is functioning.'},
  {id:'fog',group:'cab',question:'Tell me how you’d switch on the rear fog light(s) and explain when you’d use it/them. You don’t need to exit the vehicle.',
    short:'Dipped lights on, fog light switch on, check its warning light; explain when to use it.',
    answer:'Operate switch (turn on dipped headlights and ignition if necessary). Check warning light is on. Explain use.'},
  {id:'main-beam',group:'cab',question:'Tell me how you switch your headlight from dipped to main beam and explain how you’d know the main beam is on.',
    short:'Operate the switch (ignition on if needed); check the blue main beam warning light.',
    answer:'Operate switch (with ignition or engine on if necessary), check with main beam warning light.'},
  {id:'oil',group:'bonnet',question:'Open the bonnet and tell me how you’d check that the engine has sufficient oil.',
    short:'Find the dipstick; check the oil level is between the minimum and maximum marks.',
    answer:'Identify dipstick/oil level indicator, describe check of oil level against the minimum and maximum markers.'},
  {id:'coolant',group:'bonnet',question:'Open the bonnet and tell me how you’d check that the engine has sufficient engine coolant.',
    short:'Check the header tank level is between the high and low marks; top up if needed.',
    answer:'Identify high and low level markings on header tank where fitted or radiator filler cap, and describe how to top up to correct level.'},
  {id:'brake-fluid',group:'bonnet',question:'Open the bonnet and tell me how you’d check that you have a safe level of hydraulic brake fluid.',
    short:'Find the brake fluid reservoir; check the level is between the high and low marks.',
    answer:'Identify reservoir, check level against high and low markings.'}
];

export const SHOW_ME:readonly ShowMeQuestion[]=[
  {id:'rear-wash',question:'When it’s safe to do so, can you show me how you wash and clean the rear windscreen?',control:'rear-wash'},
  {id:'front-wash',question:'When it’s safe to do so, can you show me how you wash and clean the front windscreen?',control:'front-wash'},
  {id:'dipped',question:'When it’s safe to do so, can you show me how you’d switch on your dipped headlights?',control:'dipped'},
  {id:'rear-demister',question:'When it’s safe to do so, can you show me how you’d set the rear demister?',control:'rear-demister'},
  {id:'horn',question:'When it’s safe to do so, can you show me how you’d operate the horn?',control:'horn'},
  {id:'front-demist',question:'When it’s safe to do so, can you show me how you’d demist the front windscreen?',control:'front-demist'},
  {id:'window',question:'When it’s safe to do so, can you show me how you’d open and close the side window?',control:'window'}
];

/** Whether a chosen answer is DVSA's answer to the question (its short line, or DVSA's full words). */
export const isTellMeAnswer=(q:TellMeQuestion,answer:string)=>answer===q.short||answer===q.answer;

/** A question picked by a seed (the same seed, the same question). */
export const pick=<T>(list:readonly T[],seed:number)=>list[Math.abs(Math.floor(seed))%list.length]!;

/**
 * The three answers shown for a tell me question: DVSA's answer to it and DVSA's answers to two other tell me
 * questions (the same kind of check where there are enough), each as its short line, in an order set by `seed`.
 */
export function tellMeChoices(q:TellMeQuestion,seed:number):string[]{
  // DVSA's answers for the head and tail lights and for the indicators read almost the same: never both shown.
  const twin:Record<string,string>={lights:'indicators',indicators:'lights'};
  const others=TELL_ME.filter(o=>o!==q&&o.id!==twin[q.id]);
  const near=others.filter(o=>o.group===q.group),far=others.filter(o=>o.group!==q.group);
  const n=Math.abs(Math.floor(seed));
  const pool=[...near.map((_,i)=>near[(i+n)%near.length]!),...far.map((_,i)=>far[(i+n)%far.length]!)];
  const wrong:TellMeQuestion[]=[];
  for(const o of pool)if(wrong.length<2&&!wrong.some(w=>w===o||twin[w.id]===o.id))wrong.push(o);
  const all=[q.short,...wrong.map(w=>w.short)],k=n%3;
  return [...all.slice(k),...all.slice(0,k)];
}
