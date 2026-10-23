import {Color3,CreateBox,CreateDisc,CreatePlane,DynamicTexture,Mesh,Quaternion,StandardMaterial,Vector3,type Scene,type TransformNode} from '../engine/babylon';
import type {Vec3} from '../contracts';
import type {HeadBasis} from './headOrientation';

/**
 * What the driver sees inside the headset, where the touch screen cannot be
 * reached: a status panel on the dashboard, a reticle in the middle of the
 * view, a menu panel straight ahead (pause, calibration, instructions) and,
 * only where the car cannot move, gaze items (look at one for a moment to
 * press it). Driving controls are never gaze items: a glance at a mirror or
 * over a shoulder must not be able to press anything that affects the car.
 * Everything is in vehicle-local coordinates, parented to the car.
 */
export interface GazeItem{
  id:string;
  label:string;
  /** Centre, vehicle-local metres. */
  x:number;y:number;z:number;
  w:number;h:number;
  /** Seconds of looking needed to press it. */
  dwell:number;
}

interface Placed extends GazeItem{mesh:Mesh;texture:DynamicTexture;centre:Vector3;normal:Vector3;right:Vector3;up:Vector3;drawn:string}

/**
 * The menu panel straight ahead (metres, and its texture in pixels): large, sharp text, as the headset's lenses
 * magnify the screen. Lines are `step` pixels apart from `first` (baselines); main.ts lines buttons up with them.
 */
export const MENU={w:.9,h:.58,distance:1.3,texW:1536,texH:990,titlePx:84,linePx:66,first:100,step:104} as const;

export class ViewerHud{
  private items:Placed[]=[];
  private readonly panel:Mesh;
  private readonly panelTexture:DynamicTexture;
  private readonly menu:Mesh;
  private readonly menuTexture:DynamicTexture;
  private readonly reticle:Mesh;
  private readonly reticleMaterial:StandardMaterial;
  private readonly farTarget:Mesh;
  private readonly nearTarget:Mesh;
  private panelText='';
  private menuText='';
  private gazed:Placed|null=null;
  /** Height of the menu panel's top edge (vehicle-local metres). */
  private menuTop=0;
  private dwell=0;
  private visible=false;
  private targets=false;
  private readonly lit=new Set<string>();

  constructor(private readonly scene:Scene,private readonly parent:TransformNode,private readonly eye:Vec3){
    const text=(name:string,w:number,h:number,px:number,c:Vector3)=>{
      const texture=new DynamicTexture(name,{width:px,height:Math.round(px*h/w)},scene,true);
      const mesh=CreatePlane(name,{width:w,height:h},scene);
      mesh.parent=parent;
      mesh.position.copyFrom(c);
      this.face(mesh,c);
      mesh.material=this.material(name,texture);
      return {mesh,texture};
    };
    // Status panel on top of the dashboard, left of the steering wheel.
    ({mesh:this.panel,texture:this.panelTexture}=text('viewer-panel',.52,.14,1024,new Vector3(-.05,1.085,-1.0)));
    // Menu panel straight ahead at eye level (pause, calibration, instructions); hidden unless needed.
    ({mesh:this.menu,texture:this.menuTexture}=text('viewer-menu',MENU.w,MENU.h,MENU.texW,new Vector3(eye.x,eye.y+.02,eye.z-MENU.distance)));
    this.menu.renderingGroupId=1;
    this.menuTop=this.menu.position.y+MENU.h/2;

    this.reticle=CreateDisc('viewer-reticle',{radius:.004,tessellation:16,sideOrientation:Mesh.DOUBLESIDE},scene);
    this.reticle.parent=parent;
    this.reticle.renderingGroupId=1;
    this.reticleMaterial=new StandardMaterial('viewer-reticle',scene);
    this.reticleMaterial.emissiveColor=new Color3(1,1,1);
    this.reticleMaterial.disableLighting=true;
    this.reticle.material=this.reticleMaterial;
    this.reticle.rotationQuaternion=new Quaternion();

    // Alignment targets for calibration: a cross far away (both eyes should see one cross) and a small one near.
    const cross=(name:string,size:number,thick:number)=>{
      const m=new StandardMaterial(name,scene);
      m.emissiveColor=new Color3(1,.85,.2);m.disableLighting=true;
      const a=CreateBox(`${name}-h`,{width:size,height:thick,depth:thick},scene),b=CreateBox(`${name}-v`,{width:thick,height:size,depth:thick},scene);
      const merged=Mesh.MergeMeshes([a,b],true)!;
      merged.name=name;merged.material=m;merged.parent=parent;merged.renderingGroupId=1;
      merged.rotationQuaternion=new Quaternion();
      return merged;
    };
    this.farTarget=cross('viewer-target-far',2.4,.12);
    this.nearTarget=cross('viewer-target-near',.05,.003);
    this.setVisible(false);
  }

