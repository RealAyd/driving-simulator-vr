/**
 * Experiment only: Google Photorealistic 3D Tiles drawn in the simulator's own Babylon
 * scene, through NASA-AMMOS 3DTilesRendererJS. The tiles are visual scenery. Driving,
 * collisions and assessment keep using the authored road geometry.
 *
 * Coordinates: tile content is in ECEF metres. A parent node holds the tangent frame
 * at the Brentwood origin (geospatial.ts), so composed world matrices come out in
 * scene metres. This only stays precise with 64-bit matrices (Engine option
 * useHighPrecisionMatrix); the GPU then sees small numbers.
 */
import {TilesRenderer} from '3d-tiles-renderer/babylonjs';
import {GoogleCloudAuthPlugin} from '3d-tiles-renderer/core/plugins';
import {DracoDecoder} from '@babylonjs/core/Meshes/Compression/dracoDecoder';
import {Ray} from '@babylonjs/core/Culling/ray';
import {Frustum} from '@babylonjs/core/Maths/math.frustum';
import {Plane} from '@babylonjs/core/Maths/math.plane';
import {Matrix,TransformNode,Vector3,type AbstractMesh,type Camera,type Scene} from '../../engine/babylon';
import {ecefToSceneMatrix,reference,sceneScale} from './geospatial';
import {redact} from './redact';

const TILES_ROOT='https://tile.googleapis.com/v1/3dtiles/root.json';

// Served with the build (public/vendor/draco); Babylon's default is a CDN.
const base=new URL('./vendor/draco/',document.baseURI).href;
DracoDecoder.DefaultConfiguration={wasmUrl:`${base}draco_wasm_wrapper.js`,wasmBinaryUrl:`${base}draco_decoder.wasm`};


export interface TilesNetwork{requests:number;bytes:number;errors:number;lastError:string|null;rootStatus:number|null;firstContentAt:number|null}

// The library's type declarations omit members used here; these describe the parts relied on.
type AuthPlugin={fetchData(url:string,options?:RequestInit):Promise<Response>};
const AuthBase=GoogleCloudAuthPlugin as unknown as new(options:{apiToken:string;autoRefreshToken?:boolean})=>AuthPlugin;
interface TilesRendererInternals{
  scene:Scene;
  group:TransformNode;
  stats:{visible:number;active:number;inCache:number;downloading:number;parsing:number;failed:number;queued:number;refused:number};
  errorTarget:number;
  readonly loadProgress:number;
  lruCache:{maxSize:number;minSize:number};
  update():void;
  dispose():void;
  registerPlugin(plugin:object):void;
  getAttributions():{type:string;value:unknown}[];
  addEventListener(type:string,listener:(event:unknown)=>void):void;
}
const TilesBase=TilesRenderer as unknown as new(url:string,scene:Scene)=>TilesRendererInternals;

/** Counts requests and bytes, and keeps the first error, without exposing the key. */
class MeteredGoogleAuth extends AuthBase{
  readonly net:TilesNetwork={requests:0,bytes:0,errors:0,lastError:null,rootStatus:null,firstContentAt:null};
  override async fetchData(url:string,options?:RequestInit):Promise<Response>{
    this.net.requests++;
    try{
      const res=await super.fetchData(url,options);
      // The first (root) request comes back already parsed: the plugin reads the session token from it.
      if(!(res instanceof Response)){
        this.net.rootStatus??=200;
        this.net.bytes+=JSON.stringify(res).length;
        return res;
      }
      if(url.includes('/root.json'))this.net.rootStatus=res.status;
      if(!res.ok){
        this.net.errors++;
        this.net.lastError=`HTTP ${res.status}: ${redact((await res.clone().text()).slice(0,240))}`;
      }else void res.clone().arrayBuffer().then((b:ArrayBuffer)=>{this.net.bytes+=b.byteLength}).catch(()=>{});
      return res;
    }catch(error){
      this.net.errors++;
      this.net.lastError=redact(String((error as Error)?.message??error));
      throw error;
    }
  }
}

const _toTiles=Matrix.Identity();
const _cameraInTiles=new Vector3();
const _planes=Array.from({length:6},()=>new Plane(0,0,0,0));

/**
 * Chooses detail for every camera that shows the scene (the driver and, optionally, the
 * mirror cameras), not only scene.activeCamera, so mirrors are not left with gaps.
 */
class MultiCameraTilesRenderer extends TilesBase{
  cameras:()=>Camera[]=()=>[];
  calculateTileViewError(tile:any,target:any):void{
    const engine=this.scene.getEngine();
    const height=engine.getRenderHeight()*engine.getHardwareScalingLevel();
    const volume=tile.engineData.boundingVolume;
    this.group.getWorldMatrix().invertToRef(_toTiles);
    let inView=false,error=0,distance=Infinity;
    for(const camera of this.cameras()){
      Vector3.TransformCoordinatesToRef(camera.globalPosition,_toTiles,_cameraInTiles);
      Frustum.GetPlanesToRef(camera.getTransformationMatrix(),_planes);
      if(!volume.intersectsFrustum(_planes.map(p=>p.transform(_toTiles))))continue;
      const d=volume.distanceToPoint(_cameraInTiles);
      const sse=(2/camera.getProjectionMatrix().m[5]!)/height;
      inView=true;
      error=Math.max(error,d===0?Infinity:tile.geometricError/(d*sse));
      distance=Math.min(distance,d);
    }
    target.inView=inView;
    target.error=error;
    target.distanceFromCamera=Number.isFinite(distance)?distance:volume.distanceToPoint(_cameraInTiles);
  }
}

