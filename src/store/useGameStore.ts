import { create } from 'zustand';
import {
  SKIP_VOTE,
  type GameSettings,
  type LogEntry,
  type LogType,
  type NightActions,
  type Phase,
  type Player,
  type Winner,
} from '@/lib/game-types';
import {
  MAX_PLAYERS,
  alive,
  assignRoles,
  botChatLine,
  canStartGame,
  canTargetAtNight,
  checkWinner,
  chooseBotVote,
  clampMafiaCount,
  didPlayerWin,
  emptyNight,
  fillBotNightActions,
  resolveNight,
  tallyVotes,
} from '@/lib/game-logic';
import { ROLE_INFO } from '@/lib/roles';

export type { Phase, Player, Role, GameSettings, Winner } from '@/lib/game-types';

const REVEAL_SECONDS = 8;
const REACTION_SECONDS = 7;
const BOT_AVATARS = ['🤖', '🦾', '⚙️', '👾', '🦊', '🐺', '🦉', '🐍'];
const BOT_NAMES = ['الذيب', 'أبو سروال', 'الصقر', 'الغامض', 'النمر', 'الشبح', 'الظل', 'البومة', 'الثعلب', 'الأفعى', 'العقرب'];

export interface Profile {
  username: string;
  avatar: string;
  level: number;
  wins: number;
  gamesPlayed: number;
  gems: number;
}

interface GameState {
  roomCode: string | null;
  players: Player[];
  myId: string | null;
  profile: Profile;
  settings: GameSettings;

  phase: Phase;
  /** Increments on every transition; lets timers ignore stale callbacks. */
  phaseToken: number;
  phaseStartedAt: number;
  phaseEndsAt: number;
  round: number;
  winner: Winner | null;

  votes: Record<string, string>;
  night: NightActions;
  logs: LogEntry[];
  /** Id of whoever died last night / was lynched last vote (for UI FX). */
  lastDeathId: string | null;

  // Lobby
  createLocalRoom: () => void;
  addBot: () => void;
  removePlayer: (id: string) => void;
  toggleReady: (id: string) => void;
  updateSettings: (updates: Partial<GameSettings>) => void;
  setProfileName: (name: string) => void;

  // Game flow
  startGame: () => { ok: boolean; reason?: string };
  advancePhase: (token: number) => void;
  endMyTestimony: () => void;
  castVote: (voterId: string, targetId: string) => void;
  submitNightAction: (actorId: string, targetId: string) => void;
  botTick: () => void;
  addLog: (text: string, type?: LogType) => void;
  backToLobby: () => void;
  leaveRoom: () => void;
}

let logSeq = 0;
const log = (text: string, type: LogType = 'info'): LogEntry => ({ id: ++logSeq, text, type });
const MAX_LOGS = 60;
const appendLogs = (logs: LogEntry[], ...entries: LogEntry[]) => [...logs, ...entries].slice(-MAX_LOGS);

const randomCode = () => `MAFIA-${Math.floor(100 + Math.random() * 900)}`;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function phaseDurationMs(phase: Phase, settings: GameSettings, players: Player[]): number {
  switch (phase) {
    case 'reveal':
      return REVEAL_SECONDS * 1000;
    case 'night':
      return settings.nightDuration * 1000;
    case 'reaction':
      return REACTION_SECONDS * 1000;
    case 'testimony':
      return Math.max(1, alive(players).length) * settings.testimonyDuration * 1000;
    case 'day':
      return settings.dayDuration * 1000;
    case 'voting':
      return settings.voteDuration * 1000;
    default:
      return 0;
  }
}

const PHASE_LABEL: Record<Phase, string> = {
  lobby: 'الانتظار',
  reveal: 'كشف الأدوار',
  night: 'الليل',
  reaction: 'الصباح',
  testimony: 'الشهادات',
  day: 'النقاش العام',
  voting: 'التصويت',
  'game-over': 'نهاية اللعبة',
};

const WIN_TEXT: Record<Winner, string> = {
  town: '🎉 انتصر المواطنون! تم القضاء على جميع المافيا.',
  mafia: '💀 انتصرت المافيا! سيطروا على المدينة.',
  jester: '🃏 فاز المهرج! خدعكم وطردتوه بأيديكم.',
};

/** Current testimony speaker, derived from elapsed time (no extra state to desync). */
export function currentTestimonySpeaker(state: Pick<GameState, 'phase' | 'players' | 'phaseStartedAt' | 'settings'>, now: number): Player | null {
  if (state.phase !== 'testimony') return null;
  const living = alive(state.players);
  const idx = Math.floor((now - state.phaseStartedAt) / (state.settings.testimonyDuration * 1000));
  return living[Math.min(Math.max(idx, 0), living.length - 1)] ?? null;
}

