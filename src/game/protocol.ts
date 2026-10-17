/** Wire protocol between the browser and the online game server. */
import type { Cosmetics, GameSettings, PlayerView } from './types';

export type Command =
  | { type: 'ready'; ready: boolean }
  | { type: 'addBot' }
  | { type: 'fillBots'; count: number }
  | { type: 'kick'; targetId: string }
  | { type: 'settings'; patch: Partial<GameSettings> }
  | { type: 'start' }
  | { type: 'vote'; targetId: string }
  | { type: 'night'; targetId: string }
  | { type: 'clearNight' }
  | { type: 'chat'; text: string }
  | { type: 'endTurn' }
  | { type: 'cosmetics'; cosmetics: Cosmetics }
  | { type: 'backToLobby' };

export type ClientMessage =
  | { t: 'create'; name: string; avatar: string; cosmetics?: Cosmetics }
  | { t: 'join'; code: string; name: string; avatar: string; cosmetics?: Cosmetics }
  | { t: 'resume'; code: string; playerId: string; secret: string }
  | { t: 'leave' }
  | { t: 'cmd'; cmd: Command }
  | { t: 'ping'; at: number };

export type ServerMessage =
  | { t: 'joined'; code: string; playerId: string; secret: string }
  | { t: 'view'; view: PlayerView }
  | { t: 'error'; message: string; fatal?: boolean }
  | { t: 'pong'; at: number; serverNow: number };

export const PROTOCOL_VERSION = 1;
