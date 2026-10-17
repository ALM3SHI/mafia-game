/** Flavour text for the noir narrator. Kept separate so it can grow freely. */
import type { Winner } from './types';

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

export const narrate = {
  start: () =>
    pick([
      '🎴 وُزّعت البطاقات. المطر ما وقف من ثلاث ليالٍ، والمدينة تعرف أن بينها قتلة.',
      '🎴 الأوراق على الطاولة. احفظ دورك... ولا تثق بأحد.',
    ]),
  nightFalls: (round: number) =>
    round === 1
      ? '🌙 الليلة الأولى. أُطفئت أنوار الحي، وبدأت الهمسات في الأزقة...'
      : pick([`🌙 الليلة ${round}. الضباب ينزل على الميناء...`, `🌙 الليلة ${round}. صوت خطوات مبتلّة في الشارع الخلفي...`, `🌙 الليلة ${round}. المدينة نائمة، إلا من يحمل سلاحاً.`]),
  death: (name: string, role: string | null, how: 'mafia' | 'vigilante' | 'bodyguard') => {
    const r = role ? ` — كان ${role}` : '';
    if (how === 'vigilante') return `🎯 دوّى صوت طلقة واحدة. وُجد ${name} عند عمود الإنارة${r}.`;
    if (how === 'bodyguard') return `🛡️ ${name} وقف بين الرصاص وضحيته... ومات${r}.`;
    return pick([
      `💀 مع الفجر، وُجد ${name} في زقاق المطر${r}.`,
      `💀 بائع الجرائد وجد ${name} على درج المقهى${r}.`,
      `💀 ${name} لم يعد إلى بيته الليلة${r}.`,
    ]);
  },
  saved: () => pick(['💉 هاجمت المافيا، لكن أحدهم كان أسرع. لا ضحايا الليلة!', '🛡️ رصاصة طائشة... والضحية ما زالت تتنفس. أُنقذ أحدهم.']),
  quiet: () => pick(['🕊️ ليلة صامتة بشكل مريب. لم يُقتل أحد.', '🕊️ المطر غسل الشوارع، ولا دم الليلة.']),
  discussion: () => '🗣️ النقاش مفتوح. اتهموا، دافعوا، واكشفوا الكذّاب.',
  lynch: (name: string, votes: number, role: string | null) =>
    `⚖️ قرّر الشعب طرد ${name} بـ ${votes} ${votes === 1 ? 'صوت' : 'أصوات'}${role ? ` — وكان ${role}` : ''}.`,
  win: (w: Winner) =>
    ({
      town: '🌅 أشرقت الشمس على مدينة نظيفة. انتصر المواطنون!',
      mafia: '🥀 سقطت المدينة في قبضة العائلة. انتصرت المافيا!',
      jester: '🃏 ضحكة عالية من المشنقة... المهرّج خدعكم جميعاً وفاز!',
    })[w],
};
