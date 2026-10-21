import type {CarControlId} from '../vehicle/carControls';

/**
 * The vehicle safety questions of the car driving test: one "tell me" question at the start (before driving) and
 * one "show me" question while driving. The questions are DVSA's, as published on GOV.UK ("Car show me tell me
 * vehicle safety questions"; Open Government Licence v3.0). The answers are this project's short summaries of
 * DVSA's guidance; the wrong options are written for this simulator, to be plausible but wrong.
 * A wrong or missing answer is one driving fault.
 */

export interface TellMeQuestion{
  id:string;
  question:string;
  /** The right answer, then two wrong ones (shown in a shuffled order). */
  answer:string;
  wrong:[string,string];
}

export interface ShowMeQuestion{
  id:string;
  question:string;
  /** The control that answers it. */
  control:CarControlId;
  /** What a correct demonstration is (for the report). */
  answer:string;
  /** Switched on for the question: should be switched off again afterwards. */
  switchOff:boolean;
}

export const TELL_ME:readonly TellMeQuestion[]=[
  {id:'brakes',question:'Tell me how you\'d check that the brakes are working before starting a journey.',
    answer:'Brakes should not feel spongy or slack when pressed. Test them as you set off: the car should not pull to one side.',
    wrong:['Pump the brake pedal several times with the engine off until it goes hard, then drive off.','Pull the parking brake on while moving slowly to check it holds the car.']},
  {id:'tyre-pressures',question:'Tell me where you\'d find the information for the recommended tyre pressures for this car and how tyre pressures should be checked.',
    answer:'In the manufacturer\'s guide (handbook). Use a reliable pressure gauge, check and adjust when the tyres are cold, including the spare, and refit the valve caps.',
    wrong:['On the tyre sidewall: check them straight after a long drive when the tyres are warm.','Look at the tyres: if they don\'t look flat the pressures are fine.']},
  {id:'head-restraint',question:'Tell me how you make sure your head restraint is correctly adjusted so it provides the best protection in the event of a crash.',
    answer:'Adjust it so the rigid part is at least as high as the eye or top of the ears, and as close to the back of the head as is comfortable.',
    wrong:['Set it as low as it goes so it supports the neck.','Tilt it forward until it rests on the back of the head while driving.']},
  {id:'tread',question:'Tell me how you\'d check the tyres to ensure that they have sufficient tread depth and that their general condition is safe to use on the road.',
    answer:'No cuts or bulges, and at least 1.6 mm of tread across the central three-quarters of the breadth of the tyre and around the entire circumference.',
    wrong:['At least 1 mm of tread on the outer edges of the tyre is enough.','Tread depth only matters on the front tyres; check that the rear ones are inflated.']},
  {id:'lights',question:'Tell me how you\'d check that the headlights and tail lights are working. You don\'t need to exit the vehicle.',
    answer:'Switch on the lights (turning on the ignition if needed), then walk round the vehicle to check them.',
    wrong:['Look for the green headlight warning light on the dashboard: if it is on, all the lights work.','Flash the headlights at a wall and listen for the relay clicking.']},
  {id:'abs',question:'Tell me how you\'d know if there was a problem with your anti-lock braking system.',
    answer:'A warning light on the instrument panel should come on if there is a fault with the anti-lock braking system.',
    wrong:['The brake pedal vibrates every time you brake gently.','The car pulls to the left whenever you brake.']},
  {id:'indicators',question:'Tell me how you\'d check the direction indicators are working. You don\'t need to exit the vehicle.',
    answer:'Use the indicator switch or the hazard warning lights (ignition on if needed), then walk round the vehicle to check them.',
    wrong:['Listen for the ticking sound: if it ticks, both indicators work.','Ask the examiner to look at them while you drive along.']},
  {id:'brake-lights',question:'Tell me how you\'d check the brake lights are working on this car.',
    answer:'Press the brake pedal and look for reflections in windows or garage doors, or ask someone to help.',
    wrong:['There is a brake light warning on the dashboard that lights up each time you brake.','Brake hard while driving and see if the car behind slows down.']},
  {id:'steering',question:'Tell me how you\'d check the power-assisted steering is working before starting a journey.',
    answer:'If the steering becomes heavy, the system may not be working. Keeping gentle pressure on the wheel while the engine starts should give a slight movement as the system starts; turning the wheel just after moving off shows it is working.',
    wrong:['Turn the steering wheel lock to lock with the engine off: it should feel light.','Check the power steering fluid by tasting a drop from the reservoir.']},
  {id:'fog',question:'Tell me how you\'d switch on the rear fog light(s) and explain when you\'d use it/them. You don\'t need to exit the vehicle.',
    answer:'Operate the switch (dipped headlights on first if needed) and check the warning light comes on. Use them when visibility is seriously reduced, generally to 100 metres or less.',
    wrong:['Switch them on whenever it is raining, so drivers behind can see you.','Use them at night on unlit roads instead of main beam.']},
  {id:'main-beam',question:'Tell me how you switch your headlight from dipped to main beam and explain how you\'d know the main beam is on.',
    answer:'Operate the switch (ignition or engine on if needed) and check that the blue main beam warning light comes on.',
    wrong:['Turn the light switch to the next position; the green warning light gets brighter.','Main beam comes on by itself on unlit roads; you will see the road light up further ahead.']},
  {id:'oil',question:'Open the bonnet and tell me how you\'d check that the engine has sufficient oil.',
    answer:'Identify the dipstick or oil level indicator and describe checking the level against the minimum and maximum marks.',
    wrong:['Unscrew the oil filler cap and look inside: if you can see oil, the level is fine.','Check the oil warning light: if it is off while driving, the level is correct.']},
  {id:'coolant',question:'Open the bonnet and tell me how you\'d check that the engine has sufficient engine coolant.',
    answer:'Identify the high and low level marks on the header tank (or the radiator filler cap) and describe how to top up to the right level.',
    wrong:['Open the radiator cap while the engine is hot and look for steam.','Look under the car for a puddle; if there is none, there is enough coolant.']},
  {id:'brake-fluid',question:'Open the bonnet and tell me how you\'d check that you have a safe level of hydraulic brake fluid.',
    answer:'Identify the brake fluid reservoir, check the level against the high and low marks, and describe how to top up to the right level.',
    wrong:['Press the brake pedal: if it goes to the floor, top up with engine oil.','Check the windscreen washer bottle, which shares its fluid with the brakes.']}
];

