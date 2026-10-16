// REFERENCE ONLY: DOM/A-Frame coupling and strict scoring must be redesigned.
AFRAME.registerComponent('turn-signals',{
  init(){
    this.side=null;
    this.signalAt=0;
    this.mirrorBeforeSignal=0;
    this.mirrors={left:0,right:0,rear:0};
    this.leftMirrorCheckedAt=0;this.rightMirrorCheckedAt=0;
    this.signalTimingFaultRecorded=false;
    this.blind={left:0,right:0};
    this.flashOn=false;
    this.interval=null;
    this.audio=null;
    this.lastEvaluation={at:-Infinity,side:null};
    this.mirrorListener=event=>{
      const side=event.detail?.side;
      if(Object.hasOwn(this.mirrors,side)){
        const checkedAt=performance.now();
        this.mirrors[side]=checkedAt;
        if(side==='left')this.leftMirrorCheckedAt=checkedAt;
        if(side==='right')this.rightMirrorCheckedAt=checkedAt;
      }
    };
    this.blindListener=event=>{
      const side=event.detail?.side;
      if(side==='left'||side==='right')this.blind[side]=performance.now();
    };
    this.el.addEventListener('driver-mirror-check',this.mirrorListener);
    this.el.addEventListener('driver-blind-check',this.blindListener);
    this.keyboard=event=>{
      if(event.repeat||event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
      const side=event.code==='BracketLeft'?'left':
                 event.code==='BracketRight'?'right':null;
      if(!side)return;
      event.preventDefault();
      this.toggle(side);
    };
    this.clickLeft=()=>this.toggle('left');
    this.clickRight=()=>this.toggle('right');
    window.addEventListener('keydown',this.keyboard);
    byId('signal-left').addEventListener('click',this.clickLeft);
    byId('signal-right').addEventListener('click',this.clickRight);
    this.paint();
  },
  getAudio(){
    if(this.audio)return this.audio;
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)return null;
    try{this.audio=new Context()}catch(error){console.info('[Turn signals] Audio unavailable',error)}
    return this.audio;
  },
  clickSound(){
    if(document.hidden||!this.audio||this.audio.state!=='running')return;
    try{
      const now=this.audio.currentTime;
      const oscillator=this.audio.createOscillator();
      const gain=this.audio.createGain();
      oscillator.type='square';
      oscillator.frequency.setValueAtTime(1040,now);
      gain.gain.setValueAtTime(.0001,now);
      gain.gain.exponentialRampToValueAtTime(.045,now+.004);
      gain.gain.exponentialRampToValueAtTime(.0001,now+.032);
      oscillator.connect(gain);
      gain.connect(this.audio.destination);
      oscillator.start(now);
      oscillator.stop(now+.036);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
    }catch(error){console.debug('[Turn signals] Click sound error',error)}
  },
  toggle(side){
    if(!active||!this.el.isConnected)return;
    if(this.side===side){this.stop();return}
    this.stop();
    this.side=side;
    this.signalAt=performance.now();
    // Snapshot the correct mirror at signal activation: looking in it
    // AFTER signalling cannot retroactively satisfy the MSM sequence.
    this.mirrorBeforeSignal=side==='left'?
      this.leftMirrorCheckedAt:this.rightMirrorCheckedAt;
    this.signalTimingFaultRecorded=false;
    this.blind[side]=0;
    if(activeCountryCode==='GB'&&
      !(this.mirrorBeforeSignal>0&&
        this.signalAt>=this.mirrorBeforeSignal&&
        this.signalAt-this.mirrorBeforeSignal<=MSM_MIRROR_WINDOW_MS)){
      // One event at signal activation. A subsequent manoeuvre must not
      // record this same missed/pre-signalling mirror observation again.
      this.signalTimingFaultRecorded=true;
      recordUkPracticeFault('signal',
        'Signals - Incorrect Timing: '+side+' mirror not checked within the preceding 2 seconds.',
        'signal-'+this.signalAt);
    }
    this.flashOn=true;
    this.paint();
    const audio=this.getAudio();
    if(audio){
      const resume=audio.state==='suspended'?audio.resume():Promise.resolve();
      Promise.resolve(resume).then(()=>{if(this.side===side)this.clickSound()})
        .catch(()=>{/* Quiet indicators remain operational without audio. */});
    }
    this.interval=setInterval(()=>{
      if(!this.side)return;
      this.flashOn=!this.flashOn;
      this.paint();
      this.clickSound();
    },355); // ~710 ms blink cycle with two rhythmic clicks.
  },
  stop(){
    if(this.interval){clearInterval(this.interval);this.interval=null}
    this.side=null;this.flashOn=false;this.signalAt=0;
    this.mirrorBeforeSignal=0;
    this.paint();
  },
  paint(){
    for(const side of ['left','right']){
      const button=byId('signal-'+side),arrow=byId('indicator-'+side);
      const selected=this.side===side;
      if(button)button.setAttribute('aria-pressed',String(selected));
      if(arrow)arrow.classList.toggle('lit',selected&&this.flashOn);
    }
    const dash=byId('signal-3d');
    if(dash){
      const text=this.side&&this.flashOn?(this.side==='left'?'◀ LEFT':'RIGHT ▶'):'';
      dash.setAttribute('value',text);
    }
  },
  evaluateTurn(side){
    const now=performance.now();
    if(now-this.lastEvaluation.at<1600&&this.lastEvaluation.side===side)return;
    this.lastEvaluation={at:now,side};
    const result=assessTurnSequence({
      side,activeSignal:this.side,
      mirrorAt:this.mirrorBeforeSignal,
      signalAt:this.signalAt,blindAt:this.blind[side],now
    });
    if(result.passed){
      toast('Safe sequence: Mirror → Signal → Blind spot → Manoeuvre');
    }else{
      showTestFault(result.reason);
      if(activeCountryCode==='GB'&&!ukMockScore.finished){
        const missingSignal=this.side!==side||!this.signalAt;
        const missedBlind=!this.blind[side]||
          this.blind[side]<=this.signalAt||
          now-this.blind[side]>TURN_SEQUENCE_WINDOW_MS;
        const missedMirror=!this.mirrorBeforeSignal||
          this.mirrorBeforeSignal>this.signalAt||
          this.signalAt-this.mirrorBeforeSignal>MSM_MIRROR_WINDOW_MS;
        const incidentId='turn-'+this.lastEvaluation.at+'-'+side;
        // STRICT TRAINING MODE ONLY: this is NOT automatic official DVSA
        // grading. evaluateTurn() is triggered on deliberate practice
        // junction turns or when the user intentionally signals, not on
        // ordinary steering adjustments.
        if(missingSignal||missedBlind){
          const reason=missingSignal?
            'Strict mock: '+side+' turn without correct indicator.':
            'Strict mock: '+side+' turn without a recent shoulder check.';
          const event=ukMockScore.recordSerious(reason,incidentId);
          if(event){
            paintUkMockScore();
            toast('SERIOUS FAULT (strict practice): '+side+' turn');
          }
        }else if(!this.signalTimingFaultRecorded){
          // Any mirror-timing minor already logged at signal activation is
          // NOT recorded a second time on the subsequent maneuver.
          if(missedMirror){
            recordUkPracticeFault('mirror',
              'Mirrors - Change direction: mirror check missed before '+side+' turn.',
              incidentId);
          }else if(now-this.signalAt>TURN_SEQUENCE_WINDOW_MS){
            recordUkPracticeFault('signal',
              'Signals - Incorrect Timing: signalled too early for '+side+' turn.',
              incidentId);
          }
        }
      }
    }
    // No inherited blind-spot observation after manoeuvring; next turn
    // requires a fresh deliberate check and an explicitly rearmed signal.
    this.blind[side]=0;
    this.mirrorBeforeSignal=0;
  },
  resetExercise(){
    this.stop();
    this.mirrors={left:0,right:0,rear:0};
    this.leftMirrorCheckedAt=0;this.rightMirrorCheckedAt=0;
    this.signalTimingFaultRecorded=false;
    this.blind={left:0,right:0};
    this.lastEvaluation={at:-Infinity,side:null};
    const banner=byId('fault-banner');if(banner){banner.hidden=true;banner.classList.remove('active')}
    const warning=byId('fault-3d');if(warning)warning.setAttribute('visible',false);
  },
  remove(){
    this.stop();
    window.removeEventListener('keydown',this.keyboard);
    byId('signal-left')?.removeEventListener('click',this.clickLeft);
    byId('signal-right')?.removeEventListener('click',this.clickRight);
    this.el.removeEventListener('driver-mirror-check',this.mirrorListener);
    this.el.removeEventListener('driver-blind-check',this.blindListener);
    this.audio?.close().catch(()=>{});
  }
});
