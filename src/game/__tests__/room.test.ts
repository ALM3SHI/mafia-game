import { describe, expect, it } from 'vitest';
import { Room } from '../room';
import { isMafiaTeam } from '../roles';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setup(seed: number, bots = 6, roles: Partial<Room['settings']['roles']> = {}) {
  let clock = 1_000_000;
  let n = 0;
  const room = new Room({ code: 'TEST', mode: 'online', now: () => clock, rng: mulberry32(seed), idFactory: p => `${p}${++n}` });
  const host = room.join('عمر', '🎭');
  if (!host.ok) throw new Error('join');
  for (let i = 0; i < bots; i++) room.addBot(host.id);
  room.updateSettings(host.id, { roles: { ...room.settings.roles, ...roles } });
  const step = (ms = 250) => {
    clock += ms;
    room.tick();
  };
  return { room, hostId: host.id, step, advanceClock: (ms: number) => (clock += ms) };
}

describe('Room lobby', () => {
  it('first human is host, bots are ready, start requires 4', () => {
    let clock = 0;
    const room = new Room({ code: 'X', mode: 'online', now: () => clock++ });
    const a = room.join('أ', '🎭');
    expect(a.ok && room.player(a.id)?.isHost).toBe(true);
    expect(room.start(a.ok ? a.id : '').ok).toBe(false);
  });

  it('non-hosts cannot change settings, add bots or start', () => {
    const { room, hostId } = setup(1, 3);
    const guest = room.join('ضيف', '🙂');
    if (!guest.ok) throw new Error();
    expect(room.addBot(guest.id).ok).toBe(false);
    expect(room.updateSettings(guest.id, { mafiaCount: 3 }).ok).toBe(false);
    expect(room.start(guest.id).ok).toBe(false);
    expect(room.start(hostId).ok).toBe(false); // guest not ready
    room.setReady(guest.id, true);
    expect(room.start(hostId).ok).toBe(true);
  });

  it('duplicate names are made unique', () => {
    const { room } = setup(1, 0);
    const b = room.join('عمر', '🙂');
    expect(b.ok && room.player(b.id)?.name).toBe('عمر 2');
  });

  it('host leaving hands the crown to the next human', () => {
    const { room, hostId } = setup(1, 2);
    const g = room.join('ضيف', '🙂');
    room.leave(hostId);
    expect(g.ok && room.player(g.id)?.isHost).toBe(true);
  });
});

describe('Room full games', () => {
  const allRoles = { godfather: true, doctor: true, detective: true, bodyguard: true, vigilante: true, mayor: true, jester: true };
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    it(`seed ${seed}: bots-only flow terminates with a winner`, () => {
      const { room, hostId, step } = setup(seed, 9, allRoles);
      expect(room.start(hostId).ok).toBe(true);
      const phases = new Set<string>();
      for (let i = 0; i < 40_000 && room.phase !== 'game-over'; i++) {
        phases.add(room.phase);
        // Human "acts": votes skip, does nothing at night.
        if (room.phase === 'voting' && room.player(hostId)?.alive && !(hostId in room.votes)) room.vote(hostId, '__skip__');
        if (room.phase === 'testimony' && room.speakerId === hostId) room.endTurn(hostId);
        step(500);
      }
      expect(room.phase).toBe('game-over');
      expect(room.winner).not.toBeNull();
      for (const p of ['reveal', 'night', 'morning', 'testimony', 'discussion', 'voting']) expect(phases.has(p) || room.round <= 1).toBe(true);
    });
  }
});

describe('Room views never leak', () => {
  it('roles hidden from other players until death/game over; mafia see family', () => {
    const { room, hostId, step } = setup(3, 7);
    room.start(hostId);
    const view = room.viewFor(hostId);
    const me = room.player(hostId)!;
    for (const p of view.players) {
      const real = room.player(p.id)!;
      if (p.id === hostId) expect(p.role).toBe(me.role);
      else if (isMafiaTeam(me.role) && isMafiaTeam(real.role)) expect(p.role).toBe(real.role);
      else expect(p.role).toBeUndefined();
    }
    // Private events go only to their owner.
    const others = room.players.filter(p => p.id !== hostId);
    for (const o of others) {
      const evs = room.viewFor(o.id).events.filter(e => e.tone === 'private');
      expect(evs.every(e => !e.to || e.to.includes(o.id))).toBe(true);
    }
    step(10_000); // → night
    expect(room.phase).toBe('night');
  });

  it('mafia chat only reaches the mafia; dead chat only the dead', () => {
    const { room, hostId, step } = setup(5, 7);
    room.start(hostId);
    step(10_000);
    expect(room.phase).toBe('night');
    const mafia = room.players.find(p => isMafiaTeam(p.role))!;
    const town = room.players.find(p => !isMafiaTeam(p.role))!;
    // Force a human-ish author: speak as the mafia member via say().
    expect(room.say(mafia.id, 'نقتل مين؟').ok).toBe(true);
    expect(room.say(town.id, 'أنا صاحي').ok).toBe(false);
    expect(room.viewFor(town.id).chat.some(m => m.text === 'نقتل مين؟')).toBe(false);
    expect(room.viewFor(mafia.id).chat.some(m => m.text === 'نقتل مين؟')).toBe(true);
  });

  it('secret voting hides other votes until the verdict', () => {
    const { room, hostId, step } = setup(7, 6);
    room.updateSettings(hostId, { secretVoting: true });
    room.start(hostId);
    for (let i = 0; i < 20_000 && room.phase !== 'voting' && room.phase !== 'game-over'; i++) {
      if (room.phase === 'testimony' && room.speakerId === hostId) room.endTurn(hostId);
      step(500);
    }
    if (room.phase !== 'voting') return; // game ended on night 1
    const other = room.players.find(p => p.isBot && p.alive)!;
    room.vote(other.id, room.players.find(p => p.alive && p.id !== other.id)!.id);
    const v = room.viewFor(hostId);
    expect(Object.keys(v.votes)).not.toContain(other.id);
    expect(v.votedIds).toContain(other.id);
  });

  it('testimony: only the speaker may talk publicly', () => {
    const { room, hostId, step } = setup(9, 5);
    room.start(hostId);
    for (let i = 0; i < 20_000 && room.phase !== 'testimony' && room.phase !== 'game-over'; i++) step(500);
    if (room.phase !== 'testimony') return;
    const speaker = room.speakerId!;
    const silent = room.players.find(p => p.alive && p.id !== speaker)!;
    expect(room.say(silent.id, 'مرحبا').ok).toBe(false);
  });
});
