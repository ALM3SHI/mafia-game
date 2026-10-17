/**
 * Bot brains. Each bot keeps a suspicion score per player that moves with
 * what happens at the table: accusations in chat, how people vote, who gets
 * lynched and what they turn out to be, and (for the detective) night
 * results. Bots then talk, vote and act from those scores.
 */
import { ROLE_INFO, isMafiaTeam } from './roles';
import { pick, type Rng } from './rules';
import type { Role } from './types';

export interface BotSeat {
  id: string;
  name: string;
  role?: Role;
  alive: boolean;
  isBot: boolean;
}

export interface BotMemory {
  suspicion: Record<string, number>;
  /** Detective: confirmed alignments. Mafia: unused. */
  known: Record<string, 'mafia' | 'town'>;
  /** Who has accused me (for defensive chatter). */
  accusedBy: Record<string, number>;
  claimed: boolean;
  investigated: string[];
}

export function newMemory(selfId: string, seats: readonly BotSeat[], rng: Rng): BotMemory {
  const suspicion: Record<string, number> = {};
  for (const s of seats) if (s.id !== selfId) suspicion[s.id] = rng() * 0.6;
  return { suspicion, known: {}, accusedBy: {}, claimed: false, investigated: [] };
}

const bump = (m: BotMemory, id: string, by: number) => {
  if (id in m.suspicion) m.suspicion[id] = Math.max(-5, Math.min(12, m.suspicion[id] + by));
};

// ── Perception ─────────────────────────────────────────────────────────────

/** Someone said something in public chat. Detect who they accused. */
export function perceiveChat(self: BotSeat, mem: BotMemory, authorId: string, text: string, seats: readonly BotSeat[]) {
  if (authorId === self.id) return;
  const accused = seats.filter(s => s.id !== authorId && s.alive && text.includes(s.name));
  const hostile = /مافيا|مشبوه|اطرد|صوت|كذاب|يكذب|متهم|أشك|اشك|ضد/.test(text);
  for (const target of accused) {
    if (target.id === self.id) {
      if (hostile) {
        mem.accusedBy[authorId] = (mem.accusedBy[authorId] ?? 0) + 1;
        // Being accused while innocent makes the accuser look suspicious.
        bump(mem, authorId, isMafiaTeam(self.role) ? 0.2 : 0.6);
      }
      continue;
    }
    if (hostile) {
      // Trust the accusation a little, more if the author seems trustworthy.
      const trust = 0.45 - Math.max(0, mem.suspicion[authorId] ?? 0) * 0.08;
      bump(mem, target.id, Math.max(0.05, trust));
    }
  }
  if (/أنا المحقق|انا المحقق/.test(text)) {
    // A claim: believe it a bit (lowers suspicion of the claimer).
    bump(mem, authorId, -0.6);
  }
}

/** A lynch result became public. Voters for an innocent look worse. */
export function perceiveLynch(mem: BotMemory, votes: Record<string, string>, lynchedId: string | null, lynchedRole: Role | undefined) {
  if (!lynchedId || !lynchedRole) return;
  const wasMafia = isMafiaTeam(lynchedRole);
  for (const [voter, target] of Object.entries(votes)) {
    if (target !== lynchedId) continue;
    bump(mem, voter, wasMafia ? -0.5 : 0.7);
  }
  delete mem.suspicion[lynchedId];
}

export function perceiveDeath(mem: BotMemory, deadId: string, role: Role | undefined, accusedVictim: string[]) {
  delete mem.suspicion[deadId];
  // People who were attacking a town player that the mafia then killed are
  // less likely to be mafia (mafia rarely kills its own critics' targets).
  if (role && !isMafiaTeam(role)) for (const id of accusedVictim) bump(mem, id, -0.2);
}

// ── Decisions ──────────────────────────────────────────────────────────────