  private material(name:string,texture:DynamicTexture):StandardMaterial{
    const m=new StandardMaterial(name,this.scene);
    m.diffuseTexture=texture;m.emissiveTexture=texture;m.disableLighting=true;m.backFaceCulling=false;
    return m;
  }

  /** Turns a plane at `c` to face the eye; returns its axes for gaze hit tests. */
  private face(mesh:Mesh,c:Vector3){
    const n=new Vector3(this.eye.x,this.eye.y,this.eye.z).subtract(c).normalize();
    mesh.rotationQuaternion=Quaternion.FromLookDirectionRH(n.scale(-1),Vector3.Up());
    const right=Vector3.Cross(Vector3.Up(),n).normalize().scale(-1);
    return {normal:n,right,up:Vector3.Cross(n,right).normalize().scale(-1)};
  }

  setVisible(on:boolean):void{
    this.visible=on;
    this.panel.setEnabled(on);
    this.reticle.setEnabled(on);
    this.menu.setEnabled(on&&this.menuText!=='');
    this.farTarget.setEnabled(on&&this.targets);
    this.nearTarget.setEnabled(on&&this.targets);
    for(const i of this.items)i.mesh.setEnabled(on);
    if(!on){this.gazed=null;this.dwell=0}
  }

  /** Replaces the gaze items (an empty list while driving: nothing to press by looking). */
  setItems(items:GazeItem[]):void{
    const key=(l:GazeItem[])=>l.map(i=>`${i.id}|${i.label}|${i.x}|${i.y}|${i.z}`).join(';');
    if(key(items)===key(this.items))return;
    for(const i of this.items)i.mesh.dispose(false,true);
    this.items=items.map(item=>{
      const texture=new DynamicTexture(`viewer-item-${item.id}`,{width:512,height:Math.max(64,Math.round(512*item.h/item.w))},this.scene,true);
      const mesh=CreatePlane(`viewer-item-${item.id}`,{width:item.w,height:item.h},this.scene);
      mesh.parent=this.parent;
      const centre=new Vector3(item.x,item.y,item.z);
      mesh.position.copyFrom(centre);
      mesh.renderingGroupId=1;
      const axes=this.face(mesh,centre);
      mesh.material=this.material(`viewer-item-${item.id}`,texture);
      mesh.setEnabled(this.visible);
      return {...item,mesh,texture,centre,...axes,drawn:''};
    });
    this.gazed=null;this.dwell=0;
  }

  get itemIds():string[]{return this.items.map(i=>i.id)}

  setLit(id:string,on:boolean):void{if(on)this.lit.add(id);else this.lit.delete(id)}

  /** Status text on the dashboard panel, one line per entry (redrawn only when it changes). */
  setStatus(lines:string[]):void{
    const text=lines.join('\n');
    if(text===this.panelText)return;
    this.panelText=text;
    const ctx=this.panelTexture.getContext() as unknown as CanvasRenderingContext2D;
    const {width,height}=this.panelTexture.getSize();
    ctx.fillStyle='#1e293b';ctx.fillRect(0,0,width,height);
    ctx.fillStyle='#f1f5f9';
    lines.slice(0,3).forEach((line,i)=>{ctx.font=i===0?'bold 64px sans-serif':'50px sans-serif';ctx.fillText(line,28,70+i*82,width-56)});
    this.panelTexture.update(true);
  }

  /** The menu panel straight ahead: a title and lines, or null to hide it. */
  setMenu(lines:string[]|null):void{
    const text=lines?lines.join('\n'):'';
    if(text===this.menuText)return;
    this.menuText=text;
    this.menu.setEnabled(this.visible&&!!lines);
    if(!lines)return;
    const {width,height}=this.menuTexture.getSize();
    const ctx=this.menuTexture.getContext() as unknown as CanvasRenderingContext2D;
    // The panel is only as tall as what it says (its top stays put: lines line up with buttons beside them): the
    // plane is shortened and shows just the top of the texture.
    const used=Math.min(height,MENU.first+(lines.length-1)*MENU.step+MENU.linePx*.6+28),k=used/height;
    this.menu.scaling.y=k;
    this.menu.position.y=this.menuTop-MENU.h*k/2;
    this.menuTexture.vScale=k;this.menuTexture.vOffset=1-k;
    ctx.fillStyle='#1e293b';ctx.fillRect(0,0,width,height);
    ctx.strokeStyle='#94a3b8';ctx.lineWidth=8;ctx.strokeRect(4,4,width-8,used-8);
    lines.forEach((line,i)=>{
      ctx.fillStyle=i===0?'#fbbf24':'#f1f5f9';
      ctx.font=i===0?`bold ${MENU.titlePx}px sans-serif`:`${MENU.linePx}px sans-serif`;
      ctx.fillText(line,40,MENU.first+i*MENU.step,width-80);
    });
    this.menuTexture.update(true);
  }

