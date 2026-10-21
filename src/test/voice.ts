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

  private pickVoice(){
    const voices=this.synth?.getVoices()??[];
    // A natural-sounding British voice if there is one (Daniel, Serena, Kate on Apple devices; Google UK English).
    this.voice=voices.find(v=>v.lang==='en-GB'&&/Daniel|Serena|Kate|Arthur|Martha|Google UK/i.test(v.name))
      ??voices.find(v=>v.lang==='en-GB')??voices.find(v=>v.lang.startsWith('en'))??null;
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
    const synth=this.synth;
    if(!synth||this.muted||!text)return;
    if(!queue)synth.cancel();
    const u=new SpeechSynthesisUtterance(text);
    if(this.voice)u.voice=this.voice;
    u.lang=this.voice?.lang??'en-GB';
    u.rate=.97;
    synth.speak(u);
  }

  stop():void{this.synth?.cancel()}
}
