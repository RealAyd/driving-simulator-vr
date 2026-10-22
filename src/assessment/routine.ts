/**
 * The order and timing of a driver's routine, judged from what they looked at and when (the project owner's
 * standard, from the Highway Code's Mirrors–Signal–Manoeuvre routine and how examiners mark it):
 *
 * - Turning: the interior mirror first, then the door mirror on the side of the turn, then the signal, then the
 *   turn. A mirror looked at only after signalling is too late (the signal may already have misled someone); a
 *   signal given only once the car is turning is too late to help anyone.
 * - Moving off: a look all round (mirrors and both blind spots), and a current look to the right (mirror or over the
 *   shoulder) just before moving: the situation keeps changing, so a full check made a while ago and then waiting is
 *   not enough. Within a few seconds, one fresh look covers it; no single check has to be repeated.
 *
 * Pure: the marking (mockTest.ts) and the instructor (instructor.ts) both use it, so they agree.
 */

export interface Look{time:number;target:string}

/** How recent the last look to the right must be when the car moves off (seconds). */
export const MOVE_OFF_FRESH=6;
/** How long before moving off the look all round may have started (seconds). */
export const MOVE_OFF_ALL_ROUND=20;
/** Mirror checks this long before the signal still count as part of the routine (seconds). */
export const MIRRORS_BEFORE_SIGNAL=12;

export interface TurnJudgement{
  /** The interior mirror was checked before signalling (or before turning, with no signal). */
  interior:boolean;
  /** The door mirror on the side of the turn was checked before signalling. */
  side:boolean;
  /** Both were checked, the interior one first. */
  inOrder:boolean;
  /** A mirror was checked, but only after the signal. */
  mirrorsAfterSignal:boolean;
  /** The signal came only as the car was already turning. */
  signalLate:boolean;
}

/**
 * Judges a turn. `signalAt`: when the signal for this turn went on (null: none). `turnAt`: when the car began to turn
 * (reached the junction). `from`: the earliest a look counts (the direction given, or a little before).
 */
export function judgeTurn(turn:'left'|'right',looks:readonly Look[],from:number,signalAt:number|null,turnAt:number):TurnJudgement{
  const before=signalAt??turnAt;
  const start=Math.max(from,before-MIRRORS_BEFORE_SIGNAL);
  const sideMirror=turn==='left'?'left-door':'right-door';
  const inWindow=looks.filter(l=>l.time>=start&&l.time<=before+.05);
  const firstInterior=inWindow.filter(l=>l.target==='interior').map(l=>l.time).sort((a,b)=>a-b)[0];
  const firstSide=inWindow.filter(l=>l.target===sideMirror).map(l=>l.time).sort((a,b)=>a-b)[0];
  const lastSide=inWindow.filter(l=>l.target===sideMirror).map(l=>l.time).sort((a,b)=>b-a)[0];
  const interior=firstInterior!==undefined,side=firstSide!==undefined;
  const mirrorsAfterSignal=signalAt!==null&&!interior&&!side&&
    looks.some(l=>(l.target==='interior'||l.target===sideMirror)&&l.time>signalAt&&l.time<=turnAt);
  return {interior,side,inOrder:interior&&side&&firstInterior!<=lastSide!,mirrorsAfterSignal,signalLate:signalAt!==null&&signalAt>turnAt-1};
}

export interface MoveOffJudgement{
  /** Looked all round in the time before moving off: interior mirror, right mirror and over the right shoulder. */
  allRound:boolean;
  /** Which of those were not looked at. */
  missing:string[];
  /** The last look to the right (mirror or shoulder) was recent enough when the car moved. */
  fresh:boolean;
  /** The left side (mirror or over the shoulder) was looked at too. */
  left:boolean;
}

const NAMES:Record<string,string>={interior:'the interior mirror','right-door':'the right mirror','right-shoulder':'over your right shoulder (the blind spot)'};

/** Judges the observation before moving off at `movedAt` (from rest at the kerb, or after stopping). */
export function judgeMoveOff(looks:readonly Look[],movedAt:number,since=-Infinity):MoveOffJudgement{
  const recent=looks.filter(l=>l.time<=movedAt+.05&&l.time>=Math.max(since,movedAt-MOVE_OFF_ALL_ROUND));
  const needed=['interior','right-door','right-shoulder'];
  const missing=needed.filter(t=>!recent.some(l=>l.target===t)).map(t=>NAMES[t]!);
  const lastRight=recent.filter(l=>l.target==='right-door'||l.target==='right-shoulder').map(l=>l.time).sort((a,b)=>b-a)[0];
  return {allRound:missing.length===0,missing,fresh:lastRight!==undefined&&movedAt-lastRight<=MOVE_OFF_FRESH,
    left:recent.some(l=>l.target==='left-door'||l.target==='left-shoulder')};
}
