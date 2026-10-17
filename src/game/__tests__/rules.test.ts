import { describe, expect, it } from 'vitest';
import { buildRoleDeck, checkWinner, clampMafiaCount, emptyNight, mafiaTarget, resolveNight, tallyVotes, type Seat } from '../rules';
import { DEFAULT_SETTINGS } from '../room';
import { SKIP_VOTE, type GameSettings, type Role } from '../types';

const s = (id: string, role: Role, alive = true): Seat => ({ id, role, alive });
const cfg = (over: Partial<GameSettings> = {}): GameSettings => ({ ...DEFAULT_SETTINGS, ...over, roles: { ...DEFAULT_SETTINGS.roles, ...over.roles } });
const ctx = { lastDoctorTarget: null, vigilanteBullets: 1 };

describe('deck', () => {
  it('caps mafia at a third', () => {
    expect(clampMafiaCount(9, 6)).toBe(2);
    expect(clampMafiaCount(0, 6)).toBe(1);
  });
  it('godfather replaces one mafia from 7 players', () => {
    const d = buildRoleDeck(9, cfg({ mafiaCount: 3 }));
    expect(d).toHaveLength(9);
    expect(d.filter(r => r === 'godfather')).toHaveLength(1);
    expect(d.filter(r => r === 'mafia')).toHaveLength(2);
  });
  it('small tables get no specials beyond what fits', () => {
    const d = buildRoleDeck(4, cfg());
    expect(d).toEqual(expect.arrayContaining(['mafia']));
    expect(d).not.toContain('doctor');
    expect(d.filter(r => r === 'citizen').length).toBeGreaterThanOrEqual(1);
  });
  it('every enabled role appears on a big table', () => {
    const all = { godfather: true, doctor: true, detective: true, bodyguard: true, vigilante: true, mayor: true, jester: true };
    const d = buildRoleDeck(14, cfg({ mafiaCount: 4, roles: all }));
    for (const r of Object.keys(all)) expect(d).toContain(r);
    expect(d).toHaveLength(14);
  });
});

describe('votes', () => {
  const t = [s('a', 'citizen'), s('b', 'mafia'), s('m', 'mayor'), s('d', 'citizen')];
  it('mayor counts double', () => expect(tallyVotes({ m: 'b', a: 'd' }, t).targetId).toBe('b'));
  it('tie → nobody', () => expect(tallyVotes({ a: 'b', b: 'a' }, t)).toMatchObject({ targetId: null, tie: true }));
  it('skip majority → nobody', () => expect(tallyVotes({ a: SKIP_VOTE, d: SKIP_VOTE, b: 'a' }, t).targetId).toBeNull());
});

describe('night', () => {
  const table = [s('gf', 'godfather'), s('m', 'mafia'), s('doc', 'doctor'), s('det', 'detective'), s('bg', 'bodyguard'), s('vig', 'vigilante'), s('c1', 'citizen'), s('c2', 'citizen')];

  it('godfather vote decides the target', () => {
    expect(mafiaTarget(table, { ...emptyNight(), mafiaVotes: { gf: 'c1', m: 'c2' } })).toBe('c1');
  });
  it('non-mafia votes are ignored', () => {
    expect(mafiaTarget(table, { ...emptyNight(), mafiaVotes: { c2: 'c1' } })).toBeNull();
  });
  it('doctor heal saves', () => {
    const r = resolveNight(table, { ...emptyNight(), mafiaVotes: { m: 'c1' }, doctor: 'c1' }, ctx);
    expect(r.deaths).toEqual([]);
    expect(r.saved).toEqual(['c1']);
  });
  it('doctor cannot heal the same player twice in a row', () => {
    const r = resolveNight(table, { ...emptyNight(), mafiaVotes: { m: 'c1' }, doctor: 'c1' }, { ...ctx, lastDoctorTarget: 'c1' });
    expect(r.deaths).toEqual(['c1']);
  });
  it('bodyguard dies instead of the target', () => {
    const r = resolveNight(table, { ...emptyNight(), mafiaVotes: { m: 'c1' }, bodyguard: 'c1' }, ctx);
    expect(r.deaths).toEqual(['bg']);
    expect(r.bodyguardDied).toBe(true);
    expect(r.saved).toContain('c1');
  });
  it('vigilante shot kills and spends the bullet', () => {
    const r = resolveNight(table, { ...emptyNight(), vigilante: 'm' }, ctx);
    expect(r.deaths).toEqual(['m']);
    expect(r.usedBullet).toBe(true);
    const none = resolveNight(table, { ...emptyNight(), vigilante: 'm' }, { ...ctx, vigilanteBullets: 0 });
    expect(none.deaths).toEqual([]);
  });
  it('godfather reads innocent to the detective, mafia does not', () => {
    expect(resolveNight(table, { ...emptyNight(), detective: 'gf' }, ctx).investigation).toEqual({ targetId: 'gf', looksMafia: false });
    expect(resolveNight(table, { ...emptyNight(), detective: 'm' }, ctx).investigation).toEqual({ targetId: 'm', looksMafia: true });
  });
  it('double kill: mafia + vigilante same night', () => {
    const r = resolveNight(table, { ...emptyNight(), mafiaVotes: { m: 'c1' }, vigilante: 'c2' }, ctx);
    expect(r.deaths.sort()).toEqual(['c1', 'c2']);
  });
});

describe('winner', () => {
  it('town / mafia / ongoing / jester', () => {
    expect(checkWinner([s('a', 'citizen'), s('m', 'mafia', false)])).toBe('town');
    expect(checkWinner([s('a', 'citizen'), s('m', 'godfather')])).toBe('mafia');
    expect(checkWinner([s('a', 'citizen'), s('b', 'citizen'), s('m', 'mafia')])).toBeNull();
    expect(checkWinner([s('a', 'citizen')], true)).toBe('jester');
  });
});
