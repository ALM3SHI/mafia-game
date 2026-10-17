/**
 * Pure Mafia rules. No timers, no I/O — state in, state out, randomness
 * injected so every rule is unit-testable.
 */
import { OPTIONAL_ROLES, ROLE_INFO, isMafiaTeam } from './roles';
import { SKIP_VOTE, type GameSettings, type NightActions, type Role, type Winner } from './types';

export type Rng = () => number;

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 14;

/** Minimal shape the rules need. */
export interface Seat {
  id: string;
  role?: Role;
  alive: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pick<T>(items: readonly T[], rng: Rng = Math.random): T | undefined {
  return items.length ? items[Math.floor(rng() * items.length)] : undefined;
}

export const living = <T extends Seat>(seats: readonly T[]) => seats.filter(s => s.alive);

export function maxMafiaFor(playerCount: number): number {
  return Math.max(1, Math.floor(playerCount / 3));
}

export function clampMafiaCount(requested: number, playerCount: number): number {
  return Math.min(Math.max(1, Math.round(requested) || 1), maxMafiaFor(playerCount));
}

// ── Setup ──────────────────────────────────────────────────────────────────

/**
 * Builds the deck for `n` seats. The godfather replaces one regular mafia
 * slot (so the mafia count setting stays the team size).
 */
export function buildRoleDeck(n: number, settings: GameSettings): Role[] {
  const mafia = clampMafiaCount(settings.mafiaCount, n);
  const deck: Role[] = [];
  const useGodfather = settings.roles.godfather && n >= ROLE_INFO.godfather.minPlayers;
  for (let i = 0; i < mafia; i++) deck.push(i === 0 && useGodfather ? 'godfather' : 'mafia');

  for (const role of OPTIONAL_ROLES) {
    if (role === 'godfather') continue;
    if (!settings.roles[role] || n < ROLE_INFO[role].minPlayers) continue;
    // Keep at least one plain citizen seat.
    if (deck.length >= n - 1) break;
    deck.push(role);
  }
  while (deck.length < n) deck.push('citizen');
  return deck;
}

export function dealRoles<T extends Seat>(seats: readonly T[], settings: GameSettings, rng: Rng = Math.random): T[] {
  const deck = shuffle(buildRoleDeck(seats.length, settings), rng);
  return seats.map((s, i) => ({ ...s, role: deck[i], alive: true }));
}

// ── Votes ──────────────────────────────────────────────────────────────────

export interface Tally {
  targetId: string | null;
  counts: Record<string, number>;
  tie: boolean;
}

/** Day vote. Mayor counts double. A tie for first — incl. with SKIP — eliminates nobody. */
export function tallyVotes(votes: Record<string, string>, seats: readonly Seat[]): Tally {
  const byId = new Map(seats.map(s => [s.id, s]));
  const counts: Record<string, number> = {};
  for (const [voterId, targetId] of Object.entries(votes)) {
    const voter = byId.get(voterId);
    if (!voter?.alive) continue;
    if (targetId !== SKIP_VOTE && !byId.get(targetId)?.alive) continue;
    counts[targetId] = (counts[targetId] ?? 0) + (voter.role === 'mayor' ? 2 : 1);
  }
  const entries = Object.entries(counts);
  if (!entries.length) return { targetId: null, counts, tie: false };
  const top = Math.max(...entries.map(([, c]) => c));
  const leaders = entries.filter(([, c]) => c === top).map(([id]) => id);
  if (leaders.length > 1) return { targetId: null, counts, tie: true };
  return { targetId: leaders[0] === SKIP_VOTE ? null : leaders[0], counts, tie: false };
}

// ── Night ──────────────────────────────────────────────────────────────────

export const emptyNight = (): NightActions => ({ mafiaVotes: {}, doctor: null, detective: null, bodyguard: null, vigilante: null });

export interface NightContext {
  /** Doctor may not protect the same player two nights running. */
  lastDoctorTarget: string | null;
  vigilanteBullets: number;
}

/** Whether `actor` may target `target` tonight. */
export function canTargetAtNight(actor: Seat, target: Seat, ctx: NightContext): boolean {
  if (!actor.alive || !target.alive) return false;
  switch (actor.role) {
    case 'mafia':
    case 'godfather':
      return !isMafiaTeam(target.role);
    case 'doctor':
      return target.id !== ctx.lastDoctorTarget;
    case 'detective':
    case 'bodyguard':
      return target.id !== actor.id;
    case 'vigilante':
      return target.id !== actor.id && ctx.vigilanteBullets > 0;
    default:
      return false;
  }
}

export function hasNightAction(seat: Seat | undefined, ctx?: NightContext): boolean {
  if (!seat?.alive || !seat.role) return false;
  if (seat.role === 'vigilante') return (ctx?.vigilanteBullets ?? 1) > 0;
  return ROLE_INFO[seat.role].nightAction !== null;
}

/** Records a night choice in the right slot (validation is the caller's job). */
export function applyNightChoice(night: NightActions, actor: Seat, targetId: string): NightActions {
  switch (actor.role) {
    case 'mafia':
    case 'godfather':
      return { ...night, mafiaVotes: { ...night.mafiaVotes, [actor.id]: targetId } };
    case 'doctor':
      return { ...night, doctor: targetId };
    case 'detective':
      return { ...night, detective: targetId };
    case 'bodyguard':
      return { ...night, bodyguard: targetId };
    case 'vigilante':
      return { ...night, vigilante: targetId };
    default:
      return night;
  }
}

export function nightChoiceOf(night: NightActions, actor: Seat): string | null {
  switch (actor.role) {
    case 'mafia':
    case 'godfather':
      return night.mafiaVotes[actor.id] ?? null;
    case 'doctor':
      return night.doctor;
    case 'detective':
      return night.detective;
    case 'bodyguard':
      return night.bodyguard;
    case 'vigilante':
      return night.vigilante;
    default:
      return null;
  }
}

/** The mafia's chosen victim: the godfather's pick if he voted, else majority (random tie-break). */
export function mafiaTarget(seats: readonly Seat[], night: NightActions, rng: Rng = Math.random): string | null {
  const byId = new Map(seats.map(s => [s.id, s]));
  const valid = Object.entries(night.mafiaVotes).filter(([v, t]) => {
    const voter = byId.get(v);
    const target = byId.get(t);
    return voter?.alive && isMafiaTeam(voter.role) && target?.alive && !isMafiaTeam(target.role);
  });
  if (!valid.length) return null;
  const godfatherVote = valid.find(([v]) => byId.get(v)?.role === 'godfather');
  if (godfatherVote) return godfatherVote[1];
  const counts: Record<string, number> = {};
  for (const [, t] of valid) counts[t] = (counts[t] ?? 0) + 1;
  const top = Math.max(...Object.values(counts));
  return pick(Object.keys(counts).filter(id => counts[id] === top), rng) ?? null;
}

export interface NightResult {
  deaths: string[];
  /** Players the doctor or bodyguard kept alive. */
  saved: string[];
  bodyguardDied: boolean;
  vigilanteShot: string | null;
  investigation: { targetId: string; looksMafia: boolean } | null;
  usedBullet: boolean;
}

/**
 * Resolution order: mafia attack → bodyguard intercept → doctor heal →
 * vigilante shot (doctor also heals that) → detective learns the target's
 * apparent alignment (godfather reads innocent).
 */
export function resolveNight(seats: readonly Seat[], night: NightActions, ctx: NightContext, rng: Rng = Math.random): NightResult {
  const byId = new Map(seats.map(s => [s.id, s]));
  const roleAlive = (role: Role) => seats.find(s => s.alive && s.role === role);
  const doctor = roleAlive('doctor');
  const healed = doctor && night.doctor && canTargetAtNight(doctor, byId.get(night.doctor) ?? doctor, ctx) ? night.doctor : null;

  const deaths = new Set<string>();
  const saved = new Set<string>();
  let bodyguardDied = false;

  const attacked = mafiaTarget(seats, night, rng);
  if (attacked) {
    const bodyguard = roleAlive('bodyguard');
    if (bodyguard && night.bodyguard === attacked && bodyguard.id !== attacked) {
      saved.add(attacked);
      if (healed === bodyguard.id) saved.add(bodyguard.id);
      else {
        deaths.add(bodyguard.id);
        bodyguardDied = true;
      }
    } else if (healed === attacked) {
      saved.add(attacked);
    } else {
      deaths.add(attacked);
    }
  }

  let vigilanteShot: string | null = null;
  let usedBullet = false;
  const vigilante = roleAlive('vigilante');
  if (vigilante && night.vigilante && ctx.vigilanteBullets > 0) {
    const target = byId.get(night.vigilante);
    if (target && canTargetAtNight(vigilante, target, ctx)) {
      usedBullet = true;
      if (healed === target.id) saved.add(target.id);
      else {
        deaths.add(target.id);
        vigilanteShot = target.id;
      }
    }
  }

  const detective = roleAlive('detective');
  const investigated = detective && night.detective ? byId.get(night.detective) : undefined;
  const investigation = investigated ? { targetId: investigated.id, looksMafia: investigated.role === 'mafia' } : null;

  return { deaths: [...deaths], saved: [...saved].filter(id => !deaths.has(id)), bodyguardDied, vigilanteShot, investigation, usedBullet };
}

// ── Win conditions ─────────────────────────────────────────────────────────

export function checkWinner(seats: readonly Seat[], lynchedJester = false): Winner | null {
  if (lynchedJester) return 'jester';
  const alive = living(seats);
  const mafia = alive.filter(s => isMafiaTeam(s.role)).length;
  if (mafia === 0) return 'town';
  if (mafia >= alive.length - mafia) return 'mafia';
  return null;
}

export function didWin(role: Role | undefined, winner: Winner | null): boolean {
  if (!role || !winner) return false;
  if (winner === 'jester') return role === 'jester';
  const team = ROLE_INFO[role].team;
  return (winner === 'mafia' && team === 'mafia') || (winner === 'town' && team === 'town');
}
