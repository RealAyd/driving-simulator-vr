import {phraseFile,sentences} from '../audio/phrases';

/**
 * The examiner's (and instructor's) voice: recorded clips in a British neural voice (Azure's Sonia,
 * tools/voice/make_voice.mjs) played through the car's sound, and the browser's speech synthesis for any sentence
 * without a clip (or when the sound cannot play), with the best British voice the device has. Every direction is
 * also shown on screen (the HUD task box), so a muted phone loses nothing. Browsers play sound only after a tap, so
 * `unlock` is called from the first taps (as for the other sounds).
 */
export class ExaminerVoice{
  private unlocked=false;
  private voice:SpeechSynthesisVoice|null=null;
  /** Off: directions are shown, not spoken (follows the HUD sound button). */
  muted=false;
  /** The car's sound, when it is playing: clips are played through it. */
  audio:()=>AudioContext|null=()=>null;
  /** Called after each sentence is spoken (the car's sound is resumed then: on iPhone speech can pause it). */
  onSpoken:()=>void=()=>{};

  /** Clip files there are (from voice/index.json), and the recorded voice's name. */
  private clips=new Set<string>();
  private clipVoice='';
  /** Clips already downloaded (encoded; small), decoded each time they are played. */
  private readonly bytes=new Map<string,Promise<ArrayBuffer>>();
  /** Sentences waiting, and a count that changes when they are dropped (a new instruction). */
  private waiting:string[]=[];
  private generation=0;
  private busy=false;
  private source:AudioBufferSourceNode|null=null;
  /** Utterance being spoken (kept referenced: some browsers drop the end event of a collected one). */
  private utterance:SpeechSynthesisUtterance|null=null;

  private get synth():SpeechSynthesis|null{return (globalThis as {speechSynthesis?:SpeechSynthesis}).speechSynthesis??null}

  private pickVoice(){
    const voices=(this.synth?.getVoices()??[]).filter(v=>v.lang.replace('_','-').toLowerCase().startsWith('en-gb'));
    // The most natural British voice the device has: neural / premium / enhanced ones first (Edge "Sonia Online
    // (Natural)", Apple "Serena (Premium)", "Daniel (Enhanced)"), then Google's UK voice, then any British voice.
    const score=(v:SpeechSynthesisVoice)=>(/natural|neural|premium/i.test(v.name)?40:0)+(/enhanced/i.test(v.name)?30:0)
      +(/Sonia|Libby|Serena|Daniel|Kate|Arthur|Martha|Ryan|Google UK/i.test(v.name)?10:0)+(v.localService?1:0);
    this.voice=voices.sort((a,b)=>score(b)-score(a))[0]
      ??(this.synth?.getVoices()??[]).find(v=>v.lang.startsWith('en'))??null;
  }

  /** The voice in use. */
  get voiceName():string{return this.clipVoice||this.voice?.name||'the device\'s default voice'}

  /** Loads the list of recorded clips (none: the device speaks everything). */
  async loadClips(base='voice/'):Promise<void>{
    try{
      const r=await fetch(`${base}index.json`);
      if(!r.ok)return;
      const index=await r.json() as {voice?:string;files?:string[]};
      this.clips=new Set(index.files??[]);
      this.clipVoice=index.voice??'';
    }catch{/* no clips */}
  }

  /** Call from a tap: a silent utterance lets later ones play (iPhone). */
  unlock():void{
    const synth=this.synth;
    if(this.unlocked||!synth)return;
    this.unlocked=true;
    this.pickVoice();
    synth.addEventListener?.('voiceschanged',()=>this.pickVoice());
    const u=new SpeechSynthesisUtterance(' ');u.volume=0;
    synth.speak(u);
  }

  /** Speaks `text`: instead of anything being said, or after it (`queue`, for an instructor's follow-up words). */
  say(text:string,queue=false):void{
    if(this.muted||!text||(!this.synth&&this.clips.size===0))return;
    if(!queue)this.stop();
    // Sentence by sentence: each has its own clip, and some browsers cut off an utterance after about 15 seconds.
    this.waiting.push(...sentences(text));
    if(!this.busy)void this.run();
  }

  stop():void{
    this.generation++;
    this.waiting=[];this.busy=false;
    try{this.source?.stop()}catch{/* ended */}
    this.source=null;
    this.synth?.cancel();
  }

  private async run():Promise<void>{
    this.busy=true;
    const g=this.generation;
    while(this.waiting.length&&g===this.generation){
      const s=this.waiting.shift()!;
      const played=this.clips.has(phraseFile(s))&&await this.playClip(s,g).catch(()=>false);
      if(g!==this.generation)return;
      if(!played)await this.speak(s);
      if(g===this.generation)this.onSpoken();
    }
    if(g===this.generation)this.busy=false;
  }

  /** Plays a sentence's clip through the car's sound; false if it cannot (sound not running, download failed). */
  private async playClip(sentence:string,g:number):Promise<boolean>{
    const ctx=this.audio();
    if(!ctx||ctx.state!=='running')return false;
    const file=phraseFile(sentence);
    let bytes=this.bytes.get(file);
    if(!bytes){
      bytes=fetch(`voice/${file}`).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.arrayBuffer()});
      this.bytes.set(file,bytes);
      bytes.catch(()=>this.bytes.delete(file));
    }
    const buffer=await ctx.decodeAudioData((await bytes).slice(0));
    if(g!==this.generation)return true;
    return new Promise<boolean>(resolve=>{
      const src=ctx.createBufferSource();
      src.buffer=buffer;
      src.connect(ctx.destination);
      // Ended, stopped, or (the context suspended by the phone) given up on after the clip's length and a margin.
      const timer=setTimeout(()=>{try{src.stop()}catch{/* ended */}resolve(true)},buffer.duration*1000+1500);
      src.onended=()=>{clearTimeout(timer);if(this.source===src)this.source=null;resolve(true)};
      this.source=src;
      src.start();
    });
  }

  /** Speaks a sentence with the device's voice; resolves when it is said (or after a time, if the phone stalls). */
  private speak(sentence:string):Promise<void>{
    const synth=this.synth;
    if(!synth)return Promise.resolve();
    return new Promise<void>(resolve=>{
      const u=new SpeechSynthesisUtterance(sentence);
      if(this.voice)u.voice=this.voice;
      u.lang=this.voice?.lang??'en-GB';
      u.rate=.97;
      // Stuck (some phones stop speaking after an interruption without saying so): given up on and cancelled.
      const timer=setTimeout(()=>{synth.cancel();finish()},3000+sentence.length*120);
      const finish=()=>{clearTimeout(timer);if(this.utterance===u)this.utterance=null;resolve()};
      u.onend=finish;u.onerror=finish;
      this.utterance=u;
      synth.speak(u);
      // A paused synthesiser (iPhone after the screen was locked) does not speak until resumed.
      if(synth.paused)synth.resume();
    });
  }
}
