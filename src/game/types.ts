/**
 * Shared game types — used by the browser (local rooms + UI) and by the
 * Node server (online rooms). Keep this folder free of React, Next.js and
 * `@/` path aliases so the server can import it directly.
 */

export type Role =
  | 'mafia'
  | 'godfather'
  | 'citizen'
  | 'doctor'
  | 'detective'
  | 'bodyguard'
  | 'vigilante'
  | 'mayor'
  | 'jester';

export type Team = 'mafia' | 'town' | 'neutral';
export type Winner = 'town' | 'mafia' | 'jester';

/**
 * Round order:
 *   lobby → reveal → night → morning → testimony → discussion → voting → verdict → night …
 */
export type Phase =
  | 'lobby'
  | 'reveal'
  | 'night'
  | 'morning'
  | 'testimony'
  | 'discussion'
  | 'voting'
  | 'verdict'
  | 'game-over';

export const SKIP_VOTE = '__skip__';

export type OptionalRole = 'godfather' | 'doctor' | 'detective' | 'bodyguard' | 'vigilante' | 'mayor' | 'jester';

export interface GameSettings {
  mafiaCount: number;
  /** Seconds each living player gets during testimony. */
  testimonyDuration: number;
  discussionDuration: number;
  voteDuration: number;
  nightDuration: number;
  secretVoting: boolean;
  revealRolesOnDeath: boolean;
  roles: Record<OptionalRole, boolean>;
}

export interface NightActions {
  /** mafia-team player id → target id */
  mafiaVotes: Record<string, string>;
  doctor: string | null;
  detective: string | null;
  bodyguard: string | null;
  vigilante: string | null;
}

export type ChatChannel = 'public' | 'mafia' | 'dead';

export interface ChatMessage {
  id: number;
  at: number;
  channel: ChatChannel;
  authorId: string;
  authorName: string;
  text: string;
}

export type EventTone = 'danger' | 'special' | 'info' | 'private';

/** A line in the event log. `to` limits visibility to specific players. */
export interface GameEvent {
  id: number;
  at: number;
  round: number;
  tone: EventTone;
  text: string;
  to?: string[];
}

export interface Investigation {
  round: number;
  targetId: string;
  /** What the detective *sees* — the godfather appears innocent. */
  looksMafia: boolean;
}

/** Cosmetics a player shows to others (bought in the store). */
export interface Cosmetics {
  frame?: string;
  title?: string;
}

/** What one client is allowed to know about another player. */
export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  isHost: boolean;
  connected: boolean;
  ready: boolean;
  alive: boolean;
  /** Present only when this viewer is allowed to know it. */
  role?: Role;
  cosmetics?: Cosmetics;
}

export interface TimelineEntry {
  round: number;
  kind: 'night-kill' | 'saved' | 'lynch' | 'no-lynch' | 'vigilante';
  playerIds: string[];
}

/** Everything a client renders. Produced per viewer by `Room.viewFor`. */
export interface PlayerView {
  code: string;
  mode: 'local' | 'online';
  meId: string;
  hostId: string | null;
  serverNow: number;
  phase: Phase;
  phaseStartedAt: number;
  phaseEndsAt: number;
  round: number;
  winner: Winner | null;
  settings: GameSettings;
  players: PublicPlayer[];
  speakerId: string | null;
  /** voter → target. Under secret voting only the viewer's own vote is listed. */
  votes: Record<string, string>;
  /** Total weighted votes per target (always visible). */
  voteCounts: Record<string, number>;
  votedIds: string[];
  myNightTarget: string | null;
  /** mafia only: teammate id → target */
  mafiaPicks: Record<string, string>;
  investigations: Investigation[];
  vigilanteBullets: number;
  lastDoctorTarget: string | null;
  chat: ChatMessage[];
  events: GameEvent[];
  /** Players who died in the most recent resolution (for FX). */
  lastDeaths: string[];
  timeline: TimelineEntry[];
}
