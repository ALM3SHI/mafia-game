import type { Role, Team } from './game-types';

export interface RoleInfo {
  name: string;
  team: Team;
  icon: string;
  description: string;
  cardArt: string;
  /** Minimum table size before this role is dealt. */
  minPlayers: number;
}

export const ROLE_INFO: Record<Role, RoleInfo> = {
  mafia: {
    name: 'مافيا',
    team: 'mafia',
    icon: '🔫',
    description: 'كل ليلة تتفقون أنت وفريقك على قتل لاعب. تفوزون إذا صار عددكم يساوي عدد الباقين.',
    cardArt: '/cards/mafia.png',
    minPlayers: 0,
  },
  citizen: {
    name: 'مواطن',
    team: 'town',
    icon: '👤',
    description: 'ما عندك قدرة ليلية. ناقش وصوّت بذكاء لطرد المافيا.',
    cardArt: '/cards/citizen.png',
    minPlayers: 0,
  },
  doctor: {
    name: 'الطبيب',
    team: 'town',
    icon: '💉',
    description: 'كل ليلة تختار لاعباً (أو نفسك) لحمايته من القتل.',
    cardArt: '/cards/citizen.png',
    minPlayers: 5,
  },
  detective: {
    name: 'المحقق',
    team: 'town',
    icon: '🔍',
    description: 'كل ليلة تحقق في لاعب وتعرف هل هو مافيا أم لا.',
    cardArt: '/cards/citizen.png',
    minPlayers: 5,
  },
  mayor: {
    name: 'العمدة',
    team: 'town',
    icon: '👑',
    description: 'صوتك في التصويت النهاري يُحسب بصوتين.',
    cardArt: '/cards/citizen.png',
    minPlayers: 6,
  },
  jester: {
    name: 'المهرج',
    team: 'neutral',
    icon: '🃏',
    description: 'هدفك أن يطردك الشعب بالتصويت. إذا طُردت تفوز وحدك.',
    cardArt: '/cards/citizen.png',
    minPlayers: 7,
  },
};

/** Optional roles in the order they are dealt when seats are limited. */
export const OPTIONAL_ROLES = ['doctor', 'detective', 'mayor', 'jester'] as const;

export function roleName(role?: Role): string {
  return role ? ROLE_INFO[role].name : 'مجهول';
}
