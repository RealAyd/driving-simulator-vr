/**
 * One tip about a control at the start of every drive (lesson, mock test, free drive or drill): what a control does,
 * worded for how this person is driving (touch screen, keyboard, game controller, or headset with a controller).
 * Each drive shows the next tip in the list, so over a few drives every control is mentioned once.
 */

export type TipInput='touch'|'keyboard'|'gamepad'|'headset';
export type TipSteering='assist'|'buttons'|'tilt'|'stick';
/** The controller's buttons as the person set them up (names shown to them), for the controller tips. */
export interface ControllerNames{accelerate:string;brake:string;signalLeft:string;signalRight:string;pause:string;recentre:string;view:string|null}

function steeringTip(input:TipInput,steering:TipSteering,c?:ControllerNames):string{
  if(steering==='assist')return 'The steering is done for you: watch your speed, check your mirrors and signal in good time.';
  if(steering==='tilt')return 'Tilt the phone like a steering wheel. If the car pulls to one side, pause and recentre.';
  if(input==='keyboard')return 'Steer with A and D (or ← and →). Let go and the wheel straightens.';
  if(steering==='stick')return 'Steer with the left stick. Let go and the wheel straightens.';
  if(input==='touch')return 'Hold the ◀ and ▶ steer buttons to turn the wheel. Let go and it straightens.';
  return c?'Steer with the steer buttons you set on the controller screen. Let go and the wheel straightens.':'Steer with the steer buttons. Let go and the wheel straightens.';
}

/** Every tip for this way of driving, in the order they are shown. */
export function controlTips(input:TipInput,steering:TipSteering,c?:ControllerNames):string[]{
  const steer=steeringTip(input,steering,c);
  if(input==='touch')return [
    'Hold a mirror or shoulder button to look: Left or Right mirror for the door mirrors, Left or Right shoulder for the blind spots, Interior mirror for behind you.',
    'Tap Signal left or Signal right to indicate; tap again to cancel. Check the mirrors first.',
    'Hold Go to speed up. Let go and the car slows gently; hold Brake to slow down or stop.',
    steer,
    'Task repeats the last instruction from the examiner or instructor.',
    'Controls has the lights, wipers, demisters and horn. A “show me” question asks you to use one.',
    'D/R switches between drive and reverse: useful to back away after a wrong turn.',
    'Swipe across the road to look around; tap Forward to look ahead again.',
    'The camera button shows the car from behind (practice only): drag to look all the way round.'
  ];
  if(input==='keyboard')return [
    'Hold Q or E for a shoulder check, and 1, 2 or 3 for the left mirror, interior mirror and right mirror.',
    'Press [ or ] to signal left or right; press again to cancel. Check the mirrors first.',
    'W or ↑ to go; S, ↓ or Space to brake. Let go of W and the car slows gently.',
    steer,
    'X switches between drive and reverse: useful to back away after a wrong turn.',
    'L turns the headlights on and off; H sounds the horn.',
    'P or Esc pauses the drive; C looks straight ahead again.',
    'Drag with the mouse to look around. The camera button shows the car from behind (practice only).'
  ];
  const n=c??{accelerate:'Accelerate',brake:'Brake',signalLeft:'Signal left',signalRight:'Signal right',pause:'Pause',recentre:'Recentre',view:null};
  const shared=[
    `Hold ${n.accelerate} to move off and keep going; ${n.brake} slows you down at once.`,
    `${n.signalLeft} and ${n.signalRight} signal left and right; press again to cancel. Check the mirrors first.`,
    steer,
    `${n.pause} pauses the drive; traffic and timing freeze until you resume.`,
    ...(n.view?[`${n.view} switches between the driver’s seat and a view from behind the car (practice only: no mirrors from there).`]:[])
  ];
  if(input==='headset')return [
    'Turn your head to check the mirrors and look over your shoulder: the instructor and examiner see every look.',
    ...shared,
    `${n.recentre} looks straight ahead again if the view has drifted.`
  ];
  return [...shared,'Drag on the screen to look around; the mirror buttons on screen still work with a controller.'];
}

const KEY='dp.tip.v1';
/** The next tip in turn (remembered on this device; without storage, the first). */
export function nextTip(input:TipInput,steering:TipSteering,c?:ControllerNames,storage:Pick<Storage,'getItem'|'setItem'>|null=safeStorage()):string{
  const tips=controlTips(input,steering,c);
  let n=0;
  try{n=Number(storage?.getItem(KEY))||0;storage?.setItem(KEY,String(n+1))}catch{/* the first tip each time */}
  return tips[n%tips.length]!;
}
function safeStorage(){try{return localStorage}catch{return null}}
