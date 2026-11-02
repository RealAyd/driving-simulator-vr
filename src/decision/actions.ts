/**
 * The decision buttons: an id for each observation or action, and its label. A challenge shows the ones that
 * matter there, with plausible wrong ones among them.
 */
export const ACTION_LABEL:Record<string,string>={
  'look-right':'Look right',
  'look-left':'Look left',
  'mirror-interior':'Interior mirror',
  'mirror-left':'Left mirror',
  'mirror-right':'Right mirror',
  'blind-spot-right':'Right blind spot',
  'signal-left':'Signal left',
  'signal-right':'Signal right',
  'lane-right':'Move to the right lane',
  'creep':'Creep forward',
  'horn':'Sound horn',
  'give-way':'Give way',
  'go':'Go'
};

/** What an observation shows (the camera turns there for a moment while the scene is paused). */
export type Look='right'|'left'|'interior'|'left-door'|'right-door'|'right-shoulder';
export const ACTION_LOOK:Partial<Record<string,Look>>={
  'look-right':'right','look-left':'left','mirror-interior':'interior','mirror-left':'left-door','mirror-right':'right-door','blind-spot-right':'right-shoulder'
};

/** The indicator an action switches on. */
export const ACTION_SIGNAL:Partial<Record<string,'left'|'right'>>={'signal-left':'left','signal-right':'right'};

export const actionLabel=(id:string)=>ACTION_LABEL[id]??id;
