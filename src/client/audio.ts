'use client';

/**
 * Sound engine.
 *  - One-shot SFX are decoded once into AudioBuffers (instant, overlappable,
 *    pitch-variable) — files in /public/audio, all CC0 (see /credits).
 *  - Three looping layers crossfade by "scene": rain, a noir bed for day,
 *    a darker bed for night, plus a heartbeat loop during the vote.
 */
import { useProfile } from './profile';

export type Sfx =
  | 'click'
  | 'hover'
  | 'paper'
  | 'type'
  | 'type-return'
  | 'shuffle'
  | 'card-flip'
  | 'card-fan'
  | 'chip'
  | 'chips'
  | 'gunshot'
  | 'thunder'
  | 'door-creak'
  | 'door-slam'
  | 'footsteps'
  | 'heartbeat'
  | 'heartbeat-fast'
  | 'drumroll'
  | 'gavel'
  | 'sting-clue'
  | 'sting-confront'
  | 'sting-saved'
  | 'sting-death'
  | 'crack'
  | 'case-open'
  | 'win-town'
  | 'win-mafia'
  | 'bell'
  | 'knock'
  | 'jingle-win'
  | 'jingle-buy'
  | 'jingle-error';

/** Old names still used in a few places. */
const ALIAS: Record<string, Sfx> = {
  join: 'knock',
  start: 'case-open',
  vote: 'chip',
  kill: 'gunshot',
  day: 'bell',
  night: 'thunder',
  win: 'jingle-win',
  lose: 'win-mafia',
  error: 'jingle-error',
  reveal: 'card-flip',
  notify: 'jingle-buy',
};

export type Scene = 'off' | 'menu' | 'day' | 'night' | 'tense';
type Layer = 'rain' | 'bed-day' | 'bed-night' | 'heartbeat';

const LAYER_FILE: Record<Layer, string> = {
  rain: '/audio/rain.mp3',
  'bed-day': '/audio/bed-day.mp3',
  'bed-night': '/audio/bed-night.mp3',
  heartbeat: '/audio/heartbeat.mp3',
};

/** Target gain per layer for each scene (before master volume). */
const SCENE_MIX: Record<Scene, Record<Layer, number>> = {
  off: { rain: 0, 'bed-day': 0, 'bed-night': 0, heartbeat: 0 },
  menu: { rain: 0.55, 'bed-day': 0.35, 'bed-night': 0, heartbeat: 0 },
  day: { rain: 0.3, 'bed-day': 0.4, 'bed-night': 0, heartbeat: 0 },
  night: { rain: 0.75, 'bed-day': 0, 'bed-night': 0.55, heartbeat: 0 },
  tense: { rain: 0.25, 'bed-day': 0, 'bed-night': 0.2, heartbeat: 0.7 },
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private layers = new Map<Layer, { src: AudioBufferSourceNode; gain: GainNode }>();
  private scene: Scene = 'off';
  private heartbeatRate = 1;

  /** Call from a user gesture once (autoplay policy). Safe to call often. */
  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      // Warm the most common one-shots.
      (['click', 'hover', 'chip', 'card-flip', 'gunshot', 'thunder', 'paper'] as Sfx[]).forEach(n => this.load(`/audio/${n}.mp3`));
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this.applyPrefs();
    this.applyScene(0.1);
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  private load(url: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(url);
    if (!p) {
      p = fetch(url)
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then(b => this.ctx!.decodeAudioData(b))
        .catch(() => null);
      this.buffers.set(url, p);
    }
    return p;
  }

  applyPrefs() {
    if (!this.ctx || !this.master || !this.sfxBus || !this.musicBus) return;
    const { prefs } = useProfile.getState();
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(prefs.volume, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(prefs.sfx ? 1 : 0, t, 0.05);
    this.musicBus.gain.setTargetAtTime(1, t, 0.1);
    this.applyScene(0.4);
  }

  async play(name: Sfx | string, opts: { volume?: number; rate?: number; delay?: number; detune?: boolean } = {}) {
    if (!this.ctx || !this.sfxBus) return;
    if (!useProfile.getState().prefs.sfx) return;
    const key = (ALIAS[name] ?? name) as Sfx;
    const buf = await this.load(`/audio/${key}.mp3`);
    if (!buf || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = (opts.rate ?? 1) * (opts.detune ? 0.94 + Math.random() * 0.12 : 1);
    const g = this.ctx.createGain();
    g.gain.value = opts.volume ?? 1;
    src.connect(g).connect(this.sfxBus);
    src.start(this.ctx.currentTime + (opts.delay ?? 0));
  }

  private async ensureLayer(layer: Layer) {
    if (!this.ctx || !this.musicBus || this.layers.has(layer)) return;
    const buf = await this.load(LAYER_FILE[layer]);
    if (!buf || !this.ctx || this.layers.has(layer)) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain).connect(this.musicBus);
    src.start();
    this.layers.set(layer, { src, gain });
    this.applyScene(1.2);
  }

  setScene(scene: Scene) {
    if (scene === this.scene) return;
    this.scene = scene;
    if (scene !== 'tense') this.heartbeatRate = 1;
    this.applyScene(1.5);
  }

  /** Speeds the heartbeat up as the vote timer runs out. */
  setTension(secondsLeft: number) {
    const rate = secondsLeft <= 5 ? 1.45 : secondsLeft <= 10 ? 1.2 : 1;
    if (rate === this.heartbeatRate) return;
    this.heartbeatRate = rate;
    const hb = this.layers.get('heartbeat');
    if (hb && this.ctx) hb.src.playbackRate.setTargetAtTime(rate, this.ctx.currentTime, 0.3);
  }

  private applyScene(timeConstant: number) {
    if (!this.ctx) return;
    const { prefs } = useProfile.getState();
    const mix = SCENE_MIX[this.scene];
    for (const layer of Object.keys(mix) as Layer[]) {
      let target = mix[layer];
      if (layer === 'rain' && !prefs.rain) target = 0;
      if ((layer === 'bed-day' || layer === 'bed-night') && !prefs.music) target = 0;
      if (layer === 'heartbeat' && !prefs.sfx) target = 0;
      if (target > 0) void this.ensureLayer(layer);
      const l = this.layers.get(layer);
      if (l) l.gain.gain.setTargetAtTime(target, this.ctx.currentTime, timeConstant);
    }
  }
}

export const audio = new AudioEngine();

/** Fire-and-forget SFX helper. */
export function sfx(name: Sfx | keyof typeof ALIAS, gainOrOpts: number | { volume?: number; rate?: number; delay?: number; detune?: boolean } = 1) {
  const opts = typeof gainOrOpts === 'number' ? { volume: gainOrOpts } : gainOrOpts;
  void audio.play(name, opts);
}

/** Back-compat facade used by the settings screen and pages. */
export const ambience = {
  unlock: () => audio.unlock(),
  apply: () => audio.applyPrefs(),
  setMood: (m: Scene) => audio.setScene(m),
};
