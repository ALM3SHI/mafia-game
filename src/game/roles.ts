import type { OptionalRole, Role, Team } from './types';

export interface RoleInfo {
  name: string;
  team: Team;
  icon: string;
  tagline: string;
  description: string;
  /** Base portrait used on the card. */
  art: 'mafia' | 'citizen';
  /** Accent colour for the card frame / emblem. */
  accent: string;
  /** Minimum table size before this role is dealt. */
  minPlayers: number;
  nightAction: 'kill' | 'protect' | 'investigate' | 'guard' | 'shoot' | null;
}

export const ROLE_INFO: Record<Role, RoleInfo> = {
  mafia: {
    name: 'مافيا',
    team: 'mafia',
    icon: '🔫',
    tagline: 'الليل لكم',
    description: 'كل ليلة تتفق أنت وعائلتك على تصفية لاعب. تفوزون إذا صار عددكم يساوي الباقين.',
    art: 'mafia',
    accent: '#b3261e',
    minPlayers: 0,
    nightAction: 'kill',
  },
  godfather: {
    name: 'العرّاب',
    team: 'mafia',
    icon: '🎩',
    tagline: 'كلمته هي القانون',
    description: 'رأس العائلة. يظهر بريئاً أمام المحقق، وصوته يحسم هدف المافيا بالليل.',
    art: 'mafia',
    accent: '#7a1c1c',
    minPlayers: 7,
    nightAction: 'kill',
  },
  citizen: {
    name: 'مواطن',
    team: 'town',
    icon: '👤',
    tagline: 'صوتك سلاحك',
    description: 'ما عندك قدرة ليلية. راقب، ناقش، وصوّت بذكاء لطرد المافيا.',
    art: 'citizen',
    accent: '#8a8172',
    minPlayers: 0,
    nightAction: null,
  },
  doctor: {
    name: 'الطبيب',
    team: 'town',
    icon: '💉',
    tagline: 'لن يموت أحد الليلة',
    description: 'كل ليلة تحمي لاعباً (أو نفسك) من القتل. لا تقدر تحمي نفس الشخص ليلتين متتاليتين.',
    art: 'citizen',
    accent: '#3f8f6b',
    minPlayers: 5,
    nightAction: 'protect',
  },
  detective: {
    name: 'المحقق',
    team: 'town',
    icon: '🔍',
    tagline: 'الحقيقة تحت المطر',
    description: 'كل ليلة تحقق في لاعب وتعرف إن كان من المافيا. انتبه: العرّاب يظهر بريئاً.',
    art: 'citizen',
    accent: '#3d6f9e',
    minPlayers: 5,
    nightAction: 'investigate',
  },
  bodyguard: {
    name: 'الحارس',
    team: 'town',
    icon: '🛡️',
    tagline: 'جسدي درعك',
    description: 'تحرس لاعباً كل ليلة. إذا هاجمته المافيا تموت أنت بدلاً منه.',
    art: 'citizen',
    accent: '#9a7b3c',
    minPlayers: 8,
    nightAction: 'guard',
  },
  vigilante: {
    name: 'القنّاص',
    team: 'town',
    icon: '🎯',
    tagline: 'طلقة واحدة. لا مجال للخطأ',
    description: 'معك رصاصة واحدة طوال اللعبة. أطلقها بالليل على من تشك فيه.',
    art: 'citizen',
    accent: '#6b5a8e',
    minPlayers: 7,
    nightAction: 'shoot',
  },
  mayor: {
    name: 'العمدة',
    team: 'town',
    icon: '👑',
    tagline: 'صوت المدينة',
    description: 'صوتك في التصويت النهاري يُحسب بصوتين.',
    art: 'citizen',
    accent: '#cfa64a',
    minPlayers: 6,
    nightAction: null,
  },
  jester: {
    name: 'المهرّج',
    team: 'neutral',
    icon: '🃏',
    tagline: 'اطردوني... أرجوكم',
    description: 'هدفك الوحيد أن يطردك الشعب بالتصويت. إذا طُردت تفوز وحدك وتنتهي اللعبة.',
    art: 'citizen',
    accent: '#c25b8f',
    minPlayers: 7,
    nightAction: null,
  },
};

/** Optional roles in deal priority when seats are limited. */
export const OPTIONAL_ROLES: OptionalRole[] = ['doctor', 'detective', 'godfather', 'mayor', 'vigilante', 'jester', 'bodyguard'];

export const ALL_ROLES: Role[] = ['mafia', 'godfather', 'citizen', 'doctor', 'detective', 'bodyguard', 'vigilante', 'mayor', 'jester'];

export const isMafiaTeam = (role?: Role) => role === 'mafia' || role === 'godfather';
export const roleName = (role?: Role) => (role ? ROLE_INFO[role].name : 'مجهول');
