'use client';

/**
 * Player profile, stats, achievements, cosmetics and preferences — saved in
 * this browser (localStorage). Hydrated once on mount by <Providers/> so the
 * server render and the first client render match.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ROLE_INFO } from '@/game/roles';
import { didWin } from '@/game/rules';
import type { Cosmetics, PlayerView, Role, Winner } from '@/game/types';

export interface MatchRecord {
  at: number;
  mode: 'local' | 'online';
  role: Role;
  won: boolean;
  winner: Winner;
  survived: boolean;
  rounds: number;
  players: number;
}

export interface Prefs {
  music: boolean;
  sfx: boolean;
  volume: number;
  rain: boolean;
  crt: boolean;
  /** AI voice replies (needs the Python game_backend running). */
  voice: boolean;
}

export interface ShopItem {
  id: string;
  kind: 'back' | 'frame' | 'title';
  name: string;
  price: number;
  description: string;
}

export const SHOP: ShopItem[] = [
  { id: 'back-classic', kind: 'back', name: 'ظهر كلاسيكي', price: 0, description: 'زخرفة آرت ديكو ذهبية على أسود.' },
  { id: 'back-crimson', kind: 'back', name: 'ظهر الدم', price: 300, description: 'قرمزي غامق مع نقش الوردة.' },
  { id: 'back-midnight', kind: 'back', name: 'ظهر منتصف الليل', price: 450, description: 'أزرق ليلي مع قمر ونجوم.' },
  { id: 'back-emerald', kind: 'back', name: 'ظهر الزمرد', price: 600, description: 'أخضر الكازينو مع إطار نحاسي.' },
  { id: 'frame-none', kind: 'frame', name: 'بدون إطار', price: 0, description: '' },
  { id: 'frame-gold', kind: 'frame', name: 'إطار ذهبي', price: 250, description: 'يلمع حول صورتك أمام الكل.' },
  { id: 'frame-blood', kind: 'frame', name: 'إطار الدم', price: 400, description: 'وهج أحمر نابض.' },
  { id: 'frame-smoke', kind: 'frame', name: 'إطار الدخان', price: 550, description: 'دخان سيجار يلتف حولك.' },
  { id: 'title-none', kind: 'title', name: 'بدون لقب', price: 0, description: '' },
  { id: 'title-rookie', kind: 'title', name: 'مخبر مبتدئ', price: 150, description: 'يظهر تحت اسمك.' },
  { id: 'title-hawk', kind: 'title', name: 'عين الصقر', price: 350, description: 'يظهر تحت اسمك.' },
  { id: 'title-don', kind: 'title', name: 'الدون', price: 700, description: 'يظهر تحت اسمك.' },
  { id: 'title-ghost', kind: 'title', name: 'شبح الميناء', price: 900, description: 'يظهر تحت اسمك.' },
];

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  reward: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-game', name: 'أول ليلة', description: 'العب أول مباراة', icon: '🌙', reward: 50 },
  { id: 'first-win', name: 'طعم النصر', description: 'افز بأول مباراة', icon: '🏆', reward: 100 },
  { id: 'mafia-win', name: 'العائلة أولاً', description: 'افز وأنت مافيا', icon: '🔫', reward: 100 },
  { id: 'godfather-win', name: 'كلمة العرّاب', description: 'افز وأنت العرّاب', icon: '🎩', reward: 200 },
  { id: 'detective-win', name: 'القضية مغلقة', description: 'افز وأنت المحقق', icon: '🔍', reward: 150 },
  { id: 'doctor-win', name: 'يد الشفاء', description: 'افز وأنت الطبيب', icon: '💉', reward: 150 },
  { id: 'jester-win', name: 'الضحكة الأخيرة', description: 'افز وأنت المهرّج', icon: '🃏', reward: 300 },
  { id: 'survivor', name: 'نجا من المطر', description: 'افز وأنت حي حتى النهاية', icon: '☔', reward: 100 },
  { id: 'veteran', name: 'من أهل الحي', description: 'العب 10 مباريات', icon: '🎖️', reward: 250 },
  { id: 'streak-3', name: 'لا يُهزم', description: 'افز 3 مرات متتالية', icon: '🔥', reward: 300 },
  { id: 'online-win', name: 'سمعة في المدينة', description: 'افز بمباراة أونلاين', icon: '🌐', reward: 200 },
  { id: 'all-roles', name: 'ألف وجه', description: 'العب بـ 6 أدوار مختلفة', icon: '🎭', reward: 400 },
];

interface ProfileState {
  name: string;
  avatar: string;
  gems: number;
  games: number;
  wins: number;
  streak: number;
  bestStreak: number;
  byRole: Partial<Record<Role, { played: number; won: number }>>;
  achievements: string[];
  owned: string[];
  equipped: { back: string; frame: string; title: string };
  prefs: Prefs;
  history: MatchRecord[];
  hydrated: boolean;
  /** Last unlocks, shown once on the game-over screen. */
  recentUnlocks: string[];

  setName: (name: string) => void;
  setAvatar: (avatar: string) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  buy: (id: string) => { ok: boolean; error?: string };
  equip: (id: string) => void;
  recordMatch: (view: PlayerView) => { gems: number; unlocked: Achievement[] } | null;
}

