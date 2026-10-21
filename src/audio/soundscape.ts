/**
 * Sound, made in the browser (Web Audio, no recordings): the learner car's engine and tyre noise, road users
 * nearby (each heard from where it is, louder as it comes closer), collisions and the indicator's tick.
 * Display only: nothing here affects driving or assessment. Browsers start audio only after a tap, so `unlock`
 * is called from the Start and Resume buttons.
 */

export interface LearnerSound{
  /** m/s, negative when reversing. */
  speed:number;
  throttle:number;
  brake:number;
}
export interface RoadUserSound{id:string;kind:'car'|'bus';x:number;z:number;speed:number}
/** Where the driver's ears are: position and heading (radians, clockwise from north). */
export interface Listener{x:number;z:number;heading:number}

interface Voice{osc:OscillatorNode;sub:OscillatorNode;noise:AudioBufferSourceNode;filter:BiquadFilterNode;roar:GainNode;gain:GainNode;pan:StereoPannerNode;seen:boolean}

const MUTE_KEY='driving-practice-muted';
/** Road users further away than this are silent (metres). */
const AUDIBLE=70;

export class Soundscape{
  private ctx:AudioContext|null=null;
  private master!:GainNode;
  private noiseBuffer!:AudioBuffer;
  private engine:{osc:OscillatorNode;lfo:OscillatorNode;filter:BiquadFilterNode;gain:GainNode;roar:GainNode;roarFilter:BiquadFilterNode;rumble:GainNode}|null=null;
  /** A car engine's timbre: the firing note and its first few harmonics, soft (a raw sawtooth sounds like a moped). */
  private engineWave!:PeriodicWave;
  private readonly voices=new Map<string,Voice>();
  private wasLit=false;
  muted:boolean;

  constructor(){
    let stored:string|null=null;
    try{stored=localStorage.getItem(MUTE_KEY)}catch{/* private browsing: sound on */}
    this.muted=stored==='1';
  }

