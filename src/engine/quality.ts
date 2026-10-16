/**
 * Quality profiles. Decorative detail is reduced before hazard visibility or
 * mirror usefulness (see brief section 22).
 */
export type QualityProfileId='desktop'|'phone';

export interface QualityProfile{
  id:QualityProfileId;
  /** Babylon hardware scaling: 1 = native resolution, >1 renders fewer pixels. */
  hardwareScaling:number;
  antialias:boolean;
  /** Mirror render-target size in pixels (used from G1). */
  mirrorResolution:number;
  /** Render mirrors every N frames (1 = every frame). */
  mirrorUpdateInterval:number;
  decorativeDetail:'full'|'reduced';
}

export const QUALITY_PROFILES:Record<QualityProfileId,QualityProfile>={
  desktop:{id:'desktop',hardwareScaling:1,antialias:true,mirrorResolution:512,mirrorUpdateInterval:1,decorativeDetail:'full'},
  phone:{id:'phone',hardwareScaling:1.5,antialias:false,mirrorResolution:256,mirrorUpdateInterval:2,decorativeDetail:'reduced'}
};

export function pickQualityProfile(search:string,coarsePointer:boolean,viewportWidth:number):QualityProfile{
  const requested=new URLSearchParams(search).get('quality');
  if(requested==='desktop'||requested==='phone')return QUALITY_PROFILES[requested];
  return QUALITY_PROFILES[coarsePointer&&viewportWidth<900?'phone':'desktop'];
}
