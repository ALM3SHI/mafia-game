'use client';

export type SoundEffect =
  | 'card-flip'
  | 'join'
  | 'start'
  | 'vote'
  | 'kill'
  | 'day-start'
  | 'night-start'
  | 'win'
  | 'lose'
  | 'error';

const SOUND_MAP: Record<SoundEffect, string> = {
  'card-flip': 'sfx-click.mp3',
  join: 'sfx-notification.mp3',
  start: 'sfx-reveal.mp3',
  vote: 'sfx-vote.mp3',
  kill: 'death.mp3',
  'day-start': 'sfx-day.mp3',
  'night-start': 'sfx-night.mp3',
  win: 'sfx-win.mp3',
  lose: 'sfx-lose.mp3',
  error: 'sfx-error.mp3',
};

export function playSound(effect: SoundEffect, volume = 0.5) {
  if (typeof window === 'undefined') return;
  const audio = new Audio(`/sounds/${SOUND_MAP[effect]}`);
  audio.volume = volume;
  audio.play().catch(() => {
    /* autoplay blocked before first user interaction — ignore */
  });
}

/** Kept for component ergonomics; `playSound` is already a stable module function. */
export function useSound() {
  return { playSound };
}
