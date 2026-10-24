/**
 * Phone-viewer (cardboard-style headset) optics. Pure data and maths, unit-tested.
 *
 * Each eye gets half the screen. The headset's lenses sit `lensSeparation`
 * apart, usually closer together than the centres of the two screen halves, so
 * each eye's image is shifted towards the middle of the screen to sit under its
 * lens. The lenses magnify with pincushion distortion; drawing each eye's image
 * with the opposite (barrel) distortion makes straight lines look straight.
 * The real values depend on the headset: these presets are starting points to
 * adjust on the device, not measured headsets.
 */
export interface ViewerProfile{
  id:string;
  label:string;
  /** Vertical field of view drawn for each eye, degrees. */
  fovDeg:number;
  /** Distance between the lens centres, metres. */
  lensSeparation:number;
  /** Radial distortion: r' = r(1 + k1 r² + k2 r⁴), r = 1 at the top and bottom of the eye's image. */
  k1:number;
  k2:number;
  /** Distance between the two eye viewpoints in the scene (interpupillary distance), metres. */
  ipd:number;
  /** Moves both eye images up (+) or down on the screen, metres (calibration). */
  verticalOffset?:number;
}

export const VIEWER_PROFILES:ViewerProfile[]=[
  {id:'generic',label:'Typical phone headset (VR-box style, adjustable lenses)',fovDeg:85,lensSeparation:.062,k1:.22,k2:.24,ipd:.063},
  {id:'cardboard',label:'Google Cardboard style (fixed lenses)',fovDeg:80,lensSeparation:.0639,k1:.34,k2:.55,ipd:.063},
  {id:'flat',label:'No lens correction (stereo only; for checking alignment)',fovDeg:80,lensSeparation:.062,k1:0,k2:0,ipd:.063}
];

/** iPhone 14 Pro Max display in landscape (6.7 in, 2796 × 1290 px at 460 ppi): width and height, metres. */
export const IPHONE_14_PRO_MAX={width:.1544,height:.0712};
/**
 * Metres per CSS pixel (point) on iPhones with 460 ppi screens at 3x (iPhone 12 onwards, Pro and Pro Max alike):
 * 154.4 mm across the 14 Pro Max's 932 points. The picture's real size comes from the area the page actually has
 * (smaller in Safari with its bars showing, or on a smaller iPhone), not from one phone's full screen.
 */
export const METRES_PER_POINT=IPHONE_14_PRO_MAX.width/932;

/** What the page can tell about the phone's screen: Apple or not, pixel ratio, and its long side in CSS pixels. */
export interface ScreenInfo{ios:boolean;dpr:number;longSide:number}
/**
 * CSS pixels per inch of the phone's screen, estimated (a page cannot read the screen's physical size; the setting
 * "Phone screen width" corrects it). iPhones: 3x screens are 458–460 ppi (153 per inch); 2x screens are 326 ppi (163);
 * the 12 and 13 mini (476 ppi) share 812 points with the X, XS and 11 Pro (458 ppi). Android phones are usually
 * 140–160; 150 is the middle.
 */
export function estimatePointsPerInch(s:ScreenInfo):number{
  if(s.ios){
    if(s.dpr<2.5)return 163;
    if(Math.round(s.longSide)===812)return 159;
    return 153;
  }
  return 150;
}
/** The phone's long side in millimetres, from the estimate (one decimal). */
export const estimatedScreenWidthMm=(s:ScreenInfo)=>Math.round(s.longSide/estimatePointsPerInch(s)*254)/10;

export interface EyeLayout{
  /** Horizontal shift of each eye's image, as a fraction of the eye's half-width (projection space): + moves right. */
  shift:{left:number;right:number};
  /** Lens centre in each eye's image, texture coordinates (0..1). */
  centre:{left:number;right:number};
  /** Vertical shift of both images (projection space, + up) and the lens centre's vertical texture coordinate. */
  vshift:number;
  vcentre:number;
  /** Width ÷ height of one eye's image. */
  aspect:number;
  /** Shrinks the corrected image so its nearest side edge stays filled. */
  scale:number;
}

/** Lens geometry for one screen size (metres) and drawing-buffer aspect (width ÷ height of the whole screen). */
export function eyeLayout(profile:ViewerProfile,screenWidth:number,screenAspect:number,screenHeight=IPHONE_14_PRO_MAX.height):EyeLayout{
  const eyeWidth=screenWidth/2;
  // Lens centre relative to the centre of each half, as a fraction of the half's width.
  const offset=Math.max(-.4,Math.min(.4,(screenWidth/4-profile.lensSeparation/2)/eyeWidth));
  const aspect=screenAspect/2;
  // r is measured in units of half the eye's height; the nearest side edge is (0.5 − offset) of the eye width away.
  const edge=(.5-Math.abs(offset))*aspect*2;
  const scale=1+profile.k1*edge**2+profile.k2*edge**4;
  return {
    // The left eye's lens is to the right of its half's centre (towards the middle of the screen), and vice versa.
    shift:{left:2*offset,right:-2*offset},
    centre:{left:.5+offset,right:.5-offset},
    vshift:2*(profile.verticalOffset??0)/screenHeight,
    vcentre:.5+(profile.verticalOffset??0)/screenHeight,
    aspect,
    scale
  };
}
