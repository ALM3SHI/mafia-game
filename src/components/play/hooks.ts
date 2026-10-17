'use client';

import { useEffect, useState } from 'react';
import { gameNow, useGame } from '@/client/game-store';
import type { PlayerView, PublicPlayer } from '@/game/types';

/** Seconds left in the current phase (or testimony slot), server-synced. */
export function useCountdown(endsAt: number | undefined): number {
  const [now, setNow] = useState(() => gameNow());
  useEffect(() => {
    const id = setInterval(() => setNow(gameNow()), 250);
    return () => clearInterval(id);
  }, []);
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function useView(): PlayerView | null {
  return useGame(s => s.view);
}

export function me(view: PlayerView): PublicPlayer | undefined {
  return view.players.find(p => p.id === view.meId);
}

export const isMafiaRole = (r?: string) => r === 'mafia' || r === 'godfather';
