/**
 * Experiment only: chooses the scenery for the Brentwood stretch and keeps the
 * photorealistic tiles (photorealTiles.ts) in step with the driver's camera.
 *
 * - constructed: the existing scene, unchanged (the default and the fallback).
 * - tiles: Google tiles instead of the drawn scenery; road users, cockpit and mirrors stay.
 * - hybrid: Google tiles with our road surface, kerbs and markings drawn over them.
 *
 * Driving, collisions and assessment are never affected: they use the authored road
 * geometry and colliders in every mode (the drawn colliders stay in place, unseen).
 */
import type {Camera,Scene,TransformNode} from '../../engine/babylon';
import type {Location} from '../../contracts';
import type {QualityProfile} from '../../engine/quality';
import type {PhotorealTiles,SurfaceSample} from './photorealTiles';
import {redact} from './redact';

export type SceneryMode='constructed'|'tiles'|'hybrid';
export const SCENERY_MODES:readonly SceneryMode[]=['constructed','tiles','hybrid'];
export const TILES_LOCATION='brentwood-paired-mini-roundabouts';

/**
 * Before measuring, tiles are placed with scene y = 0 at this WGS84 ellipsoid height:
 * High Street near Wilson's Corner is about 100 m above Ordnance Datum (OS 1:25 000 contours)
 * and the geoid is about 45.5 m above the ellipsoid in Essex (OSGM15). It only decides
 * which tiles load first; calibrate() then measures the real surface.
 */
export const INITIAL_HEIGHT_ESTIMATE=145.5;

export function pickSceneryMode(search:string):SceneryMode{
  const m=new URLSearchParams(search).get('scenery');
  return SCENERY_MODES.includes(m as SceneryMode)?m as SceneryMode:'constructed';
}

/** Drawn meshes kept over the tiles in hybrid mode: the road surface the car drives on and its markings. */
const ROAD_SURFACE=/^(merged-(tarmac|kerb|pavement|road-white)|carriageway-|kerb-|pavement-|marking-|rb\d-(surface|disc)|.*-giveway-|.*-stripe-|.*-stud-|.*-stop-)/;

/** Road points used to measure the tile surface height: High Street and the two junctions (scene metres). */
export function calibrationPoints(place:Location):{x:number;z:number}[]{
  const high=place.roads.find(r=>r.id==='high-street');
  const pts=(high?.centreline??[]).filter(p=>Math.hypot(p.x-place.spawn.position.x,p.z-place.spawn.position.z)<160);
  const step=Math.max(1,Math.floor(pts.length/12));
  return [...pts.filter((_,i)=>i%step===0),...place.junctions.map(j=>({x:j.position.x,z:j.position.z}))];
}

export interface TilesConfig{apiKey:string;search:string}

export class TilesExperiment{
  readonly mode:SceneryMode;
  private tiles:PhotorealTiles|null=null;
  private starting=false;
  private root:TransformNode|null=null;
  private place:Location|null=null;
  private hideTimer=0;
  private calibrated:{offset:number;heightEllipsoid:number;samples:SurfaceSample[];at:number}|null=null;
  /** Each measurement: the surface comes from whatever detail has loaded, so it is repeated until it stops moving. */
  private readonly calibrations:{offset:number;heightEllipsoid:number;at:number;visible:number}[]=[];
  private settledFor=0;
  private readonly fixedHeight:number|null;
  private readonly errorTarget:number|null;
  private readonly credit:HTMLElement;
  private readonly stereoCredit:HTMLElement;
  private lastCredit='';
  problem:string|null=null;
  mirrorCameras:()=>Camera[]=()=>[];
  /** Whether tile detail is also chosen for the mirror cameras (diagnostics can switch it off). */
  mirrorsSelectTiles=true;

  constructor(private readonly scene:Scene,private readonly camera:Camera,private readonly quality:QualityProfile,private readonly config:TilesConfig){
    this.mode=pickSceneryMode(config.search);
    const q=new URLSearchParams(config.search);
    const h=Number.parseFloat(q.get('tilesHeight')??'');
    this.fixedHeight=Number.isFinite(h)?h:null;
    const e=Number.parseFloat(q.get('tilesError')??'');
    this.errorTarget=Number.isFinite(e)&&e>0?e:null;
    this.credit=document.getElementById('tiles-credit')!;
    this.stereoCredit=document.getElementById('tiles-credit-stereo')!;
    if(this.mode!=='constructed'&&!config.apiKey)this.problem='This build has no Map Tiles API key, so the constructed scenery is shown.';
  }

  get active():boolean{return this.mode!=='constructed'&&!this.problem}
  /** Background people are drawn scenery; the tiles have their own captured people. */
  get keepsCrowd():boolean{return !this.active}

