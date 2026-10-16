/**
 * Pure Mafia game engine. No React, no store, no side effects — every
 * function takes state in and returns new state out, and randomness is
 * injected (`rng`) so the rules can be unit-tested deterministically.
 */
import {
  SKIP_VOTE,
  type GameSettings,
  type Investigation,
  type NightActions,
  type Player,
  type Role,
  type Winner,
} from './game-types';
import { OPTIONAL_ROLES, ROLE_INFO } from './roles';

export type Rng = () => number;

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Unbiased Fisher–Yates shuffle (the old `sort(() => Math.random() - 0.5)` is biased). */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pick<T>(items: readonly T[], rng: Rng = Math.random): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng() * items.length)];
}

export const alive = (players: readonly Player[]) => players.filter(p => p.isAlive);
export const isMafia = (p: Player | undefined) => p?.role === 'mafia';

/** Largest mafia count that still leaves the town a fair majority. */
export function maxMafiaFor(playerCount: number): number {
  return Math.max(1, Math.floor(playerCount / 3));
}

export function clampMafiaCount(requested: number, playerCount: number): number {
  return Math.min(Math.max(1, Math.round(requested) || 1), maxMafiaFor(playerCount));
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/** Builds the list of roles to deal for a table of `playerCount`. */
export function buildRoleDeck(playerCount: number, settings: GameSettings): Role[] {
  const mafia = clampMafiaCount(settings.mafiaCount, playerCount);
  const deck: Role[] = Array.from({ length: mafia }, () => 'mafia' as Role);

  for (const role of OPTIONAL_ROLES) {
    if (!settings.roles[role]) continue;
    if (playerCount < ROLE_INFO[role].minPlayers) continue;
    // Always keep at least one plain seat free so the deck never overflows.
    if (deck.length >= playerCount - 1) break;
    deck.push(role);
  }

  while (deck.length < playerCount) deck.push('citizen');
  return deck;
}

export function assignRoles(players: readonly Player[], settings: GameSettings, rng: Rng = Math.random): Player[] {
  const deck = shuffle(buildRoleDeck(players.length, settings), rng);
  return players.map((p, i) => ({ ...p, role: deck[i], isAlive: true }));
}

export function canStartGame(players: readonly Player[]): { ok: boolean; reason?: string } {
  if (players.length < MIN_PLAYERS) return { ok: false, reason: `نحتاج ${MIN_PLAYERS} لاعبين كحد أدنى` };
  if (players.length > MAX_PLAYERS) return { ok: false, reason: `الحد الأقصى ${MAX_PLAYERS} لاعب` };
  if (!players.every(p => p.isReady)) return { ok: false, reason: 'بانتظار جاهزية جميع اللاعبين' };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Voting
// ---------------------------------------------------------------------------

export interface TallyResult {
  /** Winning target id, or null on a tie / skip majority / no votes. */
  targetId: string | null;
  counts: Record<string, number>;
  tie: boolean;
}

/**
 * Counts votes from alive voters for alive targets. The mayor's vote is
 * worth two. A tie for first place — including a tie with SKIP — means
 * nobody is eliminated.
 */
export function tallyVotes(votes: Record<string, string>, players: readonly Player[]): TallyResult {
  const byId = new Map(players.map(p => [p.id, p]));
  const counts: Record<string, number> = {};

  for (const [voterId, targetId] of Object.entries(votes)) {
    const voter = byId.get(voterId);
    if (!voter?.isAlive) continue;
    if (targetId !== SKIP_VOTE && !byId.get(targetId)?.isAlive) continue;
    const weight = voter.role === 'mayor' ? 2 : 1;
    counts[targetId] = (counts[targetId] ?? 0) + weight;
  }

  const entries = Object.entries(counts);
  if (entries.length === 0) return { targetId: null, counts, tie: false };

  const top = Math.max(...entries.map(([, c]) => c));
  const leaders = entries.filter(([, c]) => c === top).map(([id]) => id);
  if (leaders.length > 1) return { targetId: null, counts, tie: true };
  const [winner] = leaders;
  return { targetId: winner === SKIP_VOTE ? null : winner, counts, tie: false };
}

// ---------------------------------------------------------------------------
// Night
// ---------------------------------------------------------------------------

export const emptyNight = (): NightActions => ({ mafiaVotes: {}, doctorTarget: null, detectiveTarget: null });

/** Is `actor` allowed to target `target` with their night ability? */
export function canTargetAtNight(actor: Player, target: Player): boolean {
  if (!actor.isAlive || !target.isAlive) return false;
  switch (actor.role) {
    case 'mafia':
      return target.role !== 'mafia';
    case 'doctor':
      return true; // may self-protect
    case 'detective':
      return target.id !== actor.id;
    default:
      return false;
  }
}

export function hasNightAction(p: Player | undefined): boolean {
  return !!p?.isAlive && (p.role === 'mafia' || p.role === 'doctor' || p.role === 'detective');
}

/**
 * Fills in night choices for every alive bot that has not acted yet.
 * Bot mafia follow a target already chosen by a teammate (so a human mafia
 * player leads the pack); otherwise they agree on one random victim.
 */
export function fillBotNightActions(players: readonly Player[], night: NightActions, rng: Rng = Math.random): NightActions {
  const next: NightActions = { ...night, mafiaVotes: { ...night.mafiaVotes } };
  const living = alive(players);

  const mafiaBots = living.filter(p => p.isBot && p.role === 'mafia' && !(p.id in next.mafiaVotes));
  if (mafiaBots.length > 0) {
    const existing = Object.values(next.mafiaVotes)[0];
    const victims = living.filter(p => p.role !== 'mafia');
    const target = existing ?? pick(victims, rng)?.id;
    if (target) for (const m of mafiaBots) next.mafiaVotes[m.id] = target;
  }

  const doctor = living.find(p => p.role === 'doctor');
  if (doctor?.isBot && !next.doctorTarget) next.doctorTarget = pick(living, rng)?.id ?? null;

  const detective = living.find(p => p.role === 'detective');
  if (detective?.isBot && !next.detectiveTarget) {
    next.detectiveTarget = pick(living.filter(p => p.id !== detective.id), rng)?.id ?? null;
  }
  return next;
}

export interface NightResult {
  players: Player[];
  killedId: string | null;
  savedId: string | null;
  investigation: Investigation | null;
}

export function resolveNight(players: readonly Player[], night: NightActions, rng: Rng = Math.random): NightResult {
  const byId = new Map(players.map(p => [p.id, p]));

  // Only votes from alive mafia on alive non-mafia targets count.
  const counts: Record<string, number> = {};
  for (const [voterId, targetId] of Object.entries(night.mafiaVotes)) {
    const voter = byId.get(voterId);
    const target = byId.get(targetId);
    if (!voter || !target || voter.role !== 'mafia' || !canTargetAtNight(voter, target)) continue;
    counts[targetId] = (counts[targetId] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  let mafiaTarget: string | null = null;
  if (entries.length > 0) {
    const top = Math.max(...entries.map(([, c]) => c));
    // Mafia must kill someone if they voted at all — break ties randomly.
    mafiaTarget = pick(entries.filter(([, c]) => c === top).map(([id]) => id), rng) ?? null;
  }

  const doctor = alive(players).find(p => p.role === 'doctor');
  const protectedId = doctor && night.doctorTarget && byId.get(night.doctorTarget)?.isAlive ? night.doctorTarget : null;

  const saved = mafiaTarget !== null && mafiaTarget === protectedId;
  const killedId = saved ? null : mafiaTarget;

  const detective = alive(players).find(p => p.role === 'detective');
  const investigated = detective && night.detectiveTarget ? byId.get(night.detectiveTarget) : undefined;
  const investigation = investigated ? { targetId: investigated.id, isMafia: investigated.role === 'mafia' } : null;

  return {
    players: players.map(p => (p.id === killedId ? { ...p, isAlive: false } : p)),
    killedId,
    savedId: saved ? mafiaTarget : null,
    investigation,
  };
}

// ---------------------------------------------------------------------------
// Win conditions
// ---------------------------------------------------------------------------

/**
 * Town wins when no mafia remain. Mafia wins once they are at least half of
 * the living players (they can no longer be out-voted). The jester's
 * instant win is handled at lynch time — see `lynchedJester`.
 */
export function checkWinner(players: readonly Player[], lynchedJester = false): Winner | null {
  if (lynchedJester) return 'jester';
  const living = alive(players);
  const mafia = living.filter(p => p.role === 'mafia').length;
  if (mafia === 0) return 'town';
  if (mafia >= living.length - mafia) return 'mafia';
  return null;
}

export function didPlayerWin(player: Player | undefined, winner: Winner | null): boolean {
  if (!player?.role || !winner) return false;
  if (winner === 'jester') return player.role === 'jester';
  const team = ROLE_INFO[player.role].team;
  return (winner === 'mafia' && team === 'mafia') || (winner === 'town' && team === 'town');
}

// ---------------------------------------------------------------------------
// Bot behaviour (day)
// ---------------------------------------------------------------------------

/** Bots vote at random but mafia bots never vote for a teammate. ~10% skip. */
export function chooseBotVote(bot: Player, players: readonly Player[], rng: Rng = Math.random): string {
  if (rng() < 0.1) return SKIP_VOTE;
  const candidates = alive(players).filter(p => p.id !== bot.id && !(bot.role === 'mafia' && p.role === 'mafia'));
  return pick(candidates, rng)?.id ?? SKIP_VOTE;
}

const CHAT_TEMPLATES = [
  'أحس إن {x} مخبي شي...',
  'ليش {x} ساكت من البداية؟',
  'أنا مواطن والله، لا تضيعون أصواتكم علي.',
  '{x}، وين كنت البارحة بالليل؟ 😏',
  'خلونا نركز، المافيا بيننا الحين.',
  'كلام {x} ما يدخل العقل.',
  'أنا أثق في {x} مبدئياً.',
  'المحقق إذا موجود يتكلم الحين!',
];

export function botChatLine(bot: Player, players: readonly Player[], rng: Rng = Math.random): string {
  const others = alive(players).filter(p => p.id !== bot.id && !(bot.role === 'mafia' && p.role === 'mafia'));
  const target = pick(others, rng)?.name ?? 'أحد';
  const template = pick(CHAT_TEMPLATES, rng) ?? CHAT_TEMPLATES[0];
  return template.replace('{x}', target);
}
