// Adapted from the legacy turn-signals oscillator; no renderer dependency.
export class IndicatorAudio {
  constructor(createContext = () => {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    return Context ? new Context() : null;
  }) { this.createContext = createContext; this.audio = null; this.disposed = false; }
  async unlock() {
    if (this.disposed) return false;
    try {
      this.audio ||= this.createContext();
      if (this.audio?.state === 'suspended') await this.audio.resume();
      return !this.disposed && this.audio?.state === 'running';
    } catch { return false; }
  }
  click({ hidden = false } = {}) {
    if (this.disposed || hidden || this.audio?.state !== 'running') return;
    const now = this.audio.currentTime;
    const oscillator = this.audio.createOscillator(), gain = this.audio.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(1040, now);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.045, now + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .032);
    oscillator.connect(gain); gain.connect(this.audio.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(now); oscillator.stop(now + .036);
  }
  async dispose() {
    this.disposed = true;
    if (this.audio && this.audio.state !== 'closed') await this.audio.close().catch(() => {});
    this.audio = null;
  }
}