  /** Starts audio (call from a tap). Safe to call again. */
  async unlock():Promise<void>{
    try{
      if(!this.ctx){
        const Context=(globalThis as unknown as {AudioContext?:typeof AudioContext;webkitAudioContext?:typeof AudioContext}).AudioContext
          ??(globalThis as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
        if(!Context)return;
        this.ctx=new Context();
        this.build(this.ctx);
      }
      // iPhone: play as media, so the ring/silent switch does not mute the car (Safari 16.4+), and a silent sound
      // through an <audio> element in the same tap does the same on older versions.
      const session=(navigator as unknown as {audioSession?:{type:string}}).audioSession;
      if(session&&session.type!=='playback')session.type='playback';
      if(!this.primed){
        this.primed=true;
        const silent=new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
        silent.setAttribute('playsinline','');
        void silent.play().catch(()=>{});
      }
      // A one-sample sound started inside the tap is what lets Safari start the audio graph.
      const kick=this.ctx.createBufferSource();kick.buffer=this.ctx.createBuffer(1,1,22050);kick.connect(this.ctx.destination);kick.start(0);
      if(this.ctx.state!=='running')await this.ctx.resume();
    }catch{/* no audio on this device */}
  }
  private primed=false;

  private build(ctx:AudioContext):void{
    this.master=ctx.createGain();
    this.master.gain.value=this.muted?0:.9;
    // A gentle limiter so a crash on top of the engine never clips.
    const limiter=ctx.createDynamicsCompressor();
    limiter.threshold.value=-10;limiter.ratio.value=8;
    this.master.connect(limiter).connect(ctx.destination);
    // Two seconds of noise, looped: tyres on tarmac, wind, the crash.
    this.noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
    const data=this.noiseBuffer.getChannelData(0);
    let brown=0;
    for(let i=0;i<data.length;i++){brown=(brown+.02*(Math.random()*2-1))/1.02;data[i]=brown*3.5}

    const harmonics=[0,.35,1,.55,.4,.18,.1,.05];
    this.engineWave=ctx.createPeriodicWave(new Float32Array(harmonics.length),new Float32Array(harmonics));

    // The learner's engine, heard from inside the car: a smooth four-cylinder hum, pulsing gently at the firing rate,
    // through a filter that opens with the accelerator; a low rumble under load.
    const osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    osc.setPeriodicWave(this.engineWave);
    filter.type='lowpass';filter.Q.value=.7;
    gain.gain.value=0;
    const am=ctx.createGain();am.gain.value=.8;
    const lfo=ctx.createOscillator(),lfoDepth=ctx.createGain();lfo.type='sine';lfoDepth.gain.value=.2;
    lfo.connect(lfoDepth).connect(am.gain);
    osc.connect(am).connect(filter).connect(gain).connect(this.master);
    const rumbleSrc=ctx.createBufferSource();rumbleSrc.buffer=this.noiseBuffer;rumbleSrc.loop=true;
    const rumbleFilter=ctx.createBiquadFilter();rumbleFilter.type='lowpass';rumbleFilter.frequency.value=160;
    const rumble=ctx.createGain();rumble.gain.value=0;
    rumbleSrc.connect(rumbleFilter).connect(rumble).connect(this.master);
    const noise=ctx.createBufferSource();noise.buffer=this.noiseBuffer;noise.loop=true;
    const roarFilter=ctx.createBiquadFilter();roarFilter.type='bandpass';roarFilter.Q.value=.6;
    const roar=ctx.createGain();roar.gain.value=0;
    noise.connect(roarFilter).connect(roar).connect(this.master);
    osc.start();lfo.start();noise.start();rumbleSrc.start(0,.7);
    this.engine={osc,lfo,filter,gain,roar,roarFilter,rumble};
  }

  get running():boolean{return this.ctx?.state==='running'}

  setMuted(muted:boolean):void{
    this.muted=muted;
    try{localStorage.setItem(MUTE_KEY,muted?'1':'0')}catch{/* not kept */}
    if(this.ctx)this.master.gain.setTargetAtTime(muted?0:.9,this.ctx.currentTime,.05);
  }

  /** Silences everything (paused, menus) or brings it back. */
  setActive(active:boolean):void{
    if(!this.ctx)return;
    if(active&&this.ctx.state==='suspended')void this.ctx.resume();
    if(!active&&this.ctx.state==='running')void this.ctx.suspend();
  }

  /** Once a frame while driving. */
  update(car:LearnerSound,users:RoadUserSound[],listener:Listener,indicatorLit:boolean):void{
    const ctx=this.ctx;
    if(!ctx||ctx.state!=='running'||!this.engine)return;
    const t=ctx.currentTime,e=this.engine;
    const speed=Math.abs(car.speed);
    // Engine speed: idle at 800 rpm, rising through each gear (changing up at about 2,500 rpm, as a learner would)
    // and easing down at each change.
    const gearTop=[0,4.5,9,14,20,40];
    let gear=1;while(gear<gearTop.length-1&&speed>gearTop[gear]!)gear++;
    const within=(speed-gearTop[gear-1]!)/(gearTop[gear]!-gearTop[gear-1]!);
    const rpm=car.speed<0?1000+speed*350:speed<.3?800+car.throttle*500:1300+Math.min(1,within)*1200+car.throttle*250;
    // The firing rate of a four-cylinder engine (two firings a revolution), an octave up: phone speakers cannot play
    // the true 25–90 Hz, and the harmonics carry the character anyway.
    const f=rpm/60*2*2;
    e.osc.frequency.setTargetAtTime(f,t,.25);
    e.lfo.frequency.setTargetAtTime(rpm/60*2,t,.25);
    e.filter.frequency.setTargetAtTime(300+car.throttle*500+rpm*.08,t,.2);
    e.gain.gain.setTargetAtTime(.07+car.throttle*.05,t,.2);
    e.rumble.gain.setTargetAtTime(.12+car.throttle*.25,t,.2);
    // Tyres and wind grow with speed.
    e.roarFilter.frequency.setTargetAtTime(300+speed*25,t,.2);
    e.roar.gain.setTargetAtTime(Math.min(.6,speed*speed*.0012+speed*.012),t,.2);

    // Road users: one voice each while in earshot.
    for(const v of this.voices.values())v.seen=false;
    const fx=Math.sin(listener.heading),fz=-Math.cos(listener.heading);
    for(const u of users){
      const dx=u.x-listener.x,dz=u.z-listener.z,d=Math.hypot(dx,dz);
      if(d>AUDIBLE)continue;
      const v=this.voices.get(u.id)??this.voice(ctx,u);
      v.seen=true;
      const right=(dx*-fz+dz*fx)/(d||1);
      // Inside the car other traffic is muffled: quieter and duller than our own engine.
      const near=1/(1+(d/7)**2);
      const s=Math.abs(u.speed);
      const bus=u.kind==='bus';
      const hz=(bus?60:84)+s*(bus?3:4.5);
      v.osc.frequency.setTargetAtTime(hz,t,.25);
      v.sub.frequency.setTargetAtTime(hz/2,t,.25);
      v.filter.frequency.setTargetAtTime(240+s*20,t,.2);
      v.gain.gain.setTargetAtTime((bus?.12:.07)*near,t,.1);
      v.roar.gain.setTargetAtTime(Math.min(.6,s*.05)*near,t,.1);
      v.pan.pan.setTargetAtTime(Math.max(-.9,Math.min(.9,right)),t,.1);
    }
    for(const [id,v] of this.voices)if(!v.seen){
      v.gain.gain.setTargetAtTime(0,t,.2);v.roar.gain.setTargetAtTime(0,t,.2);
      const stopAt=t+1;
      for(const n of [v.osc,v.sub,v.noise])n.stop(stopAt);
      this.voices.delete(id);
    }

    // The indicator relay: a click as the lamp lights and a softer one as it goes out.
    if(indicatorLit!==this.wasLit){this.click(indicatorLit?1:.6);this.wasLit=indicatorLit}
  }

  private voice(ctx:AudioContext,u:RoadUserSound):Voice{
    const osc=ctx.createOscillator(),sub=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),pan=ctx.createStereoPanner();
    osc.setPeriodicWave(this.engineWave);sub.type='sine';
    filter.type='lowpass';filter.Q.value=.7;
    gain.gain.value=0;
    osc.connect(filter);sub.connect(filter);filter.connect(gain).connect(pan).connect(this.master);
    const noise=ctx.createBufferSource();noise.buffer=this.noiseBuffer;noise.loop=true;
    noise.loopStart=Math.random()*1.5;
    const band=ctx.createBiquadFilter();band.type='lowpass';band.frequency.value=u.kind==='bus'?500:700;
    const roar=ctx.createGain();roar.gain.value=0;
    noise.connect(band).connect(roar).connect(pan);
    osc.start();sub.start();noise.start(0,Math.random()*1.5);
    const v={osc,sub,noise,filter,roar,gain,pan,seen:true};
    this.voices.set(u.id,v);
    return v;
  }

