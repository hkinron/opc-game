// ============================================
// Pixel Agents - Sound Effects System
// ============================================
// Procedural sound effects using Web Audio API (no external files needed)

export class SoundSystem {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private masterGain: GainNode | null = null;
  private volume: number = 0.3;

  constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this.enabled = false;
    }
  }

  /** Resume audio context (must be called after user gesture) */
  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /** Typing sound — short percussive clicks */
  playTyping(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800 + Math.random() * 400, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.03);

    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /** Footstep sound — soft thump */
  playFootstep(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150 + Math.random() * 50, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  /** Completion chime — cheerful ascending tone */
  playCompletion(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const noteT = t + i * 0.1;
      gain.gain.setValueAtTime(0, noteT);
      gain.gain.linearRampToValueAtTime(0.1, noteT + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(noteT);
      osc.stop(noteT + 0.4);
    });
  }

  /** Error buzz — harsh sound */
  playError(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteT = t + i * 0.15;

      osc.type = 'sawtooth';
      osc.frequency.value = 150;

      gain.gain.setValueAtTime(0.06, noteT);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteT);
      osc.stop(noteT + 0.12);
    }
  }

  /** Task pickup — pleasant ding */
  playTaskPickup(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    [783.99, 987.77].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const noteT = t + i * 0.08;

      osc.type = 'triangle';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, noteT);
      gain.gain.linearRampToValueAtTime(0.08, noteT + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(noteT);
      osc.stop(noteT + 0.25);
    });
  }

  /** Ambient office hum — very subtle background */
  playAmbient(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = 80;

    filter.type = 'lowpass';
    filter.frequency.value = 200;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.015, t + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 1);
  }
}