  /** Calibration alignment targets (far and near crosses straight ahead of the head). */
  showTargets(on:boolean):void{
    this.targets=on;
    this.farTarget.setEnabled(this.visible&&on);
    this.nearTarget.setEnabled(this.visible&&on);
  }

  /**
   * Moves the reticle (and targets) with the head and advances the gaze
   * dwell. Returns the id of an item that has just been looked at for its
   * dwell time.
   */
  update(dt:number,head:HeadBasis):string|null{
    const o=new Vector3(this.eye.x,this.eye.y,this.eye.z),d=new Vector3(head.forward.x,head.forward.y,head.forward.z),u=new Vector3(head.up.x,head.up.y,head.up.z);
    this.reticle.position.copyFrom(o.add(d.scale(.6)));
    Quaternion.FromLookDirectionRHToRef(d,u,this.reticle.rotationQuaternion!);
    if(this.targets){
      this.farTarget.position.copyFrom(o.add(d.scale(40)));
      Quaternion.FromLookDirectionRHToRef(d,u,this.farTarget.rotationQuaternion!);
      this.nearTarget.position.copyFrom(o.add(d.scale(.9)));
      Quaternion.FromLookDirectionRHToRef(d,u,this.nearTarget.rotationQuaternion!);
    }
    let hit:Placed|null=null;
    for(const b of this.items){
      const den=Vector3.Dot(d,b.normal);
      if(den>-1e-3)continue;
      const t=Vector3.Dot(b.centre.subtract(o),b.normal)/den;
      if(t<=0)continue;
      const p=o.add(d.scale(t)).subtract(b.centre);
      if(Math.abs(Vector3.Dot(p,b.right))<=b.w/2&&Math.abs(Vector3.Dot(p,b.up))<=b.h/2){hit=b;break}
    }
    if(hit!==this.gazed){this.gazed=hit;this.dwell=0}
    let fired:string|null=null;
    if(hit){
      this.dwell+=dt;
      if(this.dwell>=hit.dwell){fired=hit.id;this.dwell=-1e9}
    }
    this.reticleMaterial.emissiveColor.set(1,hit?.75:1,hit?.2:1);
    for(const b of this.items)this.draw(b,b===hit?Math.max(0,Math.min(1,this.dwell/b.dwell)):0);
    return fired;
  }

  /** What is being looked at and how far through its dwell (0..1). */
  get gaze():{id:string|null;progress:number}{
    return {id:this.gazed?.id??null,progress:this.gazed?Math.max(0,Math.min(1,this.dwell/this.gazed.dwell)):0};
  }

  private draw(b:Placed,progress:number):void{
    const lit=this.lit.has(b.id);
    const key=`${lit}|${Math.round(progress*20)}|${b.label}`;
    if(key===b.drawn)return;
    b.drawn=key;
    const ctx=b.texture.getContext() as unknown as CanvasRenderingContext2D;
    const {width,height}=b.texture.getSize();
    ctx.fillStyle=lit?'#0f766e':'#1e293b';ctx.fillRect(0,0,width,height);
    if(progress>0){ctx.fillStyle='#f59e0b';ctx.fillRect(0,height-20,width*progress,20)}
    ctx.strokeStyle='#94a3b8';ctx.lineWidth=10;ctx.strokeRect(5,5,width-10,height-10);
    // (A one-character label, − or +, fills its button.)
    ctx.fillStyle='#f8fafc';ctx.font=`bold ${Math.round(b.label.length<=1?height*.85:Math.min(height*.5,96))}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(b.label,width/2,height/2-4,width-28);
    b.texture.update(true);
  }

  dispose():void{
    for(const m of [this.panel,this.menu,this.reticle,this.farTarget,this.nearTarget])m.dispose(false,true);
    for(const i of this.items)i.mesh.dispose(false,true);
  }
}
