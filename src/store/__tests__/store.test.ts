import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../useGameStore';

const s = () => useGameStore.getState();
const advance = () => s().advancePhase(s().phaseToken);

describe('store flow', () => {
  beforeEach(() => {
    s().leaveRoom();
    s().createLocalRoom();
  });

  it('creates a room with me + 4 ready bots', () => {
    expect(s().players).toHaveLength(5);
    expect(s().players.filter(p => p.isBot).every(p => p.isReady)).toBe(true);
  });

  it('refuses to start until I am ready', () => {
    expect(s().startGame().ok).toBe(false);
    s().toggleReady(s().myId!);
    expect(s().startGame().ok).toBe(true);
    expect(s().phase).toBe('reveal');
  });

  it('cycles through phases in order and always ends', () => {
    s().toggleReady(s().myId!);
    s().startGame();
    const seen: string[] = [s().phase];
    for (let i = 0; i < 200 && s().phase !== 'game-over'; i++) {
      advance();
      seen.push(s().phase);
    }
    expect(s().phase).toBe('game-over');
    expect(s().winner).not.toBeNull();
    expect(seen.slice(0, 6)).toEqual(['reveal', 'night', 'reaction', 'testimony', 'day', 'voting'].slice(0, Math.min(6, seen.length)));
  });

  it('ignores stale timer tokens', () => {
    s().toggleReady(s().myId!);
    s().startGame();
    const stale = s().phaseToken;
    advance();
    const phase = s().phase;
    s().advancePhase(stale);
    expect(s().phase).toBe(phase);
  });

  it('only accepts votes during voting from the living', () => {
    s().toggleReady(s().myId!);
    s().startGame();
    const [a, b] = s().players;
    s().castVote(a.id, b.id);
    expect(s().votes).toEqual({});
  });

  it('back to lobby resets roles but keeps the table', () => {
    s().toggleReady(s().myId!);
    s().startGame();
    s().backToLobby();
    expect(s().phase).toBe('lobby');
    expect(s().players).toHaveLength(5);
    expect(s().players.every(p => p.role === undefined && p.isAlive)).toBe(true);
  });
});