export const SHOW_ME:readonly ShowMeQuestion[]=[
  {id:'rear-wash',question:'When it\'s safe to do so, can you show me how you wash and clean the rear windscreen?',control:'rear-wash',
    answer:'Operate the rear washer and wiper (and switch the wiper off when it is no longer needed).',switchOff:false},
  {id:'front-wash',question:'When it\'s safe to do so, can you show me how you wash and clean the front windscreen?',control:'front-wash',
    answer:'Operate the front washer and wipers (and switch the wipers off when no longer needed).',switchOff:false},
  {id:'dipped',question:'When it\'s safe to do so, can you show me how you\'d switch on your dipped headlights?',control:'dipped',
    answer:'Operate the switch and check the warning light; switch them off when no longer needed.',switchOff:true},
  {id:'rear-demister',question:'When it\'s safe to do so, can you show me how you\'d set the rear demister?',control:'rear-demister',
    answer:'Operate the switch and check the warning light; switch it off when no longer needed.',switchOff:true},
  {id:'horn',question:'When it\'s safe to do so, can you show me how you\'d operate the horn?',control:'horn',
    answer:'Check you will not cause alarm or confusion to others, then sound the horn briefly.',switchOff:false},
  {id:'front-demist',question:'When it\'s safe to do so, can you show me how you\'d demist the front windscreen?',control:'front-demist',
    answer:'Set the controls for the most warm air to the windscreen; reset them when no longer needed.',switchOff:true},
  {id:'window',question:'When it\'s safe to do so, can you show me how you\'d open and close the side window?',control:'window',
    answer:'Operate the switch to open the window, then close it.',switchOff:true}
];

/** A question picked by a seed (the same seed, the same question). */
export const pick=<T>(list:readonly T[],seed:number)=>list[Math.abs(Math.floor(seed))%list.length]!;
