import { create } from 'zustand';
import { distributeRoles } from '@/lib/game-logic';

export type Role = 'mafia' | 'citizen' | 'doctor' | 'police' | 'witch' | 'spectator';
export type Phase = 'lobby' | 'reveal' | 'testimony' | 'day' | 'night' | 'reaction' | 'voting' | 'game-over';

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  cardArt?: string;
  role?: Role;
  isAlive: boolean;
  isReady: boolean;
  isBot?: boolean;
  voteCount: number;
}

export interface GameSettings {
  mafiaCount: number;
  discussionDuration: number;
  dayDuration: number;
  voteDuration: number;
  nightDuration: number;
  secretVoting: boolean;
  revealRolesOnDeath: boolean;
  roles: {
    doctor: boolean;
    detective: boolean;
    bodyguard: boolean;
    mayor: boolean;
    medium: boolean;
    jester: boolean;
    sk: boolean;
    executioner: boolean;
    witch: boolean;
  };
}

interface GameState {
  roomCode: string | null;
  players: Player[];
  currentPhase: Phase;
  dayCount: number;
  winner: 'town' | 'mafia' | null;
  myId: string | null;

  profile: {
    username: string;
    avatar: string;
    level: number;
    wins: number;
    gems: number;
  } | null;

  settings: GameSettings;

  logs: { text: string; type?: 'danger' | 'special' | 'info' }[];
  currentSpeakerId: string | null;
  votes: Record<string, string>; // voterId -> targetId

  // Actions
  addLog: (text: string, type?: 'danger' | 'special' | 'info') => void;
  setSpeaker: (id: string | null) => void;
  castVote: (voterId: string, targetId: string) => void;
  clearVotes: () => void;
  updateSettings: (updates: Partial<GameSettings>) => void;
  addBot: () => void;
  removePlayer: (id: string) => void;
  startNextPhase: () => void;
  setProfile: (profile: any) => void;
  setRoomCode: (code: string) => void;
  setPlayers: (players: Player[]) => void;
  setPhase: (phase: Phase) => void;
  nextDay: () => void;
  setWinner: (winner: 'town' | 'mafia' | null) => void;
  setMyId: (id: string) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  roomCode: null,
  players: [],
  currentPhase: 'lobby',
  dayCount: 1,
  winner: null,
  myId: null,
  profile: {
    username: 'بطل الليل',
    avatar: '🎭',
    level: 1,
    wins: 12,
    gems: 2450
  },

  settings: {
    mafiaCount: 2,
    discussionDuration: 30,
    dayDuration: 15,
    voteDuration: 15,
    nightDuration: 15,
    secretVoting: false,
    revealRolesOnDeath: true,
    roles: {
      doctor: true,
      detective: true,
      bodyguard: false,
      mayor: false,
      medium: false,
      jester: false,
      sk: false,
      executioner: false,
      witch: false,
    }
  },

  logs: [],
  currentSpeakerId: null,
  votes: {},

  addLog: (text, type) => set((state) => ({
    logs: [...state.logs.slice(-5), { text, type }]
  })),
  setSpeaker: (id) => set({ currentSpeakerId: id }),
  castVote: (voterId, targetId) => set((state) => ({
    votes: { ...state.votes, [voterId]: targetId }
  })),
  clearVotes: () => set({ votes: {} }),

  updateSettings: (updates) => set((state) => ({
    settings: { ...state.settings, ...updates }
  })),

  addBot: () => set((state) => {
    const botId = `bot-${Date.now()}`;
    const newBot: Player = {
      id: botId,
      name: `بوت ${state.players.length + 1}`,
      avatar: ['🤖', '🦾', '⚙️', '👾'][Math.floor(Math.random() * 4)],
      isAlive: true,
      isReady: false,
      isBot: true,
      voteCount: 0,
      cardArt: '/cards/citizen.png'
    };
    return { players: [...state.players, newBot] };
  }),

  removePlayer: (id) => set((state) => ({
    players: state.players.filter(p => p.id !== id)
  })),

