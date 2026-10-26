/**
 * Quality profiles. Decorative detail is reduced before hazard visibility or
 * mirror usefulness (see brief section 22).
 */
export type QualityProfileId='desktop'|'phone';

export interface QualityProfile{
  id:QualityProfileId;
  /** Picture scale: 1 = the screen's own (device) pixels, 2 = half as many each way (main.ts converts for Babylon). */
  hardwareScaling:number;
  antialias:boolean;
  /** Mirror render-target size in pixels (used from G1). */
  mirrorResolution:number;
  /** Render mirrors every N frames (1 = every frame). */
  mirrorUpdateInterval:number;
  /** How far back the mirrors show (metres): each mirror draws the street again, so phones draw less of it. */
  mirrorRange:number;
  decorativeDetail:'full'|'reduced';
}

export const QUALITY_PROFILES:Record<QualityProfileId,QualityProfile>={
  desktop:{id:'desktop',hardwareScaling:1,antialias:true,mirrorResolution:512,mirrorUpdateInterval:1,mirrorRange:600,decorativeDetail:'full'},
  phone:{id:'phone',hardwareScaling:2,antialias:false,mirrorResolution:256,mirrorUpdateInterval:3,mirrorRange:150,decorativeDetail:'reduced'}
};

/**
 * Touch screens get the phone profile at any width: an iPhone 14 Pro Max in
 * landscape is 932 CSS px wide, wider than a small laptop window.
 */
export function pickQualityProfile(search:string,coarsePointer:boolean,_viewportWidth:number):QualityProfile{
  const requested=new URLSearchParams(search).get('quality');
  if(requested==='desktop'||requested==='phone')return QUALITY_PROFILES[requested];
  return QUALITY_PROFILES[coarsePointer?'phone':'desktop'];
}
