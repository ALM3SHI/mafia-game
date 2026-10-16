import { describe, expect, it } from 'vitest';
import {
  assignRoles,
  buildRoleDeck,
  canStartGame,
  checkWinner,
  chooseBotVote,
  clampMafiaCount,
  emptyNight,
  fillBotNightActions,
  resolveNight,
  shuffle,
  tallyVotes,
} from '../game-logic';
import { SKIP_VOTE, type GameSettings, type Player, type Role } from '../game-types';
import { DEFAULT_SETTINGS } from '@/store/useGameStore';

/** Deterministic RNG for repeatable tests. */
function seq(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

const mk = (id: string, role: Role, extra: Partial<Player> = {}): Player => ({
  id,
  name: id,
  avatar: '🙂',
  role,
  isAlive: true,
  isReady: true,
  isBot: true,
  ...extra,
});

const settings = (over: Partial<GameSettings> = {}): GameSettings => ({ ...DEFAULT_SETTINGS, ...over, roles: { ...DEFAULT_SETTINGS.roles, ...over.roles } });

describe('setup', () => {
  it('shuffle keeps every element', () => {
    const out = shuffle([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('clamps mafia to a third of the table', () => {
    expect(clampMafiaCount(5, 4)).toBe(1);
    expect(clampMafiaCount(5, 9)).toBe(3);
    expect(clampMafiaCount(0, 9)).toBe(1);
  });

  it('deals exactly one role per seat and respects min players', () => {
    const deck4 = buildRoleDeck(4, settings({ mafiaCount: 3 }));
    expect(deck4).toHaveLength(4);
    expect(deck4.filter(r => r === 'mafia')).toHaveLength(1);
    expect(deck4).not.toContain('doctor'); // doctor needs 5+

    const deck8 = buildRoleDeck(8, settings({ mafiaCount: 2, roles: { doctor: true, detective: true, mayor: true, jester: true } }));
    expect(deck8).toHaveLength(8);
    expect(deck8.filter(r => r === 'mafia')).toHaveLength(2);
    for (const r of ['doctor', 'detective', 'mayor', 'jester'] as Role[]) expect(deck8).toContain(r);
  });

  it('ignores disabled roles', () => {
    const deck = buildRoleDeck(8, settings({ roles: { doctor: false, detective: false, mayor: false, jester: false } }));
    expect(deck.every(r => r === 'mafia' || r === 'citizen')).toBe(true);
  });

  it('assigns roles and revives everyone', () => {
    const players = ['a', 'b', 'c', 'd', 'e'].map(id => mk(id, 'citizen', { isAlive: false }));
    const out = assignRoles(players, settings());
    expect(out.every(p => p.isAlive && p.role)).toBe(true);
  });

  it('requires 4 ready players', () => {
    expect(canStartGame([mk('a', 'citizen')]).ok).toBe(false);
    const four = ['a', 'b', 'c', 'd'].map(id => mk(id, 'citizen'));
    expect(canStartGame(four).ok).toBe(true);
    four[0].isReady = false;
    expect(canStartGame(four).ok).toBe(false);
  });
});

describe('voting', () => {
  const players = [mk('a', 'citizen'), mk('b', 'mafia'), mk('c', 'mayor'), mk('d', 'citizen')];

  it('majority wins', () => {
    expect(tallyVotes({ a: 'b', d: 'b', b: 'a' }, players).targetId).toBe('b');
  });

  it('tie means nobody is eliminated', () => {
    const r = tallyVotes({ a: 'b', b: 'a' }, players);
    expect(r.targetId).toBeNull();
    expect(r.tie).toBe(true);
  });

  it('mayor counts double', () => {
    expect(tallyVotes({ c: 'b', a: 'd' }, players).targetId).toBe('b');
  });

  it('skip majority eliminates nobody', () => {
    expect(tallyVotes({ a: SKIP_VOTE, d: SKIP_VOTE, b: 'a' }, players).targetId).toBeNull();
  });

  it('ignores dead voters and dead targets', () => {
    const withDead = players.map(p => (p.id === 'd' ? { ...p, isAlive: false } : p));
    // d is dead: its vote and votes for it are dropped. Mayor's skip (2) beats b→a (1).
    expect(tallyVotes({ d: 'a', a: 'd', b: 'a', c: SKIP_VOTE }, withDead)).toEqual({ targetId: null, tie: false, counts: { a: 1, [SKIP_VOTE]: 2 } });
  });

  it('mafia bots never vote for a teammate', () => {
    const table = [mk('m1', 'mafia'), mk('m2', 'mafia'), mk('t1', 'citizen')];
    for (let i = 0; i < 50; i++) expect(chooseBotVote(table[0], table)).not.toBe('m2');
  });
});

describe('night', () => {
  const base = [mk('m', 'mafia'), mk('doc', 'doctor'), mk('det', 'detective'), mk('c1', 'citizen'), mk('c2', 'citizen')];

  it('mafia kill lands', () => {
    const r = resolveNight(base, { ...emptyNight(), mafiaVotes: { m: 'c1' } });
    expect(r.killedId).toBe('c1');
    expect(r.players.find(p => p.id === 'c1')?.isAlive).toBe(false);
  });

  it('doctor saves the target', () => {
    const r = resolveNight(base, { mafiaVotes: { m: 'c1' }, doctorTarget: 'c1', detectiveTarget: null });
    expect(r.killedId).toBeNull();
    expect(r.savedId).toBe('c1');
  });

  it('votes from non-mafia are ignored (old bug: anyone could kill at night)', () => {
    const r = resolveNight(base, { ...emptyNight(), mafiaVotes: { c2: 'c1' } });
    expect(r.killedId).toBeNull();
  });

  it('detective learns the truth', () => {
    const r = resolveNight(base, { ...emptyNight(), detectiveTarget: 'm' });
    expect(r.investigation).toEqual({ targetId: 'm', isMafia: true });
  });

  it('bot mafia follow a teammate pick', () => {
    const table = [mk('human', 'mafia', { isBot: false }), mk('m2', 'mafia'), mk('c1', 'citizen'), mk('c2', 'citizen')];
    const n = fillBotNightActions(table, { ...emptyNight(), mafiaVotes: { human: 'c2' } }, seq(0.1));
    expect(n.mafiaVotes.m2).toBe('c2');
  });
});

describe('win conditions', () => {
  it('town wins with no mafia', () => {
    expect(checkWinner([mk('a', 'citizen'), mk('m', 'mafia', { isAlive: false })])).toBe('town');
  });
  it('mafia wins at parity', () => {
    expect(checkWinner([mk('a', 'citizen'), mk('m', 'mafia')])).toBe('mafia');
  });
  it('game continues otherwise', () => {
    expect(checkWinner([mk('a', 'citizen'), mk('b', 'citizen'), mk('m', 'mafia')])).toBeNull();
  });
  it('jester lynch wins', () => {
    expect(checkWinner([mk('a', 'citizen')], true)).toBe('jester');
  });
});
