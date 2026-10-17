import {Color3,CreateDisc,CreatePlane,DynamicTexture,Mesh,Quaternion,StandardMaterial,Vector3,type Scene,type TransformNode} from '../engine/babylon';
import type {Vec3} from '../contracts';
import type {HeadBasis} from './headOrientation';

/**
 * What the driver sees and uses inside the headset, where the touch screen
 * cannot be reached: a status panel on the dashboard, a reticle in the middle
 * of the view, and gaze buttons (look at one for a moment to press it).
 * Everything is in vehicle-local coordinates, parented to the car.
 */
export type ViewerCommand='start'|'go'|'stop'|'signal-left'|'signal-right'|'recentre';

interface Button{command:ViewerCommand;label:string;mesh:Mesh;texture:DynamicTexture;centre:Vector3;normal:Vector3;right:Vector3;up:Vector3;w:number;h:number;drawn:string}

/** Gaze button row on the dashboard (vehicle-local metres): first button's x, spacing, height, depth. */
export const VIEWER_BUTTON_ROW={x0:-.55,step:.16,y:.99,z:-.76};

/** Time a gaze button must be looked at to press it, seconds. */
export const GAZE_DWELL=.9;

export class ViewerHud{
  private readonly buttons:Button[]=[];
  private readonly panel:Mesh;
  private readonly panelTexture:DynamicTexture;
  private readonly reticle:Mesh;
  private readonly reticleMaterial:StandardMaterial;
  private panelText='';
  private gazed:Button|null=null;
  private dwell=0;
  /** Lit state per button (Go while moving on, Stop while holding, signals while on). */
  private lit=new Map<ViewerCommand,boolean>();

  constructor(scene:Scene,parent:TransformNode,private readonly eye:Vec3){
    const eyeV=new Vector3(eye.x,eye.y,eye.z);
    const facing=(mesh:Mesh,centre:Vector3)=>{
      // Plane faces the eye: its normal points from the plane towards the eye.
      const n=eyeV.subtract(centre).normalize();
      mesh.rotationQuaternion=Quaternion.FromLookDirectionRH(n.scale(-1),Vector3.Up());
      const right=Vector3.Cross(Vector3.Up(),n).normalize().scale(-1);
      return {normal:n,right,up:Vector3.Cross(n,right).normalize().scale(-1)};
    };
    const material=(name:string,texture:DynamicTexture)=>{
      const m=new StandardMaterial(name,scene);
      m.diffuseTexture=texture;
      m.emissiveTexture=texture;
      m.disableLighting=true;
      m.backFaceCulling=false;
      return m;
    };

    // Status panel on top of the dashboard, left of the steering wheel.
    this.panelTexture=new DynamicTexture('viewer-panel',{width:640,height:160},scene,true);
    this.panel=CreatePlane('viewer-panel',{width:.44,height:.11},scene);
    this.panel.parent=parent;
    const pc=new Vector3(-.2,1.075,-1.0);
    this.panel.position.copyFrom(pc);
    facing(this.panel,pc);
    this.panel.material=material('viewer-panel',this.panelTexture);

    // Gaze buttons in a row on the dashboard, below the panel.
    const row:Array<[ViewerCommand,string]>=[['signal-left','◀ Signal'],['stop','Stop'],['go','Go'],['signal-right','Signal ▶'],['recentre','Recentre']];
    row.forEach(([command,label],i)=>this.addButton(scene,parent,command,label,new Vector3(VIEWER_BUTTON_ROW.x0+i*VIEWER_BUTTON_ROW.step,VIEWER_BUTTON_ROW.y,VIEWER_BUTTON_ROW.z),.15,.07,facing,material));
    // Straight ahead, only before the exercise starts.
    this.addButton(scene,parent,'start','Start',new Vector3(eye.x,eye.y-.02,eye.z-1.2),.2,.08,facing,material);

    // Reticle: drawn over everything, about 0.6 m in front of the eyes.
    this.reticle=CreateDisc('viewer-reticle',{radius:.004,tessellation:16,sideOrientation:Mesh.DOUBLESIDE},scene);
    this.reticle.parent=parent;
    this.reticle.renderingGroupId=1;
    this.reticleMaterial=new StandardMaterial('viewer-reticle',scene);
    this.reticleMaterial.emissiveColor=new Color3(1,1,1);
    this.reticleMaterial.disableLighting=true;
    this.reticle.material=this.reticleMaterial;
    this.reticle.rotationQuaternion=new Quaternion();
    this.setVisible(false);
  }

  private addButton(scene:Scene,parent:TransformNode,command:ViewerCommand,label:string,centre:Vector3,w:number,h:number,
    facing:(m:Mesh,c:Vector3)=>{normal:Vector3;right:Vector3;up:Vector3},material:(n:string,t:DynamicTexture)=>StandardMaterial){
    const texture=new DynamicTexture(`viewer-button-${command}`,{width:256,height:Math.round(256*h/w)},scene,true);
    const mesh=CreatePlane(`viewer-button-${command}`,{width:w,height:h},scene);
    mesh.parent=parent;
    mesh.position.copyFrom(centre);
    const axes=facing(mesh,centre);
    mesh.material=material(`viewer-button-${command}`,texture);
    this.buttons.push({command,label,mesh,texture,centre,...axes,w,h,drawn:''});
  }

  setVisible(on:boolean):void{
    this.panel.setEnabled(on);
    this.reticle.setEnabled(on);
    for(const b of this.buttons)b.mesh.setEnabled(on&&b.command!=='start');
    if(!on){this.gazed=null;this.dwell=0}
  }

