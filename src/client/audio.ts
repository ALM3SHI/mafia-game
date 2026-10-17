'use client';

/**
 * Sound: one-shot SFX from /public/sounds plus a procedural ambience made
 * with WebAudio — rain (filtered noise) and a slow minor-key noir pad that
 * shifts mood between day and night. No music files needed.
 */
import { useProfile } from './profile';

export type Sfx = 'click' | 'hover' | 'join' | 'start' | 'vote' | 'kill' | 'day' | 'night' | 'win' | 'lose' | 'error' | 'reveal' | 'heartbeat' | 'notify';

const FILES: Record<Sfx, string> = {
  click: 'sfx-click.mp3',
  hover: 'sfx-hover.mp3',
  join: 'sfx-notification.mp3',
  start: 'sfx-reveal.mp3',
  vote: 'sfx-vote.mp3',
  kill: 'sfx-slash.mp3',
  day: 'sfx-day.mp3',
  night: 'sfx-night.mp3',
  win: 'sfx-win.mp3',
  lose: 'sfx-lose.mp3',
  error: 'sfx-error.mp3',
  reveal: 'sfx-reveal.mp3',
  heartbeat: 'sfx-heartbeat.mp3',
  notify: 'sfx-notification.mp3',
};

export function sfx(name: Sfx, gain = 1) {
  if (typeof window === 'undefined') return;
  const { prefs } = useProfile.getState();
  if (!prefs.sfx) return;
  const a = new Audio(`/sounds/${FILES[name]}`);
  a.volume = Math.min(1, prefs.volume * gain * 0.8);
  a.play().catch(() => {});
}

// ── Ambience ───────────────────────────────────────────────────────────────

type Mood = 'menu' | 'day' | 'night' | 'tense' | 'off';

class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private padGain: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private oscs: OscillatorNode[] = [];
  private chordTimer: ReturnType<typeof setInterval> | null = null;
  private mood: Mood = 'off';
  private step = 0;

  /** Must be called from a user gesture the first time (autoplay policy). */
  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) this.build();
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  private build() {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // Rain: brown-ish noise → bandpass → gain, with slow random swells.
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.04 * white) / 1.04;
        d[i] = last * 3.2 + white * 0.05;
      }
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'lowpass';
    bp.frequency.value = 2400;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    noise.connect(bp).connect(this.rainGain).connect(this.master);
    noise.start();

    // Pad: three detuned triangles through a lowpass.
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 700;
    this.padFilter.Q.value = 3;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0;
    this.padFilter.connect(this.padGain).connect(this.master);
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.detune.value = (i - 1.5) * 6;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.35 : 0.18;
      o.connect(g).connect(this.padFilter);
      o.start();
      this.oscs.push(o);
    }
    this.chordTimer = setInterval(() => this.nextChord(), 6000);
    this.nextChord();
  }

  // A minor noir progression: Am9 – Fmaj7 – Dm9 – E7(b9)
  private static CHORDS = [
    [110, 164.81, 196, 246.94],
    [87.31, 130.81, 164.81, 220],
    [73.42, 130.81, 174.61, 220],
    [82.41, 123.47, 146.83, 207.65],
  ];

  private nextChord() {
    if (!this.ctx) return;
    const chord = Ambience.CHORDS[this.step++ % Ambience.CHORDS.length];
    const t = this.ctx.currentTime;
    const low = this.mood === 'night' || this.mood === 'tense' ? 0.5 : 1;
    this.oscs.forEach((o, i) => o.frequency.setTargetAtTime(chord[i] * low * (this.mood === 'tense' ? 1.0595 : 1), t, 1.2));
  }

  setMood(mood: Mood) {
    this.mood = mood;
    this.apply();
  }

  apply() {
    if (!this.ctx || !this.master || !this.rainGain || !this.padGain || !this.padFilter) return;
    const { prefs } = useProfile.getState();
    const t = this.ctx.currentTime;
    const on = this.mood !== 'off';
    this.master.gain.setTargetAtTime(on ? prefs.volume * 0.55 : 0, t, 0.8);
    const rain = prefs.rain ? (this.mood === 'night' ? 0.32 : this.mood === 'tense' ? 0.2 : 0.22) : 0;
    this.rainGain.gain.setTargetAtTime(rain, t, 1.5);
    const pad = prefs.music ? (this.mood === 'tense' ? 0.12 : this.mood === 'night' ? 0.09 : 0.07) : 0;
    this.padGain.gain.setTargetAtTime(pad, t, 1.5);
    this.padFilter.frequency.setTargetAtTime(this.mood === 'night' ? 420 : this.mood === 'tense' ? 1100 : 800, t, 1.5);
  }

  dispose() {
    if (this.chordTimer) clearInterval(this.chordTimer);
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.oscs = [];
  }
}

export const ambience = new Ambience();