  private click(level:number):void{
    const ctx=this.ctx!;
    const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
    o.type='square';o.frequency.value=level>.8?1500:1150;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05*level,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+.03);
    o.connect(g).connect(this.master);o.start(t);o.stop(t+.04);
  }

  /** A crash: a dull thump and crunch, louder the faster the impact (m/s). */
  collision(speed:number):void{
    const ctx=this.ctx;
    if(!ctx||ctx.state!=='running')return;
    const t=ctx.currentTime,level=Math.min(1,.35+Math.abs(speed)/10);
    const thump=ctx.createOscillator(),tg=ctx.createGain();
    thump.type='sine';thump.frequency.setValueAtTime(95,t);thump.frequency.exponentialRampToValueAtTime(38,t+.35);
    tg.gain.setValueAtTime(.9*level,t);tg.gain.exponentialRampToValueAtTime(.001,t+.45);
    thump.connect(tg).connect(this.master);thump.start(t);thump.stop(t+.5);
    const crunch=ctx.createBufferSource();crunch.buffer=this.noiseBuffer;
    const hp=ctx.createBiquadFilter();hp.type='bandpass';hp.frequency.value=1800;hp.Q.value=.7;
    const cg=ctx.createGain();cg.gain.setValueAtTime(1.6*level,t);cg.gain.exponentialRampToValueAtTime(.001,t+.6);
    crunch.connect(hp).connect(cg).connect(this.master);crunch.start(t,Math.random());crunch.stop(t+.7);
  }

  /** Quiet: the car's engine and every road user fade out (end of an attempt, back to the menu). */
  hush():void{
    const ctx=this.ctx;
    if(!ctx||!this.engine)return;
    const t=ctx.currentTime;
    this.engine.gain.gain.setTargetAtTime(0,t,.1);this.engine.roar.gain.setTargetAtTime(0,t,.1);this.engine.rumble.gain.setTargetAtTime(0,t,.1);
    for(const v of this.voices.values()){v.gain.gain.setTargetAtTime(0,t,.1);v.roar.gain.setTargetAtTime(0,t,.1)}
  }

  /** Diagnostics: whether audio runs, and the road users being heard. */
  get stats(){return {state:this.ctx?.state??'not started',muted:this.muted,voices:[...this.voices.keys()]}}

  dispose():void{void this.ctx?.close()}
}