  /** Before the exercise begins: driving buttons hidden; the Start button shown once `ready`. After: the reverse. */
  setStarting(starting:boolean,ready=false):void{
    for(const b of this.buttons){
      const on=b.command==='start'?starting&&ready:!starting;
      if(b.mesh.isEnabled()!==on)b.mesh.setEnabled(on);
    }
  }

  setLit(command:ViewerCommand,on:boolean):void{this.lit.set(command,on)}

  /** Status text, one line per entry (redrawn only when it changes). */
  setStatus(lines:string[]):void{
    const text=lines.join('\n');
    if(text===this.panelText)return;
    this.panelText=text;
    const ctx=this.panelTexture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.fillStyle='#0f172a';ctx.fillRect(0,0,640,160);
    ctx.fillStyle='#e2e8f0';
    lines.slice(0,3).forEach((line,i)=>{ctx.font=i===0?'bold 44px sans-serif':'30px sans-serif';ctx.fillText(line,18,48+i*50,604)});
    this.panelTexture.update(true);
  }

  /**
   * Moves the reticle with the head and advances the gaze dwell. Returns the
   * command whose button has just been looked at for GAZE_DWELL seconds.
   */
  update(dt:number,head:HeadBasis):ViewerCommand|null{
    const o=new Vector3(this.eye.x,this.eye.y,this.eye.z),d=new Vector3(head.forward.x,head.forward.y,head.forward.z);
    this.reticle.position.copyFrom(o.add(d.scale(.6)));
    Quaternion.FromLookDirectionRHToRef(d,new Vector3(head.up.x,head.up.y,head.up.z),this.reticle.rotationQuaternion!);
    let hit:Button|null=null;
    for(const b of this.buttons){
      if(!b.mesh.isEnabled())continue;
      const den=Vector3.Dot(d,b.normal);
      if(den>-1e-3)continue;
      const t=Vector3.Dot(b.centre.subtract(o),b.normal)/den;
      if(t<=0)continue;
      const p=o.add(d.scale(t)).subtract(b.centre);
      if(Math.abs(Vector3.Dot(p,b.right))<=b.w/2&&Math.abs(Vector3.Dot(p,b.up))<=b.h/2){hit=b;break}
    }
    if(hit!==this.gazed){this.gazed=hit;this.dwell=0}
    let fired:ViewerCommand|null=null;
    if(hit){
      this.dwell+=dt;
      if(this.dwell>=GAZE_DWELL){fired=hit.command;this.dwell=-1e9}
    }
    this.reticleMaterial.emissiveColor.set(hit?1:1,hit?.75:1,hit?.2:1);
    for(const b of this.buttons)this.drawButton(b,b===hit?Math.max(0,Math.min(1,this.dwell/GAZE_DWELL)):0);
    return fired;
  }

  /** What is being looked at and how far through the dwell (0..1), for tests and diagnostics. */
  get gaze():{command:ViewerCommand|null;progress:number}{
    return {command:this.gazed?.command??null,progress:this.gazed?Math.max(0,Math.min(1,this.dwell/GAZE_DWELL)):0};
  }

  private drawButton(b:Button,progress:number):void{
    const lit=this.lit.get(b.command)??false;
    const key=`${lit}|${Math.round(progress*20)}`;
    if(key===b.drawn)return;
    b.drawn=key;
    const ctx=b.texture.getContext() as unknown as CanvasRenderingContext2D;
    const {width,height}=b.texture.getSize();
    ctx.fillStyle=lit?'#0f766e':'#1e293b';ctx.fillRect(0,0,width,height);
    if(progress>0){ctx.fillStyle='#f59e0b';ctx.fillRect(0,height-14,width*progress,14)}
    ctx.strokeStyle='#94a3b8';ctx.lineWidth=6;ctx.strokeRect(3,3,width-6,height-6);
    ctx.fillStyle='#f8fafc';ctx.font=`bold ${Math.round(height*.42)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(b.label,width/2,height/2-4,width-16);
    b.texture.update(true);
  }

  dispose():void{
    this.panel.dispose(false,true);
    this.reticle.dispose(false,true);
    for(const b of this.buttons)b.mesh.dispose(false,true);
  }
}

/** Game controller (Gamepad API, standard mapping): held controls and button presses. */
export class ViewerGamepad{
  private previous:boolean[]=[];
  connected=false;
  name='';

  /** Reads the first connected controller. */
  read():{throttle:boolean;brake:boolean;steer:number;pressed:ViewerCommand[];pause:boolean}{
    const pads=typeof navigator!=='undefined'&&navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean) as Gamepad[]:[];
    const pad=pads[0];
    this.connected=!!pad;
    this.name=pad?.id??'';
    if(!pad)return {throttle:false,brake:false,steer:0,pressed:[],pause:false};
    const down=(i:number)=>!!pad.buttons[i]?.pressed||(pad.buttons[i]?.value??0)>.3;
    const now=pad.buttons.map((_,i)=>down(i));
    const edge=(i:number)=>!!now[i]&&!this.previous[i];
    const pressed:ViewerCommand[]=[];
    // LB / D-pad left: signal left; RB / D-pad right: signal right; Y: recentre.
    if(edge(4)||edge(14))pressed.push('signal-left');
    if(edge(5)||edge(15))pressed.push('signal-right');
    if(edge(3))pressed.push('recentre');
    // Any face button or trigger also confirms Start.
    if([0,1,2,6,7].some(edge))pressed.push('start');
    const pause=edge(9);
    this.previous=now;
    const x=pad.axes[0]??0;
    // RT or A: go (accelerate while held); LT or B: brake.
    return {throttle:down(7)||down(0),brake:down(6)||down(1),steer:Math.abs(x)>.35?Math.sign(x):0,pressed,pause};
  }
}