export interface PhotorealTilesOptions{
  apiKey:string;
  /** WGS84 ellipsoid height (m) of scene y = 0 at the origin; measured with calibrate(). */
  heightEllipsoid:number;
  /** Screen-space error target in pixels (higher = coarser, fewer downloads). */
  errorTarget:number;
  /** Tiles kept in memory before unused ones are released. Too low and finer tiles are refused
   * (the street stays coarse) and evicted tiles are downloaded again; the library default is 8000. */
  maxCachedTiles:number;
}

export interface SurfaceSample{x:number;z:number;y:number|null}

export class PhotorealTiles{
  private readonly frame:TransformNode;
  private readonly tiles:MultiCameraTilesRenderer;
  private readonly auth:MeteredGoogleAuth;
  private height:number;
  readonly startedAt=performance.now();
  extraCameras:()=>Camera[]=()=>[];

  constructor(private readonly scene:Scene,private readonly camera:Camera,options:PhotorealTilesOptions){
    this.height=options.heightEllipsoid;
    // Parent: the OSM extraction's slightly non-metric x/z scale. Child (tiles.group): ECEF -> tangent frame.
    this.frame=new TransformNode('photoreal-tiles-frame',scene);
    const s=sceneScale();
    this.frame.scaling.set(s.x,1,s.z);
    this.tiles=new MultiCameraTilesRenderer(TILES_ROOT,scene);
    this.tiles.group.parent=this.frame;
    this.tiles.cameras=()=>[this.camera,...this.extraCameras()];
    this.auth=new MeteredGoogleAuth({apiToken:options.apiKey,autoRefreshToken:true});
    this.tiles.registerPlugin(this.auth);
    this.tiles.errorTarget=options.errorTarget;
    this.tiles.lruCache.maxSize=options.maxCachedTiles;
    this.tiles.lruCache.minSize=Math.round(options.maxCachedTiles*.75);
    this.tiles.addEventListener('load-model',()=>{this.auth.net.firstContentAt??=performance.now()-this.startedAt});
    this.place();
  }

  private place():void{
    const m=Matrix.FromArray(ecefToSceneMatrix(reference(this.height)));
    const g=this.tiles.group;
    g.rotationQuaternion??=g.rotation.toQuaternion();
    m.decompose(g.scaling,g.rotationQuaternion,g.position);
  }

  /** Call once per frame, before rendering, after the cameras have moved. */
  update():void{
    this.tiles.update();
  }

  set visible(on:boolean){this.frame.setEnabled(on)}

  get heightEllipsoid():number{return this.height}
  set heightEllipsoid(h:number){this.height=h;this.place()}

  /** Copyright lines of the tiles now shown (Google requires them on screen). */
  attributions():string{
    return this.tiles.getAttributions().filter(a=>a.type==='string').map(a=>String(a.value)).join('; ');
  }

  private isTileMesh=(mesh:AbstractMesh)=>mesh.isEnabled()&&mesh.isDescendantOf(this.tiles.group);

  /** Height of the tile surface (scene y) straight below each point, or null where no tile is loaded. */
  surface(points:{x:number;z:number}[]):SurfaceSample[]{
    return points.map(({x,z})=>{
      const hit=this.scene.pickWithRay(new Ray(new Vector3(x,400,z),new Vector3(0,-1,0),800),this.isTileMesh);
      return {x,z,y:hit?.hit&&hit.pickedPoint?hit.pickedPoint.y:null};
    });
  }

  /**
   * Moves the tiles vertically so their surface at these road points sits at scene y = 0
   * (the authored road). Returns the residuals after the move: how far the tile surface is
   * from a flat road, point by point (the authored Brentwood roads are flat; the real ones are not).
   */
  calibrate(points:{x:number;z:number}[]):{offset:number;heightEllipsoid:number;samples:SurfaceSample[]}|null{
    const found=this.surface(points).filter(s=>s.y!==null).map(s=>s.y!).sort((a,b)=>a-b);
    if(found.length<Math.min(3,points.length))return null;
    const offset=found[Math.floor(found.length/2)]!;
    this.heightEllipsoid=this.height+offset;
    this.frame.computeWorldMatrix(true);
    this.tiles.group.computeWorldMatrix(true);
    for(const m of this.tiles.group.getChildMeshes())m.computeWorldMatrix(true);
    return {offset,heightEllipsoid:this.height,samples:this.surface(points)};
  }

  stats(){
    const s=this.tiles.stats;
    let meshes=0,triangles=0;
    for(const m of this.tiles.group.getChildMeshes()){
      if(!m.isEnabled())continue;
      meshes++;
      triangles+=m.getTotalIndices()/3;
    }
    const sample=this.tiles.group.getChildMeshes().find(m=>m.material)?.material as {getClassName():string;unlit?:boolean}|undefined;
    return {
      material:sample?{kind:sample.getClassName(),unlit:!!sample.unlit}:null,
      heightEllipsoid:this.height,errorTarget:this.tiles.errorTarget,loadProgress:this.tiles.loadProgress,
      visible:s.visible,active:s.active,inCache:s.inCache,downloading:s.downloading,parsing:s.parsing,failed:s.failed,queued:s.queued,refused:s.refused,
      meshes,triangles,cameras:1+this.extraCameras().length,network:{...this.auth.net}
    };
  }

  dispose():void{
    this.tiles.dispose();
    this.frame.dispose();
  }
}
