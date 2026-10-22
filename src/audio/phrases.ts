import {BRIEFING,END,PULL_UP,REDIRECT,TELL_ME_INTRO} from '../test/examiner';
import {SHOW_ME,TELL_ME} from '../test/vehicleChecks';
import {CORRECTIONS} from '../lessons/instructor';
import {LESSONS} from '../lessons/syllabus';

/**
 * Everything the examiner and the instructor say, sentence by sentence: the clips recorded in the British neural
 * voices (tools/voice/make_voice.mjs: the instructor Sonia, the examiner Ryan) are these. A sentence not here (a road name in it, a number out of range) is
 * spoken by the device's own voice instead, so the list can lag the code without anything going silent.
 */

/** The sentences of `text` (split after . ! or ? and a space, so "1.4 m" stays whole). */
export const sentences=(text:string):string[]=>text.split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);

/** The same sentence however it was typed (quotes, spaces, case). */
export const phraseKey=(sentence:string)=>sentence.replace(/[’‘]/g,'\'').replace(/\s+/g,' ').trim().toLowerCase();

/** The clip's file name (FNV-1a of the key, base 36). */
export function phraseFile(sentence:string):string{
  let h=0x811c9dc5;
  for(const c of phraseKey(sentence)){h^=c.codePointAt(0)!;h=Math.imul(h,0x01000193)>>>0}
  return `${h.toString(36)}.mp3`;
}

const ORD=['first','second','third','fourth','fifth'];
const TURNS=['left','right'] as const;
const range=(a:number,b:number,step=1)=>Array.from({length:Math.round((b-a)/step)+1},(_,i)=>+(a+i*step).toFixed(1));

function directions():string[]{
  const out:string[]=['At the traffic lights, go straight ahead.','At the junction, go straight ahead.'];
  for(const t of TURNS)out.push(`At the traffic lights, turn ${t}.`,`At the junction, turn ${t}.`,`At the end of the road, turn ${t}.`,
    ...ORD.map(o=>`Take the ${o} road on the ${t}.`),`Take the next road on the ${t}.`);
  for(const o of ORD)for(const way of ['straight ahead','to the left','to the right'])
    out.push(`At the roundabout, take the ${o} exit, that's ${way}.`);
  // A repeat soon after: "Then take the next road on the left."
  return [...out,...out.map(s=>`Then ${s[0]!.toLowerCase()}${s.slice(1)}`)];
}

function instructor():string[]{
  const out=[
    'Signal left on the approach.','No signal on the approach.','Signal left after you pass the exit before ours.',
    'Signal right on the approach, then left after you pass the exit before ours.',
    'Well done, that was good.','Good.','Check your mirrors.','Signal left now.','Signal right now.',
    ...TURNS.flatMap(t=>[`Interior mirror first, then your ${t} mirror.`,`Now your ${t} mirror, then signal.`]),
    'Mirrors before you signal: interior mirror, then the side mirror, then signal.',
    'Look right again just before you move off: things change while you wait.',
    'No need to signal: we are going straight ahead.','Slow down for the turn.','Move over to just left of the middle of the road.',
    'Give way to the oncoming car: it has priority when you are turning right.','Look right, left, and right again before you go.',
    'Give way to traffic from the right.','Amber: stop at the line if you safely can.','The lights are red: stop at the line.',
    'Zebra crossing ahead: look for people waiting, and be ready to stop.','Crossing with lights ahead: be ready to stop.',
    'Pull up on the left at the next safe place, please: mirrors, signal if it helps, and stop close to the kerb.',
    'Good stop.','When you are ready, move off: mirrors, look over your right shoulder, and signal if it would help.',
    'When you are ready, move off safely.','Remember to look over your right shoulder before moving off.',
    // Pull-up faults, as said (the reason in brackets left off).
    'Did not pull up at the side of a road.','Stopped at a bus stop.','Stopped too close behind a parked car to drive away without reversing.',
    ...range(1.1,3,.1).map(m=>`Stopped ${m.toFixed(1)} m from the kerb.`),...range(0,9).map(m=>`Stopped ${m} m from a junction.`),
    // The lesson's own words.
    'When you\'re ready: mirrors, look over your right shoulder, and move off.',
    'That\'s the end of the lesson route.','Pull up on the left at the next safe place, please.','Well done.','Let\'s go through how it went.',
    ...['crossroads','mini-roundabouts','traffic lights','pedestrian crossings'].map(n=>`There are no ${n} on these streets, so we'll practise the routine on the junctions there are.`),
    'Try a test centre that has some.'
  ];
  // "Next time, …": what went wrong at a junction.
  const next=[
    'check your mirrors before signalling','check your mirrors before the junction','check your mirrors before you signal, not after',
    ...TURNS.flatMap(t=>[`check the interior mirror, then the ${t} mirror, before signalling`,`check the ${t} mirror too, after the interior mirror`,
      `check the interior mirror first, then the ${t} mirror`]),
    'signal in good time: after the mirrors, before you slow down and turn',
    'going ahead, do not signal on the approach (signal left after passing the exit before yours)',
    ...TURNS.flatMap(t=>[`signal ${t} on the approach`,`you signalled the wrong way: signal ${t}`,`signal ${t} after your mirror check`]),
    'no signal is needed to go straight ahead (it suggests you are turning)',
    ...range(14,45).map(v=>`slow down more for the turn (${v} mph; about 10–15 mph)`),
    'position just left of the middle of the road before turning right',
    'you turned across an oncoming vehicle: wait for it to pass when turning right',
    'you came out in front of a vehicle on the main road: wait for a gap so nobody has to slow down'
  ];
  out.push(...next.map(n=>`Next time, ${n}.`));
  for(const [rule,c] of Object.entries(CORRECTIONS))for(const severity of rule==='traffic-lights'?['minor','serious']:['minor'])
    for(const limit of rule==='speed-limit'?[20,30,40,50,60,70]:[30])out.push(c(severity,limit).say);
  return out;
}

/** Each sentence once (the first spelling of it). */
function unique(texts:string[]):string[]{
  const seen=new Map<string,string>();
  for(const t of texts)for(const s of sentences(t))if(!seen.has(phraseKey(s)))seen.set(phraseKey(s),s);
  return [...seen.values()];
}

/** What the examiner says on a mock test (recorded in the examiner's voice). */
export const examinerPhrases=():string[]=>unique([TELL_ME_INTRO,BRIEFING,PULL_UP,END,REDIRECT,
  ...TELL_ME.map(q=>q.question),...SHOW_ME.map(q=>q.question),...directions()]);

/** Every sentence there is a clip for in the instructor's voice: the examiner's too, since the instructor gives the
 * directions in a lesson. */
export const allPhrases=():string[]=>unique([...examinerPhrases(),...LESSONS.map(l=>l.briefing[0]!),...instructor()]);