  /** After the world for a location is built (and again whenever the location changes). */
  apply(place:Location,root:TransformNode):void{
    this.place=place;
    this.root=root;
    const here=place.id===TILES_LOCATION;
    if(this.active&&here&&!this.tiles&&!this.starting){
      // Loaded on demand: the constructed scene's bundle does not include the tiles renderer.
      this.starting=true;
      import('./photorealTiles').then(({PhotorealTiles})=>{
        this.tiles=new PhotorealTiles(this.scene,this.camera,{
          apiKey:this.config.apiKey,
          heightEllipsoid:this.fixedHeight??INITIAL_HEIGHT_ESTIMATE,
          errorTarget:this.errorTarget??(this.quality.id==='phone'?24:16),
          maxCachedTiles:this.quality.id==='phone'?1500:3000
        });
        this.tiles.extraCameras=()=>this.mirrorsSelectTiles?this.mirrorCameras():[];
        this.tiles.visible=this.place?.id===TILES_LOCATION;
      }).catch(error=>{
        this.problem=`Tiles could not start: ${redact(String((error as Error)?.message??error))}`;
      });
    }
    if(this.tiles)this.tiles.visible=here;
    // The Google logo is fetched only when tiles are in use (constructed mode contacts no Google host).
    if(this.active&&here)for(const img of document.querySelectorAll<HTMLImageElement>('.tiles-credit img[data-src]'))if(!img.getAttribute('src'))img.src=img.dataset.src!;
    this.hideTimer=0;
  }

  /** Hides the drawn scenery the tiles replace (again every second: models arrive asynchronously). */
  private hideDrawn():void{
    const root=this.root;
    if(!root||!this.tiles||this.place?.id!==TILES_LOCATION)return;
    for(const mesh of root.getChildMeshes()){
      if(mesh.material?.name==='people')continue;
      const keep=this.mode==='hybrid'&&ROAD_SURFACE.test(mesh.name);
      if(!keep&&mesh.isEnabled(false))mesh.setEnabled(false);
    }
  }

  /** Once per frame, after the cameras have moved and before rendering. */
  update(dt:number):void{
    const tiles=this.tiles;
    if(!tiles||this.place?.id!==TILES_LOCATION)return;
    if((this.hideTimer-=dt)<=0){this.hideTimer=1;this.hideDrawn()}
    tiles.update();
    // Measure the height when loading has settled (unless a height was given), and again after
    // finer tiles arrive, until two measurements agree within 3 cm (at most 6 times).
    const st=tiles.stats();
    this.settledFor=st.visible>20&&st.downloading===0&&st.parsing===0&&st.queued===0?this.settledFor+dt:0;
    const done=this.calibrations.length>=6||(this.calibrations.length>=2&&Math.abs(this.calibrations.at(-1)!.offset)<.03);
    if(this.fixedHeight===null&&!done&&this.settledFor>1&&this.place){
      this.settledFor=0;
      const result=tiles.calibrate(calibrationPoints(this.place));
      if(result){
        const at=performance.now()-tiles.startedAt;
        this.calibrations.push({offset:+result.offset.toFixed(3),heightEllipsoid:+result.heightEllipsoid.toFixed(3),at:Math.round(at),visible:st.visible});
        this.calibrated={...result,at};
      }
    }
    const text=tiles.attributions();
    if(text!==this.lastCredit){
      this.lastCredit=text;
      for(const el of [this.credit,this.stereoCredit])el.querySelectorAll('.tiles-data').forEach(s=>{s.textContent=text});
    }
    const show=tiles.stats().visible>0;
    this.credit.hidden=!show;
    this.stereoCredit.hidden=!show;
  }

  /** Re-measures the surface at the calibration points (or the given ones) without moving the tiles. */
  surface(points?:{x:number;z:number}[]):SurfaceSample[]{
    return this.tiles&&this.place?this.tiles.surface(points??calibrationPoints(this.place)):[];
  }

  diagnostics(){
    return {mode:this.mode,active:this.active,problem:this.problem,calibration:this.calibrated,calibrations:this.calibrations,calibrationDone:this.fixedHeight!==null||this.calibrations.length>=6||(this.calibrations.length>=2&&Math.abs(this.calibrations.at(-1)!.offset)<.03),initialHeightEstimate:INITIAL_HEIGHT_ESTIMATE,
      fixedHeight:this.fixedHeight,mirrorsSelectTiles:this.mirrorsSelectTiles,stats:this.tiles?.stats()??null,attributions:this.lastCredit};
  }

  /** Short line for the About panel. */
  describe():string{
    if(this.mode==='constructed')return 'constructed (no Google tiles requested)';
    if(this.problem)return `${this.mode} requested; ${this.problem}`;
    const s=this.tiles?.stats();
    const c=this.calibrated;
    return `${this.mode}: Google Photorealistic 3D Tiles${s?`; ${s.visible} tiles shown, ${s.network.requests} requests, ${(s.network.bytes/1048576).toFixed(1)} MB`:''}${c?`; road level measured at ${c.heightEllipsoid.toFixed(1)} m above the WGS84 ellipsoid`:this.fixedHeight!==null?`; height fixed at ${this.fixedHeight} m`:'; height not measured yet'}${s?.network.lastError?`; last error ${s.network.lastError}`:''}`;
  }

  dispose():void{this.tiles?.dispose();this.tiles=null}
}
