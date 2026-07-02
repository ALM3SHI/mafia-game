'use client';

import { useCallback } from 'react';

type SoundEffect = 'card-flip' | 'join' | 'start' | 'vote' | 'kill' | 'day-start' | 'night-start';

export function useSound() {
  const playSound = useCallback((effect: SoundEffect) => {
    const soundMap: Record<SoundEffect, string> = {
      'card-flip': 'click.mp3',
      'join': 'sfx-notification.mp3',
      'start': 'sfx-reveal.mp3',
      'vote': 'sfx-vote.mp3',
      'kill': 'death.mp3',
      'day-start': 'sfx-notification.mp3',
      'night-start': 'sfx-night.mp3'
    };

    const fileName = soundMap[effect];
    if (fileName) {
      const audio = new Audio(`/sounds/${fileName}`);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Silently fail if audio can't play (e.g. no user interaction yet)
      });
    }
    
    console.log(`🎵 Playing sound: ${effect} (${fileName})`);
  }, []);

  return { playSound };
}