export const DEFAULT_SETTINGS: GameSettings = {
  mafiaCount: 1,
  testimonyDuration: 15,
  dayDuration: 45,
  voteDuration: 20,
  nightDuration: 20,
  secretVoting: false,
  revealRolesOnDeath: true,
  roles: { doctor: true, detective: true, mayor: false, jester: false },
};

export const useGameStore = create<GameState>((set, get) => {
  /** Moves to `phase`, stamping fresh timers. Returns a partial state. */
  const enter = (phase: Phase, players: Player[], extra: Partial<GameState> = {}): Partial<GameState> => {
    const now = Date.now();
    const s = get();
    return {
      phase,
      players,
      phaseToken: s.phaseToken + 1,
      phaseStartedAt: now,
      phaseEndsAt: now + phaseDurationMs(phase, s.settings, players),
      ...extra,
    };
  };

  const finish = (players: Player[], winner: Winner, logs: LogEntry[]): Partial<GameState> => {
    const s = get();
    const me = players.find(p => p.id === s.myId);
    const won = didPlayerWin(me, winner);
    return {
      ...enter('game-over', players),
      winner,
      logs: appendLogs(logs, log(WIN_TEXT[winner], winner === 'town' ? 'special' : 'danger')),
      profile: {
        ...s.profile,
        gamesPlayed: s.profile.gamesPlayed + 1,
        wins: s.profile.wins + (won ? 1 : 0),
        gems: s.profile.gems + (won ? 50 : 10),
        level: 1 + Math.floor((s.profile.gamesPlayed + 1) / 3),
      },
    };
  };

  return {
    roomCode: null,
    players: [],
    myId: null,
    profile: { username: 'بطل الليل', avatar: '🎭', level: 1, wins: 0, gamesPlayed: 0, gems: 0 },
    settings: DEFAULT_SETTINGS,

    phase: 'lobby',
    phaseToken: 0,
    phaseStartedAt: 0,
    phaseEndsAt: 0,
    round: 0,
    winner: null,
    votes: {},
    night: emptyNight(),
    logs: [],
    lastDeathId: null,

    // ── Lobby ─────────────────────────────────────────────────────────────
    createLocalRoom: () => {
      const s = get();
      if (s.players.length > 0 && s.myId) return;
      const myId = uid('me');
      const me: Player = {
        id: myId,
        name: s.profile.username,
        avatar: s.profile.avatar,
        isAlive: true,
        isReady: false,
        isBot: false,
        isHost: true,
      };
      set({ roomCode: randomCode(), myId, players: [me], phase: 'lobby', logs: [] });
      for (let i = 0; i < 4; i++) get().addBot();
    },

    addBot: () =>
      set(s => {
        if (s.players.length >= MAX_PLAYERS) return {};
        const used = new Set(s.players.map(p => p.name));
        const name = BOT_NAMES.find(n => !used.has(n)) ?? `بوت ${s.players.length + 1}`;
        const bot: Player = {
          id: uid('bot'),
          name,
          avatar: BOT_AVATARS[s.players.length % BOT_AVATARS.length],
          isAlive: true,
          isReady: true, // bots are always ready
          isBot: true,
        };
        const players = [...s.players, bot];
        return {
          players,
          settings: { ...s.settings, mafiaCount: clampMafiaCount(s.settings.mafiaCount, players.length) },
        };
      }),

    removePlayer: id =>
      set(s => {
        if (id === s.myId) return {};
        const players = s.players.filter(p => p.id !== id);
        return {
          players,
          settings: { ...s.settings, mafiaCount: clampMafiaCount(s.settings.mafiaCount, players.length) },
        };
      }),

    toggleReady: id =>
      set(s => ({ players: s.players.map(p => (p.id === id ? { ...p, isReady: !p.isReady } : p)) })),

    updateSettings: updates =>
      set(s => {
        const settings = { ...s.settings, ...updates, roles: { ...s.settings.roles, ...updates.roles } };
        settings.mafiaCount = clampMafiaCount(settings.mafiaCount, Math.max(s.players.length, 3));
        return { settings };
      }),

    setProfileName: name =>
      set(s => {
        const username = name.trim().slice(0, 20) || s.profile.username;
        return {
          profile: { ...s.profile, username },
          players: s.players.map(p => (p.id === s.myId ? { ...p, name: username } : p)),
        };
      }),

    // ── Game flow ─────────────────────────────────────────────────────────
    startGame: () => {
      const s = get();
      const check = canStartGame(s.players);
      if (!check.ok) return check;
      const players = assignRoles(s.players, s.settings);
      const me = players.find(p => p.id === s.myId);
      const intro = [log('🎴 تم توزيع الأدوار. احفظ دورك ولا تكشفه لأحد!', 'special')];
      if (me?.role) {
        intro.push(log(`${ROLE_INFO[me.role].icon} دورك: ${ROLE_INFO[me.role].name} — ${ROLE_INFO[me.role].description}`, 'special'));
        if (me.role === 'mafia') {
          const mates = players.filter(p => p.role === 'mafia' && p.id !== me.id).map(p => p.name);
          if (mates.length) intro.push(log(`🤝 شركاؤك في المافيا: ${mates.join('، ')}`, 'danger'));
        }
      }
      set({
        ...enter('reveal', players),
        round: 0,
        winner: null,
        votes: {},
        night: emptyNight(),
        lastDeathId: null,
        logs: intro,
      });
      return { ok: true };
    },

    advancePhase: token => {
      const s = get();
      if (token !== s.phaseToken) return; // stale timer
      const { phase } = s;

      if (phase === 'reveal') {
        set({ ...enter('night', s.players), round: 1, night: emptyNight(), logs: appendLogs(s.logs, log('🌙 الليلة الأولى. المدينة نائمة...', 'special')) });
        return;
      }

      if (phase === 'night') {
        const actions = fillBotNightActions(s.players, s.night);
        const result = resolveNight(s.players, actions);
        const logs = [...s.logs];
        const me = result.players.find(p => p.id === s.myId);

        if (result.killedId) {
          const victim = result.players.find(p => p.id === result.killedId)!;
          const roleTxt = s.settings.revealRolesOnDeath && victim.role ? ` وكان ${ROLE_INFO[victim.role].name}` : '';
          logs.push(log(`💀 وُجد ${victim.name} مقتولاً صباحاً${roleTxt}.`, 'danger'));
        } else if (result.savedId) {
          logs.push(log('💉 حاولت المافيا القتل، لكن الطبيب أنقذ الضحية!', 'special'));
        } else {
          logs.push(log('🕊️ مرّ الليل بسلام ولم يُقتل أحد.', 'special'));
        }
        // Only the human detective learns the result.
        if (result.investigation && me?.role === 'detective' && s.night.detectiveTarget) {
          const t = result.players.find(p => p.id === result.investigation!.targetId);
          logs.push(log(`🔍 نتيجة تحقيقك: ${t?.name} ${result.investigation.isMafia ? 'من المافيا!' : 'ليس من المافيا.'}`, result.investigation.isMafia ? 'danger' : 'special'));
        }

        const winner = checkWinner(result.players);
        if (winner) {
          set({ ...finish(result.players, winner, logs), lastDeathId: result.killedId, night: actions });
          return;
        }
        set({ ...enter('reaction', result.players), lastDeathId: result.killedId, night: actions, logs: appendLogs(logs) });
        return;
      }

      if (phase === 'reaction') {
        set({ ...enter('testimony', s.players), logs: appendLogs(s.logs, log('🎙️ وقت الشهادات: كل لاعب يتكلم بدوره.', 'special')) });
        return;
      }

      if (phase === 'testimony') {
        set({ ...enter('day', s.players), logs: appendLogs(s.logs, log('🗣️ النقاش مفتوح للجميع.', 'special')) });
        return;
      }

      if (phase === 'day') {
        set({ ...enter('voting', s.players), votes: {}, logs: appendLogs(s.logs, log('⚖️ بدأ التصويت! اختر من تريد طرده أو تجاوز.', 'special')) });
        return;
      }

      if (phase === 'voting') {
        // Bots that never got around to voting do so now.
        const votes = { ...s.votes };
        for (const bot of alive(s.players).filter(p => p.isBot && !(p.id in votes))) {
          votes[bot.id] = chooseBotVote(bot, s.players);
        }
        const tally = tallyVotes(votes, s.players);
        const logs = [...s.logs];
        let players = s.players;
        let lynchedJester = false;

        if (tally.targetId) {
          const target = players.find(p => p.id === tally.targetId)!;
          players = players.map(p => (p.id === target.id ? { ...p, isAlive: false } : p));
          lynchedJester = target.role === 'jester';
          const roleTxt = s.settings.revealRolesOnDeath && target.role ? ` وكان ${ROLE_INFO[target.role].name}` : '';
          logs.push(log(`⚖️ قرر الشعب طرد ${target.name} بـ ${tally.counts[target.id]} صوت${roleTxt}.`, 'danger'));
        } else {
          logs.push(log(tally.tie ? '🤝 تعادل في الأصوات — لم يُطرد أحد.' : '⏭️ قرر الشعب عدم طرد أحد.', 'info'));
        }

        const winner = checkWinner(players, lynchedJester);
        if (winner) {
          set({ ...finish(players, winner, logs), votes, lastDeathId: tally.targetId });
          return;
        }
        set({
          ...enter('night', players),
          votes,
          round: s.round + 1,
          night: emptyNight(),
          lastDeathId: tally.targetId,
          logs: appendLogs(logs, log(`🌙 الليلة ${s.round + 1}. المدينة نائمة...`, 'special')),
        });
      }
    },

    endMyTestimony: () => {
      const s = get();
      const now = Date.now();
      const speaker = currentTestimonySpeaker(s, now);
      if (!speaker || speaker.id !== s.myId) return;
      const slot = s.settings.testimonyDuration * 1000;
      const elapsedInSlot = (now - s.phaseStartedAt) % slot;
      const skip = slot - elapsedInSlot;
      set({ phaseStartedAt: s.phaseStartedAt - skip, phaseEndsAt: s.phaseEndsAt - skip });
    },

    castVote: (voterId, targetId) =>
      set(s => {
        if (s.phase !== 'voting') return {};
        const voter = s.players.find(p => p.id === voterId);
        const target = s.players.find(p => p.id === targetId);
        if (!voter?.isAlive) return {};
        if (targetId !== SKIP_VOTE && (!target?.isAlive || target.id === voter.id)) return {};
        return { votes: { ...s.votes, [voterId]: targetId } };
      }),

    submitNightAction: (actorId, targetId) =>
      set(s => {
        if (s.phase !== 'night') return {};
        const actor = s.players.find(p => p.id === actorId);
        const target = s.players.find(p => p.id === targetId);
        if (!actor || !target || !canTargetAtNight(actor, target)) return {};
        if (actor.role === 'mafia') return { night: { ...s.night, mafiaVotes: { ...s.night.mafiaVotes, [actorId]: targetId } } };
        if (actor.role === 'doctor') return { night: { ...s.night, doctorTarget: targetId } };
        if (actor.role === 'detective') return { night: { ...s.night, detectiveTarget: targetId } };
        return {};
      }),

    /** Called by the game screen every couple of seconds to animate bots. */
    botTick: () => {
      const s = get();
      const bots = alive(s.players).filter(p => p.isBot);
      if (bots.length === 0) return;

      if (s.phase === 'day' && Math.random() < 0.35) {
        const bot = bots[Math.floor(Math.random() * bots.length)];
        set({ logs: appendLogs(s.logs, log(`${bot.name}: ${botChatLine(bot, s.players)}`, 'chat')) });
      }

      if (s.phase === 'voting') {
        const pending = bots.filter(b => !(b.id in s.votes));
        const voter = pending[Math.floor(Math.random() * pending.length)];
        if (voter && Math.random() < 0.6) get().castVote(voter.id, chooseBotVote(voter, s.players));
      }

      if (s.phase === 'night') {
        // Bot mafia follow a human mafia's pick as soon as it exists, so the
        // human sees their team converge on a target.
        const humanMafiaPick = Object.entries(s.night.mafiaVotes).find(([id]) => !s.players.find(p => p.id === id)?.isBot)?.[1];
        if (humanMafiaPick) {
          const mafiaBots = bots.filter(b => b.role === 'mafia' && s.night.mafiaVotes[b.id] !== humanMafiaPick);
          for (const b of mafiaBots) get().submitNightAction(b.id, humanMafiaPick);
        }
      }
    },

    addLog: (text, type = 'info') => set(s => ({ logs: appendLogs(s.logs, log(text, type)) })),

    backToLobby: () =>
      set(s => ({
        phase: 'lobby',
        phaseToken: s.phaseToken + 1,
        round: 0,
        winner: null,
        votes: {},
        night: emptyNight(),
        logs: [],
        lastDeathId: null,
        players: s.players.map(p => ({ ...p, role: undefined, isAlive: true, isReady: p.isBot })),
      })),

    leaveRoom: () =>
      set(s => ({
        roomCode: null,
        players: [],
        myId: null,
        phase: 'lobby',
        phaseToken: s.phaseToken + 1,
        winner: null,
        votes: {},
        night: emptyNight(),
        logs: [],
      })),
  };
});

export { PHASE_LABEL };
