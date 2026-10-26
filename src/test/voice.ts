import {phraseFile,sentences} from '../audio/phrases';

/**
 * The examiner's and the instructor's voice: recorded clips in British neural voices (Azure's Ryan for the examiner,
 * Sonia for the instructor: tools/voice/make_voice.mjs) played through the car's sound, and the browser's speech synthesis for any sentence
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

  /** Recorded voices by folder: the clip files there are (from its index.json), and the voice's name. */
  private readonly sets=new Map<string,{files:Set<string>;voice:string}>();
  /** The folder of the recorded voice speaking (`use`). */
  private base='voice/';
  /** Clips already downloaded (encoded; small; by path), decoded each time they are played. */
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

  private get clips():Set<string>{return this.sets.get(this.base)?.files??new Set()}

  /** The voice in use. */
  get voiceName():string{return this.sets.get(this.base)?.voice||this.voice?.name||'the device\'s default voice'}

  /** Loads the list of clips recorded in a folder (none: the device speaks everything). */
  async loadClips(base='voice/'):Promise<void>{
    try{
      const r=await fetch(`${base}index.json`);
      if(!r.ok)return;
      const index=await r.json() as {voice?:string;files?:string[]};
      this.sets.set(base,{files:new Set(index.files??[]),voice:index.voice??''});
      if(this.inUse&&base===this.base)this.prefetch();
    }catch{/* no clips */}
  }

  /** Speaks from now on with the clips in `base` (a folder given to `loadClips`), downloading them meanwhile. */
  use(base:string):void{this.base=base;this.inUse=true;this.prefetch()}
  /** A voice has been chosen for a drive (clips are not downloaded before then). */
  private inUse=false;

  /**
   * Downloads the clips of the voice in use in the background, two at a time, so a sentence plays the moment it is
   * said rather than after a download (a second or more on a phone connection). A few MB, once (the browser keeps
   * them too).
   */
  private prefetching:string|null=null;
  private prefetch():void{
    const base=this.base,files=[...this.clips];
    if(this.prefetching===base||files.length===0)return;
    this.prefetching=base;
    let next=0;
    const one=async():Promise<void>=>{
      while(next<files.length&&this.base===base){
        const path=base+files[next++]!;
        if(this.bytes.has(path))continue;
        await this.fetchClip(path).catch(()=>{});
      }
      if(this.base!==base&&this.prefetching===base)this.prefetching=null;
    };
    void one();void one();
  }

  private fetchClip(path:string):Promise<ArrayBuffer>{
    let bytes=this.bytes.get(path);
    if(!bytes){
      bytes=fetch(path).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.arrayBuffer()});
      this.bytes.set(path,bytes);
      bytes.catch(()=>this.bytes.delete(path));
    }
    return bytes;
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

  /** Called with true while a sentence is being spoken, false after (the car's sound is turned down meanwhile). */
  onSpeaking:(speaking:boolean)=>void=()=>{};

  /** What happened to the sentences given (diagnostics: the browser checks read them). */
  readonly stats={requested:0,clips:0,device:0,dropped:0,cut:0,longestWait:0};
  /** When each waiting sentence was given (seconds, performance clock). */
  private queuedAt=new Map<string,number>();
  private clock=()=>(globalThis.performance?.now()??Date.now())/1000;
  /** Sentences queued by the instructor (follow-up words), still waiting: kept when a direction comes first. */
  private queued=new Set<string>();
  /** The sentence being spoken was queued (an instructor's words, not a direction). */
  private speakingQueued=false;

  /**
   * Speaks `text`. A direction (not `queue`) is said at once: a queued sentence being spoken is cut short, an earlier
   * direction still waiting is replaced, and the instructor's words still waiting are said after it (they are on
   * screen too). Queued words (`queue`, the instructor's) wait their turn.
   */
  say(text:string,queue=false):void{
    if(this.muted||!text||(!this.synth&&this.clips.size===0))return;
    // Sentence by sentence: each has its own clip, and some browsers cut off an utterance after about 15 seconds.
    const parts=sentences(text);
    this.stats.requested+=parts.length;
    // (The wait measured is before the first sentence of each: the rest follow it, as they should.)
    if(parts[0]&&!this.queuedAt.has(parts[0]))this.queuedAt.set(parts[0],this.clock());
    if(queue){for(const p of parts)this.queued.add(p);this.waiting.push(...parts);if(!this.busy)void this.run();return}
    const keep=this.waiting.filter(w=>this.queued.has(w));
    // Directions still waiting are replaced by the new one (said no more).
    for(const w of this.waiting)if(!this.queued.has(w)){this.stats.dropped++;this.queuedAt.delete(w)}
    if(this.busy&&this.speakingQueued){
      this.stats.cut++;
      // Cut the instructor short for the direction: restart the queue with it first.
      this.halt();
      this.waiting=[...parts,...keep];
      void this.run();
      return;
    }
    this.waiting=[...parts,...keep];
    if(!this.busy)void this.run();
  }

  /** Drops `text`'s sentences if they are still waiting (no longer true: not to be said late). */
  unsay(text:string):void{
    const parts=new Set(sentences(text));
    this.waiting=this.waiting.filter(w=>{if(!parts.has(w))return true;this.queued.delete(w);this.queuedAt.delete(w);this.stats.dropped++;return false});
  }

  /** Stops the sentence being spoken (not what is waiting). */
  private halt():void{
    this.generation++;
    this.busy=false;
    try{this.source?.stop()}catch{/* ended */}
    this.source=null;
    this.synth?.cancel();
  }

  /** Silences it at once (paused, ended, sound off). */
  stop():void{
    this.generation++;
    this.waiting=[];this.queued.clear();this.queuedAt.clear();this.busy=false;
    this.onSpeaking(false);
    try{this.source?.stop()}catch{/* ended */}
    this.source=null;
    this.synth?.cancel();
  }

  private async run():Promise<void>{
    this.busy=true;
    const g=this.generation;
    this.onSpeaking(true);
    while(this.waiting.length&&g===this.generation){
      const s=this.waiting.shift()!;
      this.speakingQueued=this.queued.delete(s);
      const given=this.queuedAt.get(s);this.queuedAt.delete(s);
      if(given!==undefined)this.stats.longestWait=Math.max(this.stats.longestWait,this.clock()-given);
      const played=this.clips.has(phraseFile(s))&&await this.playClip(s,g).catch(()=>false);
      if(played)this.stats.clips++;
      if(g!==this.generation)return;
      if(!played){this.stats.device++;await this.speak(s)}
      if(g===this.generation)this.onSpoken();
    }
    if(g===this.generation){this.busy=false;this.speakingQueued=false;this.onSpeaking(false)}
  }

  /** Plays a sentence's clip through the car's sound; false if it cannot (sound not running, download failed). */
  private async playClip(sentence:string,g:number):Promise<boolean>{
    const ctx=this.audio();
    if(!ctx||ctx.state==='closed')return false;
    // Paused by the phone (a notification, a call, another app's sound): woken, rather than the device's own voice
    // taking over (which on iPhone pauses the sound again, so the two would keep swapping).
    if(ctx.state!=='running'){
      await Promise.race([ctx.resume().catch(()=>{}),new Promise(r=>setTimeout(r,600))]);
      if((ctx.state as string)!=='running')return false;
    }
    const path=this.base+phraseFile(sentence);
    const buffer=await ctx.decodeAudioData((await this.fetchClip(path)).slice(0));
    if(g!==this.generation)return true;
    return new Promise<boolean>(resolve=>{
      const src=ctx.createBufferSource();
      src.buffer=buffer;
      src.connect(this.output(ctx));
      // Only the speech: the recordings have about 0.2 s of silence before and 0.4 s after, which made each pause
      // between sentences (a direction and the instructor's words after it) longer than a person's.
      const {from,to}=spoken(buffer);
      // Ended, stopped, or (the context suspended by the phone) given up on after the clip's length and a margin.
      const timer=setTimeout(()=>{try{src.stop()}catch{/* ended */}resolve(true)},(to-from)*1000+1500);
      src.onended=()=>{clearTimeout(timer);if(this.source===src)this.source=null;resolve(true)};
      this.source=src;
      src.start(0,from,to-from);
    });
  }

  /** The voice's own volume, a little above the car's sound (made once per audio context). */
  private gain:{ctx:AudioContext;node:GainNode}|null=null;
  private output(ctx:AudioContext):AudioNode{
    if(this.gain?.ctx!==ctx){const node=ctx.createGain();node.gain.value=1.4;node.connect(ctx.destination);this.gain={ctx,node}}
    return this.gain.node;
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

/** Where the speech in a clip starts and ends (seconds), with 60 ms kept either side: the silence trimmed off. */
export function spoken(buffer:{sampleRate:number;length:number;duration:number;getChannelData(c:number):Float32Array}):{from:number;to:number}{
  const data=buffer.getChannelData(0),rate=buffer.sampleRate,threshold=.01,keep=.06;
  let first=0;while(first<data.length&&Math.abs(data[first]!)<threshold)first++;
  let last=data.length-1;while(last>first&&Math.abs(data[last]!)<threshold)last--;
  if(first>=last)return {from:0,to:buffer.duration};
  return {from:Math.max(0,first/rate-keep),to:Math.min(buffer.duration,last/rate+keep)};
}
