export type HitResult = 'PERFECT' | 'GOOD' | 'MISS';

export class AudioManager {
  private ctx: AudioContext;
  private _startTime: number = 0;
  readonly bpm: number;

  constructor(bpm: number) {
    this.ctx = new AudioContext();
    this.bpm = bpm;
  }

  get currentTime(): number {
    return this.ctx.currentTime;
  }

  get absoluteStartTime(): number {
    return this._startTime;
  }

  start(): void {
    this._startTime = this.ctx.currentTime;
  }

  getSongTime(): number {
    if (this._startTime === 0) return -1;
    return this.ctx.currentTime - this._startTime;
  }

  getBeatTime(beat: number): number {
    return this._startTime + beat * (60 / this.bpm);
  }

  evaluateHit(inputTime: number, noteAbsTime: number): HitResult {
    const delta = Math.abs(inputTime - noteAbsTime) * 1000;
    if (delta < 50) return 'PERFECT';
    if (delta < 100) return 'GOOD';
    return 'MISS';
  }

  // Metronome tick via Web Audio — never use Date.now() for beat sync
  scheduleTick(absTime: number, accent: boolean = false): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.value = accent ? 1320 : 880;
    gain.gain.setValueAtTime(accent ? 0.35 : 0.15, absTime);
    gain.gain.exponentialRampToValueAtTime(0.001, absTime + 0.06);
    osc.start(absTime);
    osc.stop(absTime + 0.08);
  }
}