  startNextPhase: () => set((state) => {
    const gameSequence: Phase[] = ['testimony', 'day', 'night', 'reaction', 'voting'];
    let nextPhase: Phase = 'lobby';
    let nextDay = state.dayCount;
    let updatedPlayers = [...state.players];
    let newLogs = [...state.logs];

    // 1. Distribute roles when starting the game (leaving lobby)
    if (state.currentPhase === 'lobby') {
      updatedPlayers = distributeRoles(updatedPlayers, state.settings.mafiaCount);
    }

    // --- Process Votes/Actions before changing phase ---
    if (state.currentPhase === 'night') {
      const mafiaVotes = Object.values(state.votes);
      if (mafiaVotes.length > 0) {
        const counts = mafiaVotes.reduce((acc, val) => {
          acc[val] = (acc[val] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const victimId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        const victim = updatedPlayers.find(p => p.id === victimId);
        if (victim) {
          updatedPlayers = updatedPlayers.map(p => p.id === victimId ? { ...p, isAlive: false } : p);
          newLogs.push({ text: `💀 تم العثور على [${victim.name}] مفارقاً للحياة صباحاً.`, type: 'danger' });
        }
      } else {
        newLogs.push({ text: `🕊️ مر الليل بسلام ولم يُقتل أحد.`, type: 'special' });
      }
    } else if (state.currentPhase === 'voting') {
      const allVotes = Object.values(state.votes);
      if (allVotes.length > 0) {
        const counts = allVotes.reduce((acc, val) => {
          acc[val] = (acc[val] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const executedId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        const target = updatedPlayers.find(p => p.id === executedId);
        if (target) {
          updatedPlayers = updatedPlayers.map(p => p.id === executedId ? { ...p, isAlive: false } : p);
          newLogs.push({ text: `⚖️ قرر الشعب إعدام [${target.name}].`, type: 'danger' });
        }
      }
    }

    // 2. Check Win Conditions (ONLY if not in setup phases)
    if (state.currentPhase !== 'lobby' && state.currentPhase !== 'reveal') {
      const aliveMafia = updatedPlayers.filter(p => p.isAlive && p.role === 'mafia').length;
      const aliveCitizens = updatedPlayers.filter(p => p.isAlive && p.role !== 'mafia').length;

      if (aliveMafia === 0) {
        return {
          players: updatedPlayers,
          currentPhase: 'game-over',
          winner: 'town',
          logs: [...newLogs, { text: '🎉 انتصر المواطنون! تم القضاء على جميع المافيا.', type: 'special' }]
        };
      } else if (aliveMafia >= aliveCitizens) {
        return {
          players: updatedPlayers,
          currentPhase: 'game-over',
          winner: 'mafia',
          logs: [...newLogs, { text: '💀 انتصرت المافيا! لقد سيطروا على المدينة.', type: 'danger' }]
        };
      }
    }

    // --- Determine Next Phase ---
    if (state.currentPhase === 'lobby') {
      nextPhase = 'reveal';
    } else if (state.currentPhase === 'reveal') {
      nextPhase = 'testimony';
    } else {
      const currentIndex = gameSequence.indexOf(state.currentPhase);
      nextPhase = gameSequence[(currentIndex + 1) % gameSequence.length];
      if (nextPhase === 'testimony') nextDay += 1;
    }

    return {
      currentPhase: nextPhase,
      dayCount: nextDay,
      players: updatedPlayers,
      votes: {},
      currentSpeakerId: null,
      logs: [...newLogs, { text: `بداية مرحلة: ${nextPhase.toUpperCase()}`, type: 'special' }]
    };
  }),

  setProfile: (profile) => set({ profile }),
  setRoomCode: (code) => set({ roomCode: code }),
  setPlayers: (players) => set({ players }),
  setPhase: (phase) => set({ currentPhase: phase }),
  nextDay: () => set((state) => ({ dayCount: state.dayCount + 1 })),
  setWinner: (winner) => set({ winner }),
  setMyId: (id) => set({ myId: id }),
  updatePlayer: (id, updates) =>
    set((state) => ({
      players: state.players.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  resetGame: () => set((state) => ({
    dayCount: 1,
    winner: null,
    logs: [],
    currentSpeakerId: null,
    votes: {},
    players: state.players.map(p => ({ ...p, isAlive: true, voteCount: 0 })),
    currentPhase: 'lobby'
  })),
}));
