import {VIEWER_PROFILES,type ViewerProfile} from './viewerProfiles';

/**
 * Per-headset viewer calibration, saved on the phone. Several named viewers
 * can be kept (for a different holder, or a second person). The lens presets
 * are provisional starting points: only looking through the actual holder
 * shows whether a setting is right.
 */
export interface ViewerSettings{
  /** Lens preset the adjustments start from. */
  profileId:string;
  /** Distance between the two virtual eye viewpoints (stereo depth), millimetres. */
  ipdMm:number;
  /** Distance between the lens centres: moves each eye's image sideways under its lens, millimetres. */
  lensSeparationMm:number;
  /** Moves both eye images up (+) or down, millimetres on the screen. */
  verticalOffsetMm:number;
  /** Scales the preset's lens correction (1 = as the preset; 0 = none). */
  distortionScale:number;
  /** Vertical field of view drawn per eye, degrees. */
  fovDeg:number;
}

export const SETTINGS_LIMITS={
  ipdMm:{min:50,max:78,step:1},
  lensSeparationMm:{min:50,max:75,step:.5},
  verticalOffsetMm:{min:-8,max:8,step:.5},
  distortionScale:{min:0,max:1.6,step:.1},
  fovDeg:{min:60,max:110,step:1}
} as const;

export function defaultSettings(profileId=VIEWER_PROFILES[0]!.id):ViewerSettings{
  const p=VIEWER_PROFILES.find(v=>v.id===profileId)??VIEWER_PROFILES[0]!;
  return {profileId:p.id,ipdMm:63,lensSeparationMm:Math.round(p.lensSeparation*1000*2)/2,verticalOffsetMm:0,distortionScale:1,fovDeg:p.fovDeg};
}

/** The profile actually drawn: the preset with the driver's adjustments. */
export function applySettings(s:ViewerSettings):ViewerProfile&{verticalOffset:number}{
  const p=VIEWER_PROFILES.find(v=>v.id===s.profileId)??VIEWER_PROFILES[0]!;
  return {...p,fovDeg:s.fovDeg,lensSeparation:s.lensSeparationMm/1000,ipd:s.ipdMm/1000,k1:p.k1*s.distortionScale,k2:p.k2*s.distortionScale,verticalOffset:s.verticalOffsetMm/1000};
}

export function clampSettings(s:ViewerSettings):ViewerSettings{
  const c=(v:number,{min,max}:{min:number;max:number})=>Math.min(max,Math.max(min,Math.round(v*100)/100));
  return {...s,ipdMm:c(s.ipdMm,SETTINGS_LIMITS.ipdMm),lensSeparationMm:c(s.lensSeparationMm,SETTINGS_LIMITS.lensSeparationMm),
    verticalOffsetMm:c(s.verticalOffsetMm,SETTINGS_LIMITS.verticalOffsetMm),distortionScale:c(s.distortionScale,SETTINGS_LIMITS.distortionScale),fovDeg:c(s.fovDeg,SETTINGS_LIMITS.fovDeg)};
}

export interface SavedViewers{active:string;viewers:Record<string,ViewerSettings>}
const KEY='dp.viewer.settings.v1';
export const VIEWER_SLOTS=['Viewer 1','Viewer 2','Viewer 3'] as const;

export function loadViewers(storage:Pick<Storage,'getItem'>|null):SavedViewers{
  try{
    const v=JSON.parse(storage?.getItem(KEY)??'null') as SavedViewers|null;
    if(v&&typeof v.active==='string'&&v.viewers)return v;
  }catch{/* ignore */}
  return {active:VIEWER_SLOTS[0],viewers:{}};
}

export function saveViewers(storage:Pick<Storage,'setItem'>|null,v:SavedViewers):boolean{
  try{storage?.setItem(KEY,JSON.stringify(v));return !!storage}catch{return false}
}

export function activeSettings(v:SavedViewers):ViewerSettings{
  return clampSettings(v.viewers[v.active]??defaultSettings());
}
