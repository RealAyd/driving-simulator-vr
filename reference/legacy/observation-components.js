// REFERENCE ONLY. A-Frame-dependent; do not import into the new renderer.
AFRAME.registerComponent('blind-spot-tracker',{
  init(){
    this.camera=null;
    this.carQuaternion=new THREE.Quaternion();
    this.cameraQuaternion=new THREE.Quaternion();
    this.relative=new THREE.Quaternion();
    this.forward=new THREE.Vector3();
    this.currentSide=null;
    this.enteredAt=0;
    this.confirmed=false;
  },
  tick(){
    if(!active)return;
    if(!this.camera)this.camera=byId('camera');
    if(!this.camera)return;
    this.el.object3D.getWorldQuaternion(this.carQuaternion);
    this.camera.object3D.getWorldQuaternion(this.cameraQuaternion);
    this.relative.copy(this.carQuaternion).invert().multiply(this.cameraQuaternion);
    this.forward.set(0,0,-1).applyQuaternion(this.relative);
    const yaw=THREE.MathUtils.radToDeg(Math.atan2(-this.forward.x,-this.forward.z));
    const rhd=(COUNTRIES[activeCountryCode]||COUNTRIES.GB).drive==='RHD';
    const rightLimit=rhd?90:110;
    const leftLimit=rhd?110:90;
    const side=yaw< -rightLimit?'right':yaw>leftLimit?'left':null;
    if(side!==this.currentSide){
      this.currentSide=side;
      this.enteredAt=performance.now();
      this.confirmed=false;
    }
    if(side&&!this.confirmed&&performance.now()-this.enteredAt>=400){
      this.confirmed=true;
      this.el.emit('driver-blind-check',{side,at:performance.now()},false);
      toast('Blind Spot Checked · '+(side==='right'?'Right':'Left'));
    }
  }
});

AFRAME.registerComponent('mirror-gaze',{
 schema:{label:{default:'Mirror'},side:{default:'rear'}},
 init(){
   this.timer=null;
   this.inView=()=>{
     clearTimeout(this.timer);
     this.timer=setTimeout(()=>{
       toast('Mirror Checked · '+this.data.label);
       // Mirror event bubbles from the panel to the car's turn-signals
       // component, storing a direction and monotonic observation timestamp.
       this.el.emit('driver-mirror-check',{
         side:this.data.side,at:performance.now()
       },true);
     },480);
   };
   this.outView=()=>clearTimeout(this.timer);
   this.el.addEventListener('mouseenter',this.inView);
   this.el.addEventListener('mouseleave',this.outView);
 },
 remove(){
   clearTimeout(this.timer);
   this.el.removeEventListener('mouseenter',this.inView);
   this.el.removeEventListener('mouseleave',this.outView);
 }
});
