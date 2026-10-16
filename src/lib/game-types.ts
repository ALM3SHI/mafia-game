/**
 * Shared game types. Kept in a standalone module so the pure engine
 * (game-logic.ts) and the Zustand store can both import them without a
 * circular dependency.
 */

export type Role = 'mafia' | 'citizen' | 'doctor' | 'detective' | 'mayor' | 'jester';
export type Team = 'mafia' | 'town' | 'neutral';
export type Winner = 'town' | 'mafia' | 'jester';

/**
 * Round order:  lobby → reveal → night → reaction → testimony → day → voting → night …
 * "reaction" is the morning announcement of what happened during the night.
 */
export type Phase =
  | 'lobby'
  | 'reveal'
  | 'night'
  | 'reaction'
  | 'testimony'
  | 'day'
  | 'voting'
  | 'game-over';

/** Vote target used when a player chooses to skip the elimination vote. */
export const SKIP_VOTE = '__skip__';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  role?: Role;
  isAlive: boolean;
  isReady: boolean;
  isBot: boolean;
  isHost?: boolean;
}

export interface RoleToggles {
  doctor: boolean;
  detective: boolean;
  mayor: boolean;
  jester: boolean;
}

export interface GameSettings {
  mafiaCount: number;
  /** Seconds each alive player gets during testimony. */
  testimonyDuration: number;
  dayDuration: number;
  voteDuration: number;
  nightDuration: number;
  secretVoting: boolean;
  revealRolesOnDeath: boolean;
  roles: RoleToggles;
}

export interface NightActions {
  /** mafia player id → target id */
  mafiaVotes: Record<string, string>;
  doctorTarget: string | null;
  detectiveTarget: string | null;
}

export type LogType = 'danger' | 'special' | 'info' | 'chat';

export interface LogEntry {
  id: number;
  text: string;
  type: LogType;
}

export interface Investigation {
  targetId: string;
  isMafia: boolean;
}
