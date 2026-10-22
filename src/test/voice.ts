/**
 * The examiner's voice: the browser's speech synthesis, with a British English voice where the device has one.
 * Every direction is also shown on screen (the HUD task box), so a muted phone loses nothing. Browsers speak only
 * after a tap, so `unlock` is called from the first taps (as for the other sounds).
 */
export class ExaminerVoice{
  private unlocked=false;
  private voice:SpeechSynthesisVoice|null=null;
  /** Off: directions are shown, not spoken (follows the HUD sound button). */
  muted=false;

  private get synth():SpeechSynthesis|null{return (globalThis as {speechSynthesis?:SpeechSynthesis}).speechSynthesis??null}

  /** Called after each sentence is spoken (the car's sound is resumed then: on iPhone speech can pause it). */
  onSpoken:()=>void=()=>{};
  /** Utterances being spoken or waiting (kept referenced: some browsers drop the end event of a collected one). */
  private queue:SpeechSynthesisUtterance[]=[];
  private startedAt=0;

  private pickVoice(){
    const voices=(this.synth?.getVoices()??[]).filter(v=>v.lang.replace('_','-').toLowerCase().startsWith('en-gb'));
    // The most natural British voice the device has: neural / premium / enhanced ones first (Edge "Sonia Online
    // (Natural)", Apple "Serena (Premium)", "Daniel (Enhanced)"), then Google's UK voice, then any British voice.
    const score=(v:SpeechSynthesisVoice)=>(/natural|neural|premium/i.test(v.name)?40:0)+(/enhanced/i.test(v.name)?30:0)
      +(/Sonia|Libby|Serena|Daniel|Kate|Arthur|Martha|Ryan|Google UK/i.test(v.name)?10:0)+(v.localService?1:0);
    this.voice=voices.sort((a,b)=>score(b)-score(a))[0]
      ??(this.synth?.getVoices()??[]).find(v=>v.lang.startsWith('en'))??null;
  }

  /** The voice in use (shown in About and the sound settings). */
  get voiceName():string{return this.voice?.name??'the device\'s default voice'}

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
    const synth=this.synth;
    if(!synth||this.muted||!text)return;
    // Stuck (some phones stop speaking after an interruption without saying so): start again.
    if(synth.speaking&&this.queue.length&&performance.now()-this.startedAt>20000){synth.cancel();this.queue=[]}
    if(!queue){synth.cancel();this.queue=[]}
    // Sentence by sentence: some browsers cut off an utterance after about 15 seconds.
    for(const sentence of text.match(/[^.!?]+[.!?]*/g)??[text]){
      const t=sentence.trim();
      if(!t)continue;
      const u=new SpeechSynthesisUtterance(t);
      if(this.voice)u.voice=this.voice;
      u.lang=this.voice?.lang??'en-GB';
      u.rate=.97;
      const done=()=>{this.queue=this.queue.filter(x=>x!==u);this.onSpoken()};
      u.onstart=()=>{this.startedAt=performance.now()};
      u.onend=done;u.onerror=done;
      this.queue.push(u);
      synth.speak(u);
    }
    // A paused synthesiser (iPhone after the screen was locked) does not speak until resumed.
    if(synth.paused)synth.resume();
  }

  stop():void{this.synth?.cancel();this.queue=[]}
}