export const AVATARS = ['🎭', '🕵️', '🎩', '🕶️', '🦊', '🐺', '🦅', '🐍', '🦂', '🦉', '🐆', '🧔', '👳', '🧕', '👨‍💼', '🥷', '💂', '🧛'];

const recordedKeys = new Set<string>();

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      name: 'بطل الليل',
      avatar: '🎭',
      gems: 200,
      games: 0,
      wins: 0,
      streak: 0,
      bestStreak: 0,
      byRole: {},
      achievements: [],
      owned: ['back-classic', 'frame-none', 'title-none'],
      equipped: { back: 'back-classic', frame: 'frame-none', title: 'title-none' },
      prefs: { music: true, sfx: true, volume: 0.6, rain: true, crt: true, voice: false },
      history: [],
      hydrated: false,
      recentUnlocks: [],

      setName: name => set({ name: name.replace(/\s+/g, ' ').trim().slice(0, 18) || get().name }),
      setAvatar: avatar => set({ avatar }),
      setPrefs: p => set({ prefs: { ...get().prefs, ...p } }),

      buy: id => {
        const item = SHOP.find(i => i.id === id);
        const s = get();
        if (!item) return { ok: false, error: 'غرض غير موجود' };
        if (s.owned.includes(id)) return { ok: false, error: 'تملكه بالفعل' };
        if (s.gems < item.price) return { ok: false, error: 'جواهرك ما تكفي' };
        set({ gems: s.gems - item.price, owned: [...s.owned, id] });
        get().equip(id);
        return { ok: true };
      },

      equip: id => {
        const item = SHOP.find(i => i.id === id);
        if (!item || !get().owned.includes(id)) return;
        set({ equipped: { ...get().equipped, [item.kind]: id } });
      },

      recordMatch: view => {
        const key = `${view.code}:${view.phaseStartedAt}`;
        if (recordedKeys.has(key) || view.phase !== 'game-over' || !view.winner) return null;
        recordedKeys.add(key);
        const me = view.players.find(p => p.id === view.meId);
        if (!me?.role) return null;
        const s = get();
        const won = didWin(me.role, view.winner);
        const rec: MatchRecord = {
          at: Date.now(),
          mode: view.mode,
          role: me.role,
          won,
          winner: view.winner,
          survived: me.alive,
          rounds: view.round,
          players: view.players.length,
        };
        const byRole = { ...s.byRole };
        const r = byRole[me.role] ?? { played: 0, won: 0 };
        byRole[me.role] = { played: r.played + 1, won: r.won + (won ? 1 : 0) };
        const games = s.games + 1;
        const wins = s.wins + (won ? 1 : 0);
        const streak = won ? s.streak + 1 : 0;

        const has = new Set(s.achievements);
        const unlock: string[] = [];
        const check = (id: string, cond: boolean) => cond && !has.has(id) && unlock.push(id);
        check('first-game', true);
        check('first-win', won);
        check('mafia-win', won && ROLE_INFO[me.role].team === 'mafia');
        check('godfather-win', won && me.role === 'godfather');
        check('detective-win', won && me.role === 'detective');
        check('doctor-win', won && me.role === 'doctor');
        check('jester-win', won && me.role === 'jester');
        check('survivor', won && me.alive);
        check('veteran', games >= 10);
        check('streak-3', streak >= 3);
        check('online-win', won && view.mode === 'online');
        check('all-roles', Object.keys(byRole).length >= 6);

        const unlocked = ACHIEVEMENTS.filter(a => unlock.includes(a.id));
        const gems = (won ? 60 : 20) + unlocked.reduce((sum, a) => sum + a.reward, 0);
        set({
          games,
          wins,
          streak,
          bestStreak: Math.max(s.bestStreak, streak),
          byRole,
          achievements: [...s.achievements, ...unlock],
          gems: s.gems + gems,
          history: [rec, ...s.history].slice(0, 30),
          recentUnlocks: unlock,
        });
        return { gems, unlocked };
      },
    }),
    {
      name: 'mafia.profile',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: s => ({
        name: s.name,
        avatar: s.avatar,
        gems: s.gems,
        games: s.games,
        wins: s.wins,
        streak: s.streak,
        bestStreak: s.bestStreak,
        byRole: s.byRole,
        achievements: s.achievements,
        owned: s.owned,
        equipped: s.equipped,
        prefs: s.prefs,
        history: s.history,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ProfileState>;
        return { ...current, ...p, prefs: { ...current.prefs, ...p.prefs }, equipped: { ...current.equipped, ...p.equipped } };
      },
      onRehydrateStorage: () => () => useProfile.setState({ hydrated: true }),
    }
  )
);

export function identityFromProfile(): { name: string; avatar: string; cosmetics: Cosmetics } {
  const p = useProfile.getState();
  const frame = p.equipped.frame === 'frame-none' ? undefined : p.equipped.frame;
  const titleItem = SHOP.find(i => i.id === p.equipped.title);
  const title = titleItem && titleItem.id !== 'title-none' ? titleItem.name : undefined;
  return { name: p.name, avatar: p.avatar, cosmetics: { frame, title } };
}