function ranked(self: BotSeat, mem: BotMemory, seats: readonly BotSeat[], rng: Rng) {
  return seats
    .filter(s => s.alive && s.id !== self.id && !(isMafiaTeam(self.role) && isMafiaTeam(s.role)))
    .map(s => {
      let score = (mem.suspicion[s.id] ?? 0) + rng() * 0.35;
      if (mem.known[s.id] === 'mafia') score += 20;
      if (mem.known[s.id] === 'town') score -= 20;
      return { seat: s, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function topSuspect(self: BotSeat, mem: BotMemory, seats: readonly BotSeat[], rng: Rng): BotSeat | undefined {
  if (isMafiaTeam(self.role)) {
    // Mafia push suspicion onto whoever threatens them most (their accusers),
    // otherwise onto a random townie.
    const threats = Object.entries(mem.accusedBy).sort((a, b) => b[1] - a[1]).map(([id]) => seats.find(s => s.id === id && s.alive && !isMafiaTeam(s.role)));
    return threats.find(Boolean) ?? ranked(self, mem, seats, rng)[0]?.seat;
  }
  return ranked(self, mem, seats, rng)[0]?.seat;
}

/** Day vote: the top suspect, or skip when nobody stands out. */
export function decideVote(self: BotSeat, mem: BotMemory, seats: readonly BotSeat[], rng: Rng, currentVotes: Record<string, string>): string | null {
  const list = ranked(self, mem, seats, rng);
  if (!list.length) return null;
  // Bandwagon: leading targets get a small boost (bots like to converge).
  const tally: Record<string, number> = {};
  for (const t of Object.values(currentVotes)) tally[t] = (tally[t] ?? 0) + 1;
  for (const entry of list) entry.score += (tally[entry.seat.id] ?? 0) * 0.35;
  list.sort((a, b) => b.score - a.score);
  if (isMafiaTeam(self.role)) return list[0].seat.id;
  return list[0].score < 0.45 && rng() < 0.5 ? null : list[0].seat.id;
}

export interface NightDecision {
  targetId: string | null;
}

export function decideNight(
  self: BotSeat,
  mem: BotMemory,
  seats: readonly BotSeat[],
  rng: Rng,
  opts: { lastDoctorTarget: string | null; vigilanteBullets: number; teamPick?: string }
): string | null {
  const alive = seats.filter(s => s.alive);
  switch (self.role) {
    case 'mafia':
    case 'godfather': {
      if (opts.teamPick) return opts.teamPick;
      // Prefer whoever claimed detective or has been accusing the family.
      const threat = topSuspect(self, mem, seats, rng);
      const victims = alive.filter(s => !isMafiaTeam(s.role));
      return (rng() < 0.7 ? threat?.id : undefined) ?? pick(victims, rng)?.id ?? null;
    }
    case 'doctor': {
      const choices = alive.filter(s => s.id !== opts.lastDoctorTarget);
      // Protect self ~30% of the time, else someone who looks trustworthy.
      const self30 = choices.find(s => s.id === self.id);
      if (self30 && rng() < 0.3) return self.id;
      const trusted = choices.filter(s => s.id !== self.id).sort((a, b) => (mem.suspicion[a.id] ?? 0) - (mem.suspicion[b.id] ?? 0));
      return trusted[0]?.id ?? self30?.id ?? null;
    }
    case 'detective': {
      const options = ranked(self, mem, seats, rng).filter(r => !mem.investigated.includes(r.seat.id));
      return options[0]?.seat.id ?? null;
    }
    case 'bodyguard': {
      const others = alive.filter(s => s.id !== self.id).sort((a, b) => (mem.suspicion[a.id] ?? 0) - (mem.suspicion[b.id] ?? 0));
      return others[0]?.id ?? null;
    }
    case 'vigilante': {
      if (opts.vigilanteBullets <= 0) return null;
      const top = ranked(self, mem, seats, rng)[0];
      // Only fire when fairly sure.
      return top && top.score > 2.2 ? top.seat.id : null;
    }
    default:
      return null;
  }
}

// ── Talk ───────────────────────────────────────────────────────────────────

const LINES = {
  accuse: [
    'أنا شاكّ في {x}، كلامه ما يركب.',
    '{x} من البداية يحاول يوجّهنا، هذا مافيا.',
    'صوتي اليوم ضد {x}.',
    'لاحظتوا إن {x} ما دافع عن نفسه؟',
    'يا جماعة {x} مشبوه، لا تضيعون الفرصة.',
    '{x}، وين كنت البارحة لما صار القتل؟',
  ],
  defend: [
    'أنا مواطن والله، {x} يبي يضيّعكم.',
    'ليش {x} مركّز علي؟ هذا بحد ذاته مشبوه.',
    'لو كنت مافيا ما كان سكتّ كذا. ركزوا على {x}.',
    'اتهامك فاضي يا {x}.',
  ],
  morningKill: [
    'الله يرحم {x}... المافيا تعرف وش تسوي.',
    'قتلوا {x}؟ يعني كان قريب من الحقيقة.',
    'موت {x} يقول لنا شي، فكروا مين كان ضده.',
  ],
  morningQuiet: ['ليلة هادية... الطبيب شغّال صح.', 'محد مات؟ الحمد لله، بس لا ترتاحون.'],
  filler: [
    'خلونا نركز، المافيا بيننا الحين.',
    'المحقق إذا موجود يتكلم الحين!',
    'لا تصوتون عشوائي، نخسر كذا.',
    'أنا أراقب التصويت، اللي يغير صوته آخر لحظة مشبوه.',
    'كل واحد يقول مين يشك فيه، بسرعة.',
    'الوقت يمشي يا جماعة، قرروا.',
    'أحس فيه اثنين متفقين علينا.',
    'اللي يدافع بقوة عن غيره... ليش؟',
  ],
  testimony: [
    'أنا مواطن عادي، ما عندي شي أخفيه.',
    'ما شفت شي مهم، بس عندي شك بسيط في {x}.',
    'شهادتي: {x} تصرفاته غريبة من أول جولة.',
    'أنا بريء، وبصوت مع الأغلبية لو الدليل واضح.',
    'ركزوا على اللي ساكتين، مثل {x}.',
    'البارحة سمعت خطوات قريبة من بيت {x}... مجرد ملاحظة.',
    'ما أتهم أحد للحين، بس عيني على {x}.',
    'أنا مع المدينة، واللي يشك فيني يسأل.',
    'شهادتي قصيرة: لا تثقون في {x}.',
    'لو كنت مكانكم بسأل {x} سؤال واحد: ليش متوتر؟',
    'كنت نايم ومحد زارني، الحمد لله.',
  ],
  claimDetective: ['أنا المحقق! حققت في {x} وطلع مافيا. صوتوا ضده.', 'تكلمت الحين: أنا المحقق و{x} مافيا مؤكد.'],
  clearDetective: ['أنا المحقق، و{x} نظيف. لا تصوتون عليه.'],
};

const fill = (tpl: string, name: string) => tpl.replace('{x}', name);

export type TalkContext = 'testimony' | 'discussion' | 'morning';

export function botLine(
  self: BotSeat,
  mem: BotMemory,
  seats: readonly BotSeat[],
  rng: Rng,
  ctx: { kind: TalkContext; lastDeaths: string[] }
): string | null {
  const nameOf = (id: string) => seats.find(s => s.id === id)?.name ?? '؟';

  // Detective bot reveals a mafia find (once), or clears someone who's under fire.
  if (self.role === 'detective' && !mem.claimed) {
    const found = Object.entries(mem.known).find(([id, a]) => a === 'mafia' && seats.find(s => s.id === id)?.alive);
    if (found && ctx.kind !== 'morning') {
      mem.claimed = true;
      return fill(pick(LINES.claimDetective, rng)!, nameOf(found[0]));
    }
  }

  if (ctx.kind === 'morning') {
    if (rng() < 0.5) return null;
    if (ctx.lastDeaths.length) return fill(pick(LINES.morningKill, rng)!, nameOf(ctx.lastDeaths[0]));
    return pick(LINES.morningQuiet, rng)!;
  }

  const accuser = Object.entries(mem.accusedBy).sort((a, b) => b[1] - a[1])[0];
  if (accuser && rng() < 0.45 && seats.find(s => s.id === accuser[0])?.alive) {
    return fill(pick(LINES.defend, rng)!, nameOf(accuser[0]));
  }

  const suspect = topSuspect(self, mem, seats, rng);
  if (ctx.kind === 'testimony') return fill(pick(LINES.testimony, rng)!, suspect?.name ?? 'أحد');
  if (suspect && rng() < 0.65) return fill(pick(LINES.accuse, rng)!, suspect.name);
  return pick(LINES.filler, rng)!;
}

/** Fake role a bot mentions when pressed (mafia lie). */
export function claimedRoleName(self: BotSeat): string {
  return isMafiaTeam(self.role) ? ROLE_INFO.citizen.name : ROLE_INFO[self.role ?? 'citizen'].name;
}
