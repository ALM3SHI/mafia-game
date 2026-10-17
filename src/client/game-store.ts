'use client';

import { create } from 'zustand';
import type { Command } from '@/game/protocol';
import type { PlayerView } from '@/game/types';
import { LocalTransport, OnlineTransport, loadSession, type ConnStatus, type GameTransport, type OnlineIntent } from './transport';
import { identityFromProfile } from './profile';

export interface Toast {
  id: number;
  text: string;
  tone: 'error' | 'info';
}

interface GameStore {
  view: PlayerView | null;
  status: ConnStatus | 'idle';
  fatal: string | null;
  /** serverNow - Date.now() at the moment the last view arrived. */
  clockOffset: number;
  toasts: Toast[];
  transport: GameTransport | null;

  playLocal: () => void;
  createOnline: () => void;
  joinOnline: (code: string) => void;
  resumeOnline: () => boolean;
  send: (cmd: Command) => void;
  leave: () => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
}

let toastSeq = 0;

export const useGame = create<GameStore>((set, get) => {
  const events = {
    onView: (view: PlayerView) => set({ view, clockOffset: view.serverNow - Date.now() }),
    onError: (message: string, fatal: boolean) => {
      if (fatal) set({ fatal: message });
      get().toast(message, 'error');
    },
    onStatus: (status: ConnStatus) => set({ status }),
  };

  const replace = (t: GameTransport | null) => {
    get().transport?.close();
    set({ transport: t, view: null, fatal: null, status: t ? 'connecting' : 'idle' });
  };

  const online = (intent: OnlineIntent) => {
    replace(null);
    set({ transport: new OnlineTransport(intent, events), status: 'connecting' });
  };

  return {
    view: null,
    status: 'idle',
    fatal: null,
    clockOffset: 0,
    toasts: [],
    transport: null,

    playLocal: () => {
      replace(null);
      const t = new LocalTransport(identityFromProfile(), events);
      set({ transport: t, status: 'connected' });
    },
    createOnline: () => online({ kind: 'create', identity: identityFromProfile() }),
    joinOnline: code => online({ kind: 'join', code: code.toUpperCase().trim(), identity: identityFromProfile() }),
    resumeOnline: () => {
      const session = loadSession();
      if (!session) return false;
      online({ kind: 'resume', session });
      return true;
    },
    send: cmd => get().transport?.send(cmd),
    leave: () => replace(null),
    toast: (text, tone = 'info') => {
      const id = ++toastSeq;
      set({ toasts: [...get().toasts.slice(-3), { id, text, tone }] });
      setTimeout(() => get().dismiss(id), 3500);
    },
    dismiss: id => set({ toasts: get().toasts.filter(t => t.id !== id) }),
  };
});

/** Server-synchronised "now" for countdowns. */
export function gameNow(): number {
  return Date.now() + useGame.getState().clockOffset;
}
