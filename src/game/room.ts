/**
 * Room — the authoritative game state machine.
 *
 * The very same class runs in the browser (single-player "local" rooms) and
 * on the Node server (online rooms). Clients never mutate state directly:
 * they call commands (`vote`, `nightAction`, `chat`, …) which validate the
 * actor, and they render `viewFor(playerId)`, which only contains what that
 * player is allowed to know.
 *
 * Time only moves through `tick(now)`, so tests can drive a fake clock.
 */
import { botLine, decideNight, decideVote, newMemory, perceiveChat, perceiveDeath, perceiveLynch, type BotMemory } from './bots';
import { narrate } from './narration';
import { ROLE_INFO, isMafiaTeam } from './roles';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  applyNightChoice,
  canTargetAtNight,
  checkWinner,
  clampMafiaCount,
  dealRoles,
  emptyNight,
  hasNightAction,
  living,
  nightChoiceOf,
  pick,
  resolveNight,
  tallyVotes,
  type Rng,
} from './rules';
import {
  SKIP_VOTE,
  type ChatChannel,
  type ChatMessage,
  type Cosmetics,
  type EventTone,
  type GameEvent,
  type GameSettings,
  type Investigation,
  type NightActions,
  type Phase,
  type PlayerView,
  type PublicPlayer,
  type Role,
  type TimelineEntry,
  type Winner,
} from './types';

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  isHost: boolean;
  connected: boolean;
  ready: boolean;
  alive: boolean;
  role?: Role;
  cosmetics?: Cosmetics;
}

export type Result = { ok: true } | { ok: false; error: string };
const ok: Result = { ok: true };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export const DEFAULT_SETTINGS: GameSettings = {
  mafiaCount: 1,
  testimonyDuration: 20,
  discussionDuration: 60,
  voteDuration: 25,
  nightDuration: 25,
  secretVoting: false,
  revealRolesOnDeath: true,
  roles: { godfather: true, doctor: true, detective: true, bodyguard: false, vigilante: false, mayor: true, jester: false },
};

const REVEAL_MS = 9000;
const MORNING_MS = 7000;
const VERDICT_MS = 6000;
const MAX_CHAT = 250;
const MAX_EVENTS = 250;

const BOT_NAMES = ['الذيب', 'أبو سروال', 'الصقر', 'الغامض', 'النمر', 'الشبح', 'الظل', 'البومة', 'الثعلب', 'الأفعى', 'العقرب', 'الدكتور فهد', 'أم سالم', 'الحاج صالح', 'سلطان', 'نورة'];
const BOT_AVATARS = ['🐺', '🦅', '🦊', '🐍', '🦂', '🦉', '🐆', '🎩', '🕶️', '🧔', '👳', '🧕', '👨‍💼', '🕵️'];

export interface RoomOptions {
  code: string;
  mode: 'local' | 'online';
  now?: () => number;
  rng?: Rng;
  onChange?: () => void;
  idFactory?: (prefix: string) => string;
}

export class Room {
  readonly code: string;
  readonly mode: 'local' | 'online';
  players: RoomPlayer[] = [];
  settings: GameSettings = structuredClone(DEFAULT_SETTINGS);
  phase: Phase = 'lobby';
  phaseStartedAt = 0;
  phaseEndsAt = 0;
  round = 0;
  winner: Winner | null = null;
  votes: Record<string, string> = {};
  night: NightActions = emptyNight();
  lastDoctorTarget: string | null = null;
  vigilanteBullets = 1;
  investigations: Record<string, Investigation[]> = {};
  chat: ChatMessage[] = [];
  events: GameEvent[] = [];
  lastDeaths: string[] = [];
  timeline: TimelineEntry[] = [];

  private testimonyOrder: string[] = [];
  private speakerIdx = 0;
  private nightShortened = false;
  private memories: Record<string, BotMemory> = {};
  private botNextAt: Record<string, number> = {};
  private botDone = new Set<string>();
  private seq = 0;
  private readonly now: () => number;
  private readonly rng: Rng;
  private readonly newId: (prefix: string) => string;
  onChange?: () => void;

  constructor(opts: RoomOptions) {
    this.code = opts.code;
    this.mode = opts.mode;
    this.now = opts.now ?? Date.now;
    this.rng = opts.rng ?? Math.random;
    this.onChange = opts.onChange;
    this.newId = opts.idFactory ?? (p => `${p}-${Math.random().toString(36).slice(2, 10)}`);
  }

  private changed() {
    this.onChange?.();
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  get hostId(): string | null {
    return this.players.find(p => p.isHost)?.id ?? null;
  }

  player(id: string) {
    return this.players.find(p => p.id === id);
  }

  get speakerId(): string | null {
    return this.phase === 'testimony' ? (this.testimonyOrder[this.speakerIdx] ?? null) : null;
  }

  get humans() {
    return this.players.filter(p => !p.isBot);
  }

  private nightCtx() {
    return { lastDoctorTarget: this.lastDoctorTarget, vigilanteBullets: this.vigilanteBullets };
  }

  // ── Lobby commands ───────────────────────────────────────────────────────

  join(name: string, avatar: string, opts: { cosmetics?: Cosmetics; id?: string } = {}): { ok: true; id: string } | { ok: false; error: string } {
    if (this.phase !== 'lobby') return fail('اللعبة بدأت بالفعل');
    if (this.players.length >= MAX_PLAYERS) return fail('الغرفة ممتلئة');
    const id = opts.id ?? this.newId('p');
    const player: RoomPlayer = {
      id,
      name: this.uniqueName(sanitizeName(name) || 'لاعب'),
      avatar: sanitizeAvatar(avatar),
      isBot: false,
      isHost: !this.players.some(p => p.isHost),
      connected: true,
      ready: false,
      alive: true,
      cosmetics: opts.cosmetics,
    };
    this.players.push(player);
    this.clampSettings();
    this.systemChat(`👋 ${player.name} دخل الغرفة.`);
    this.changed();
    return { ok: true, id };
  }

  private uniqueName(name: string): string {
    const taken = new Set(this.players.map(p => p.name));
    if (!taken.has(name)) return name;
    for (let i = 2; ; i++) if (!taken.has(`${name} ${i}`)) return `${name} ${i}`;
  }

  /** Player left (online: socket closed). In the lobby they are removed. */
  leave(id: string): void {
    const p = this.player(id);
    if (!p) return;
    if (this.phase === 'lobby' || this.phase === 'game-over') {
      this.players = this.players.filter(x => x.id !== id);
      this.systemChat(`🚪 ${p.name} غادر الغرفة.`);
    } else {
      p.connected = false;
      this.systemChat(`📴 ${p.name} انقطع اتصاله.`);
    }
    if (p.isHost) this.reassignHost();
    this.clampSettings();
    this.changed();
  }

  /** Socket dropped: keep the seat (lobby or game) so a reload can resume it. */
  disconnect(id: string): void {
    const p = this.player(id);
    if (!p || p.isBot || !p.connected) return;
    p.connected = false;
    if (this.phase !== 'lobby') this.systemChat(`📴 ${p.name} انقطع اتصاله.`);
    this.changed();
  }

  reconnect(id: string): boolean {
    const p = this.player(id);
    if (!p || p.isBot) return false;
    if (!p.connected) {
      p.connected = true;
      this.systemChat(`🔌 ${p.name} رجع.`);
      this.changed();
    }
    return true;
  }

  private reassignHost() {
    this.players.forEach(p => (p.isHost = false));
    const next = this.players.find(p => !p.isBot && p.connected) ?? this.players.find(p => !p.isBot);
    if (next) next.isHost = true;
  }

  private isHost(id: string) {
    return this.player(id)?.isHost === true;
  }

  setReady(id: string, ready: boolean): Result {
    const p = this.player(id);
    if (!p || this.phase !== 'lobby') return fail('غير متاح الآن');
    p.ready = ready;
    this.changed();
    return ok;
  }

  addBot(byId: string): Result {
    if (!this.isHost(byId)) return fail('فقط المضيف');
    if (this.phase !== 'lobby') return fail('غير متاح الآن');
    if (this.players.length >= MAX_PLAYERS) return fail('الغرفة ممتلئة');
    const taken = new Set(this.players.map(p => p.name));
    const name = BOT_NAMES.find(n => !taken.has(n)) ?? this.uniqueName('بوت');
    this.players.push({
      id: this.newId('bot'),
      name,
      avatar: BOT_AVATARS[this.players.length % BOT_AVATARS.length],
      isBot: true,
      isHost: false,
      connected: true,
      ready: true,
      alive: true,
    });
    this.clampSettings();
    this.changed();
    return ok;
  }

  /** Adds bots until the table has at least `n` seats. */
  fillWithBots(byId: string, n: number): Result {
    while (this.players.length < Math.min(n, MAX_PLAYERS)) {
      const r = this.addBot(byId);
      if (!r.ok) return r;
    }
    return ok;
  }

  kick(byId: string, targetId: string): Result {
    if (!this.isHost(byId) || byId === targetId) return fail('غير مسموح');
    if (this.phase !== 'lobby') return fail('غير متاح الآن');
    const t = this.player(targetId);
    if (!t) return fail('اللاعب غير موجود');
    this.players = this.players.filter(p => p.id !== targetId);
    this.systemChat(`❌ تم طرد ${t.name} من الغرفة.`);
    this.clampSettings();
    this.changed();
    return ok;
  }

  updateSettings(byId: string, patch: Partial<GameSettings>): Result {
    if (!this.isHost(byId)) return fail('فقط المضيف');
    if (this.phase !== 'lobby') return fail('غير متاح الآن');
    const s = this.settings;
    const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
    this.settings = {
      mafiaCount: num(patch.mafiaCount, 1, 6, s.mafiaCount),
      testimonyDuration: num(patch.testimonyDuration, 5, 90, s.testimonyDuration),
      discussionDuration: num(patch.discussionDuration, 15, 300, s.discussionDuration),
      voteDuration: num(patch.voteDuration, 10, 120, s.voteDuration),
      nightDuration: num(patch.nightDuration, 10, 120, s.nightDuration),
      secretVoting: typeof patch.secretVoting === 'boolean' ? patch.secretVoting : s.secretVoting,
      revealRolesOnDeath: typeof patch.revealRolesOnDeath === 'boolean' ? patch.revealRolesOnDeath : s.revealRolesOnDeath,
      roles: { ...s.roles },
    };
    if (patch.roles && typeof patch.roles === 'object') {
      for (const key of Object.keys(s.roles) as (keyof GameSettings['roles'])[]) {
        const v = (patch.roles as Record<string, unknown>)[key];
        if (typeof v === 'boolean') this.settings.roles[key] = v;
      }
    }
    this.clampSettings();
    this.changed();
    return ok;
  }

  private clampSettings() {
    this.settings.mafiaCount = clampMafiaCount(this.settings.mafiaCount, Math.max(this.players.length, 3));
  }

  setCosmetics(id: string, cosmetics: Cosmetics) {
    const p = this.player(id);
    if (p) {
      p.cosmetics = { frame: cosmetics.frame?.slice(0, 24), title: cosmetics.title?.slice(0, 24) };
      this.changed();
    }
  }

  canStart(): Result {
    if (this.players.length < MIN_PLAYERS) return fail(`نحتاج ${MIN_PLAYERS} لاعبين كحد أدنى`);
    const notReady = this.players.filter(p => !p.ready && !p.isHost);
    if (notReady.length) return fail(`بانتظار: ${notReady.map(p => p.name).join('، ')}`);
    return ok;
  }

  start(byId: string): Result {
    if (!this.isHost(byId)) return fail('فقط المضيف يقدر يبدأ');
    if (this.phase !== 'lobby') return fail('اللعبة بدأت');
    const check = this.canStart();
    if (!check.ok) return check;

    this.players = dealRoles(this.players, this.settings, this.rng).map(p => ({ ...p, ready: true }));
    this.round = 0;
    this.winner = null;
    this.votes = {};
    this.night = emptyNight();
    this.lastDoctorTarget = null;
    this.vigilanteBullets = 1;
    this.investigations = {};
    this.events = [];
    this.lastDeaths = [];
    this.timeline = [];
    this.chat = this.chat.slice(-20);
    this.memories = {};
    for (const b of this.players.filter(p => p.isBot)) this.memories[b.id] = newMemory(b.id, this.players, this.rng);

    this.event(narrate.start(), 'special');
    for (const p of this.players) {
      if (!p.role) continue;
      const info = ROLE_INFO[p.role];
      this.event(`${info.icon} دورك: ${info.name} — ${info.description}`, 'private', [p.id]);
      if (isMafiaTeam(p.role)) {
        const mates = this.players.filter(m => isMafiaTeam(m.role) && m.id !== p.id).map(m => `${m.name} (${ROLE_INFO[m.role!].name})`);
        if (mates.length) this.event(`🤝 عائلتك: ${mates.join('، ')}`, 'private', [p.id]);
      }
    }
    this.enter('reveal', REVEAL_MS);
    return ok;
  }

  /** Host sends everyone back to the lobby after a game. */
  backToLobby(byId: string): Result {
    if (!this.isHost(byId) && this.mode === 'online') return fail('فقط المضيف');
    this.players = this.players
      .filter(p => p.isBot || p.connected)
      .map(p => ({ ...p, role: undefined, alive: true, ready: p.isBot }));
    this.reassignHostIfMissing();
    this.phase = 'lobby';
    this.round = 0;
    this.winner = null;
    this.votes = {};
    this.night = emptyNight();
    this.events = [];
    this.lastDeaths = [];
    this.timeline = [];
    this.phaseEndsAt = 0;
    this.changed();
    return ok;
  }

  private reassignHostIfMissing() {
    if (!this.players.some(p => p.isHost && !p.isBot)) this.reassignHost();
  }

  // ── In-game commands ─────────────────────────────────────────────────────

  vote(id: string, targetId: string): Result {
    if (this.phase !== 'voting') return fail('ليس وقت التصويت');
    const voter = this.player(id);
    if (!voter?.alive) return fail('الأموات لا يصوتون');
    if (targetId !== SKIP_VOTE) {
      const t = this.player(targetId);
      if (!t?.alive || t.id === id) return fail('هدف غير صالح');
    }
    this.votes[id] = targetId;
    this.changed();
    return ok;
  }

  nightAction(id: string, targetId: string): Result {
    if (this.phase !== 'night') return fail('ليس الليل');
    const actor = this.player(id);
    const target = this.player(targetId);
    if (!actor || !target || !canTargetAtNight(actor, target, this.nightCtx())) return fail('هدف غير صالح');
    this.night = applyNightChoice(this.night, actor, targetId);
    // Bot mafia follow a human teammate's pick.
    if (isMafiaTeam(actor.role) && !actor.isBot) {
      for (const m of this.players.filter(p => p.isBot && p.alive && isMafiaTeam(p.role))) this.night.mafiaVotes[m.id] = targetId;
    }
    this.changed();
    return ok;
  }

  /** Vigilante may also explicitly hold fire. */
  clearNightAction(id: string): Result {
    const actor = this.player(id);
    if (this.phase !== 'night' || !actor) return fail('غير متاح');
    const n = { ...this.night, mafiaVotes: { ...this.night.mafiaVotes } };
    if (isMafiaTeam(actor.role)) delete n.mafiaVotes[id];
    else if (actor.role === 'doctor') n.doctor = null;
    else if (actor.role === 'detective') n.detective = null;
    else if (actor.role === 'bodyguard') n.bodyguard = null;
    else if (actor.role === 'vigilante') n.vigilante = null;
    this.night = n;
    this.changed();
    return ok;
  }

  /** Which channel (if any) this player may write to right now. */
  chatChannelFor(id: string): ChatChannel | null {
    const p = this.player(id);
    if (!p) return null;
    if (this.phase === 'lobby' || this.phase === 'game-over') return 'public';
    if (!p.alive) return 'dead';
    if (this.phase === 'night') return isMafiaTeam(p.role) ? 'mafia' : null;
    if (this.phase === 'testimony') return this.speakerId === id ? 'public' : null;
    return 'public';
  }

  say(id: string, raw: string): Result {
    const text = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 280);
    if (!text) return fail('رسالة فارغة');
    const channel = this.chatChannelFor(id);
    if (!channel) return fail(this.phase === 'testimony' ? 'انتظر دورك في الشهادة' : 'لا يمكنك الكلام الآن');
    const p = this.player(id)!;
    this.pushChat(channel, p.id, p.name, text);
    if (channel === 'public' && this.phase !== 'lobby') {
      for (const b of this.players.filter(x => x.isBot && x.alive)) {
        const mem = this.memories[b.id];
        if (mem) perceiveChat(b, mem, p.id, text, this.players);
      }
    }
    this.changed();
    return ok;
  }

  endTurn(id: string): Result {
    if (this.speakerId !== id) return fail('ليس دورك');
    this.nextSpeaker();
    this.changed();
    return ok;
  }

  // ── Clock ────────────────────────────────────────────────────────────────

  tick(): void {
    const now = this.now();
    if (this.phase === 'lobby' || this.phase === 'game-over') return;

    this.runBots(now);

    if (this.phase === 'testimony' && now >= this.phaseEndsAt) {
      this.nextSpeaker();
      this.changed();
      return;
    }

    if (this.phase === 'voting') {
      const everyone = living(this.players).every(p => p.id in this.votes || (!p.isBot && !p.connected));
      if (everyone && now - this.phaseStartedAt > 3000 && this.phaseEndsAt - now > 2000) {
        this.phaseEndsAt = now + 2000;
        this.changed();
      }
    }

    if (this.phase === 'night' && !this.nightShortened) {
      const pending = living(this.players).filter(p => hasNightAction(p, this.nightCtx()) && !(p.isBot ? this.botDone.has(p.id) : nightChoiceOf(this.night, p) !== null || !p.connected));
      if (!pending.length && now - this.phaseStartedAt > 4000) {
        this.nightShortened = true;
        if (this.phaseEndsAt - now > 3000) {
          this.phaseEndsAt = now + 3000;
          this.changed();
        }
      }
    }

    if (now >= this.phaseEndsAt) this.advance();
  }

  /** Force the current phase to end (used by tests and the "skip" debug path). */
  advance(): void {
    switch (this.phase) {
      case 'reveal':
        this.round = 1;
        this.beginNight();
        return;
      case 'night':
        this.resolveNightPhase();
        return;
      case 'morning':
        this.beginTestimony();
        return;
      case 'testimony':
        this.enter('discussion', this.settings.discussionDuration * 1000);
        this.event(narrate.discussion(), 'info');
        this.scheduleBots(2000, 9000);
        return;
      case 'discussion':
        this.votes = {};
        this.enter('voting', this.settings.voteDuration * 1000);
        this.event('⚖️ بدأ التصويت! اختر من تطرده أو تجاوز.', 'special');
        this.scheduleBots(2500, Math.max(3000, this.settings.voteDuration * 800));
        return;
      case 'voting':
        this.resolveVote();
        return;
      case 'verdict':
        this.round += 1;
        this.beginNight();
        return;
      default:
        return;
    }
  }

  // ── Phase internals ──────────────────────────────────────────────────────

  private enter(phase: Phase, durationMs: number) {
    const now = this.now();
    this.phase = phase;
    this.phaseStartedAt = now;
    this.phaseEndsAt = now + durationMs;
    this.botDone.clear();
    this.changed();
  }

  private beginNight() {
    this.night = emptyNight();
    this.nightShortened = false;
    this.enter('night', this.settings.nightDuration * 1000);
    this.event(narrate.nightFalls(this.round), 'special');
    this.scheduleBots(2000, 7000);
  }

  private resolveNightPhase() {
    // Bots that never got to act do so now.
    for (const b of living(this.players).filter(p => p.isBot && !this.botDone.has(p.id))) this.botNightAct(b);
    // An idle (all-human) mafia would freeze the game forever: the family
    // then strikes on its own so every night still moves the story.
    const family = living(this.players).filter(p => isMafiaTeam(p.role));
    if (family.length && !Object.keys(this.night.mafiaVotes).length) {
      const victim = pick(living(this.players).filter(p => !isMafiaTeam(p.role)), this.rng);
      if (victim) this.night = applyNightChoice(this.night, family[0], victim.id);
      this.event('🕴️ لم تتفق العائلة، فتحرّك رجالها وحدهم.', 'private', family.map(f => f.id));
    }

    const ctx = this.nightCtx();
    const result = resolveNight(this.players, this.night, ctx, this.rng);
    const doctor = living(this.players).find(p => p.role === 'doctor');
    this.lastDoctorTarget = doctor ? this.night.doctor : null;
    if (result.usedBullet) this.vigilanteBullets = 0;

    // Private results.
    const detective = living(this.players).find(p => p.role === 'detective');
    if (detective && result.investigation) {
      const inv: Investigation = { round: this.round, ...result.investigation };
      (this.investigations[detective.id] ??= []).push(inv);
      const t = this.player(inv.targetId);
      this.event(`🔍 نتيجة تحقيقك: ${t?.name} ${inv.looksMafia ? 'من المافيا!' : 'يبدو بريئاً.'}`, inv.looksMafia ? 'danger' : 'private', [detective.id]);
      const mem = this.memories[detective.id];
      if (mem) {
        mem.known[inv.targetId] = inv.looksMafia ? 'mafia' : 'town';
        mem.investigated.push(inv.targetId);
      }
    }

    // Apply deaths.
    const accusersOf = (victim: string) =>
      this.chat.filter(m => m.channel === 'public' && m.text.includes(this.player(victim)?.name ?? '\u0000')).map(m => m.authorId);
    for (const id of result.deaths) {
      const p = this.player(id);
      if (!p) continue;
      p.alive = false;
      const reveal = this.settings.revealRolesOnDeath ? p.role : undefined;
      const how = id === result.vigilanteShot ? 'vigilante' : result.bodyguardDied && p.role === 'bodyguard' ? 'bodyguard' : 'mafia';
      this.event(narrate.death(p.name, reveal ? ROLE_INFO[reveal].name : null, how), 'danger');
      for (const b of this.players.filter(x => x.isBot && x.alive)) {
        const mem = this.memories[b.id];
        if (mem) perceiveDeath(mem, id, reveal, accusersOf(id));
      }
    }
    if (!result.deaths.length) this.event(result.saved.length ? narrate.saved() : narrate.quiet(), 'special');

    if (result.deaths.length) this.timeline.push({ round: this.round, kind: 'night-kill', playerIds: result.deaths });
    if (result.saved.length) this.timeline.push({ round: this.round, kind: 'saved', playerIds: result.saved });
    if (result.vigilanteShot) this.timeline.push({ round: this.round, kind: 'vigilante', playerIds: [result.vigilanteShot] });
    this.lastDeaths = result.deaths;

    if (this.finishIfWon(checkWinner(this.players))) return;
    this.enter('morning', MORNING_MS);
    this.scheduleBots(1500, 5000);
  }

  private beginTestimony() {
    const alive = living(this.players).map(p => p.id);
    const offset = (this.round - 1) % Math.max(1, alive.length);
    this.testimonyOrder = [...alive.slice(offset), ...alive.slice(0, offset)];
    this.speakerIdx = -1;
    this.phase = 'testimony';
    this.event('🎙️ وقت الشهادات: كل لاعب يتكلم بدوره.', 'special');
    this.nextSpeaker();
  }

  private nextSpeaker() {
    this.speakerIdx += 1;
    // Skip players who died or dropped.
    while (this.speakerIdx < this.testimonyOrder.length) {
      const p = this.player(this.testimonyOrder[this.speakerIdx]);
      if (p?.alive && (p.isBot || p.connected)) break;
      this.speakerIdx += 1;
    }
    if (this.speakerIdx >= this.testimonyOrder.length) {
      this.advance();
      return;
    }
    const speaker = this.player(this.testimonyOrder[this.speakerIdx])!;
    const slot = this.settings.testimonyDuration * 1000;
    const now = this.now();
    this.phaseStartedAt = now;
    this.phaseEndsAt = now + (speaker.isBot ? Math.min(slot, 6000) : slot);
    this.botDone.clear();
    if (speaker.isBot) this.botNextAt[speaker.id] = now + 1200 + this.rng() * 1200;
    this.changed();
  }

  private resolveVote() {
    for (const b of living(this.players).filter(p => p.isBot && !(p.id in this.votes))) this.botVote(b);
    const tally = tallyVotes(this.votes, this.players);
    let lynchedJester = false;
    this.lastDeaths = [];
    if (tally.targetId) {
      const t = this.player(tally.targetId)!;
      t.alive = false;
      lynchedJester = t.role === 'jester';
      const reveal = this.settings.revealRolesOnDeath || lynchedJester ? t.role : undefined;
      this.event(narrate.lynch(t.name, tally.counts[t.id], reveal ? ROLE_INFO[reveal].name : null), 'danger');
      this.timeline.push({ round: this.round, kind: 'lynch', playerIds: [t.id] });
      this.lastDeaths = [t.id];
      for (const b of this.players.filter(x => x.isBot && x.alive)) {
        const mem = this.memories[b.id];
        if (mem) perceiveLynch(mem, this.votes, t.id, reveal);
      }
    } else {
      this.event(tally.tie ? '🤝 تعادل في الأصوات — لم يُطرد أحد.' : '⏭️ قرر الشعب عدم طرد أحد.', 'info');
      this.timeline.push({ round: this.round, kind: 'no-lynch', playerIds: [] });
    }
    if (this.finishIfWon(checkWinner(this.players, lynchedJester))) return;
    this.enter('verdict', VERDICT_MS);
  }

  private finishIfWon(winner: Winner | null): boolean {
    if (!winner) return false;
    this.winner = winner;
    this.event(narrate.win(winner), winner === 'town' ? 'special' : 'danger');
    this.enter('game-over', 0);
    this.phaseEndsAt = this.phaseStartedAt;
    return true;
  }

  // ── Bots ─────────────────────────────────────────────────────────────────

  private scheduleBots(minMs: number, maxMs: number) {
    const now = this.now();
    for (const b of this.players.filter(p => p.isBot && p.alive)) this.botNextAt[b.id] = now + minMs + this.rng() * (maxMs - minMs);
  }

  private runBots(now: number) {
    for (const b of this.players) {
      if (!b.isBot || !b.alive) continue;
      const due = this.botNextAt[b.id];
      if (due === undefined || now < due) continue;
      delete this.botNextAt[b.id];
      this.botAct(b, now);
    }
  }

  private recentLines: string[] = [];

  /** Generate a bot line, re-rolling a few times to avoid repeating the table. */
  private freshLine(b: RoomPlayer, mem: BotMemory, kind: 'testimony' | 'discussion' | 'morning'): string | null {
    let line: string | null = null;
    for (let i = 0; i < 6; i++) {
      line = botLine(b, mem, this.players, this.rng, { kind, lastDeaths: this.lastDeaths });
      if (!line || !this.recentLines.includes(line)) break;
    }
    if (line) {
      this.recentLines.push(line);
      if (this.recentLines.length > 14) this.recentLines.shift();
    }
    return line;
  }

  private botAct(b: RoomPlayer, now: number) {
    const mem = (this.memories[b.id] ??= newMemory(b.id, this.players, this.rng));
    switch (this.phase) {
      case 'night':
        this.botNightAct(b);
        this.changed();
        return;
      case 'voting':
        if (!(b.id in this.votes)) this.botVote(b);
        this.changed();
        return;
      case 'morning': {
        const line = this.freshLine(b, mem, 'morning');
        if (line) this.botSay(b, line);
        return;
      }
      case 'testimony': {
        if (this.speakerId !== b.id) return;
        if (!this.botDone.has(b.id)) {
          const line = this.freshLine(b, mem, 'testimony');
          if (line) this.botSay(b, line);
          this.botDone.add(b.id);
          this.botNextAt[b.id] = now + 2500;
        } else {
          this.nextSpeaker();
        }
        return;
      }
      case 'discussion': {
        if (this.rng() < 0.75) {
          const line = this.freshLine(b, mem, 'discussion');
          if (line) this.botSay(b, line);
        }
        // Talk again later in the discussion, a bit less as time goes on.
        if (this.phaseEndsAt - now > 8000) this.botNextAt[b.id] = now + 7000 + this.rng() * 12000;
        return;
      }
      default:
        return;
    }
  }

  /** Lets an external voice/LLM reply speak as a bot (local mode). */
  botSay(b: RoomPlayer, text: string) {
    const channel: ChatChannel = b.alive ? 'public' : 'dead';
    this.pushChat(channel, b.id, b.name, text.slice(0, 280));
    if (channel === 'public') {
      for (const other of this.players.filter(x => x.isBot && x.alive && x.id !== b.id)) {
        const mem = this.memories[other.id];
        if (mem) perceiveChat(other, mem, b.id, text, this.players);
      }
    }
    this.changed();
  }

  private botVote(b: RoomPlayer) {
    const mem = (this.memories[b.id] ??= newMemory(b.id, this.players, this.rng));
    const target = decideVote(b, mem, this.players, this.rng, this.votes);
    this.votes[b.id] = target ?? SKIP_VOTE;
  }

  private botNightAct(b: RoomPlayer) {
    this.botDone.add(b.id);
    if (!hasNightAction(b, this.nightCtx())) return;
    const mem = (this.memories[b.id] ??= newMemory(b.id, this.players, this.rng));
    const humanMafiaPick = isMafiaTeam(b.role)
      ? Object.entries(this.night.mafiaVotes).find(([id]) => !this.player(id)?.isBot)?.[1] ?? Object.values(this.night.mafiaVotes)[0]
      : undefined;
    const target = decideNight(b, mem, this.players, this.rng, { ...this.nightCtx(), teamPick: humanMafiaPick });
    const t = target ? this.player(target) : undefined;
    if (t && canTargetAtNight(b, t, this.nightCtx())) this.night = applyNightChoice(this.night, b, t.id);
  }

  // ── Logging ──────────────────────────────────────────────────────────────

  private event(text: string, tone: EventTone, to?: string[]) {
    this.events.push({ id: ++this.seq, at: this.now(), round: this.round, tone, text, to });
    if (this.events.length > MAX_EVENTS) this.events.splice(0, this.events.length - MAX_EVENTS);
  }

  private pushChat(channel: ChatChannel, authorId: string, authorName: string, text: string) {
    this.chat.push({ id: ++this.seq, at: this.now(), channel, authorId, authorName, text });
    if (this.chat.length > MAX_CHAT) this.chat.splice(0, this.chat.length - MAX_CHAT);
  }

  private systemChat(text: string) {
    this.pushChat('public', 'system', 'النظام', text);
  }

  // ── Views ────────────────────────────────────────────────────────────────

  viewFor(viewerId: string): PlayerView {
    const me = this.player(viewerId);
    const meMafia = isMafiaTeam(me?.role);
    const over = this.phase === 'game-over';
    const meDead = me ? !me.alive : false;

    const players: PublicPlayer[] = this.players.map(p => {
      const knowsRole = p.id === viewerId || over || (!p.alive && this.settings.revealRolesOnDeath) || (meMafia && isMafiaTeam(p.role));
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        isHost: p.isHost,
        connected: p.connected,
        ready: p.ready,
        alive: p.alive,
        role: knowsRole ? p.role : undefined,
        cosmetics: p.cosmetics,
      };
    });

    const counts = this.phase === 'voting' || this.phase === 'verdict' ? tallyVotes(this.votes, this.players).counts : {};
    const showAllVotes = !this.settings.secretVoting || this.phase === 'verdict' || over;
    const votes = showAllVotes ? { ...this.votes } : me && this.votes[me.id] ? { [me.id]: this.votes[me.id] } : {};

    const chat = this.chat.filter(m => m.channel === 'public' || (m.channel === 'mafia' && (meMafia || over)) || (m.channel === 'dead' && (meDead || over)));
    const events = this.events.filter(e => !e.to || e.to.includes(viewerId) || (over && e.tone !== 'private'));

    return {
      code: this.code,
      mode: this.mode,
      meId: viewerId,
      hostId: this.hostId,
      serverNow: this.now(),
      phase: this.phase,
      phaseStartedAt: this.phaseStartedAt,
      phaseEndsAt: this.phaseEndsAt,
      round: this.round,
      winner: this.winner,
      settings: this.settings,
      players,
      speakerId: this.speakerId,
      votes,
      voteCounts: counts,
      votedIds: Object.keys(this.votes),
      myNightTarget: me && this.phase === 'night' ? nightChoiceOf(this.night, me) : null,
      mafiaPicks: meMafia && this.phase === 'night' ? { ...this.night.mafiaVotes } : {},
      investigations: this.investigations[viewerId] ?? [],
      vigilanteBullets: me?.role === 'vigilante' ? this.vigilanteBullets : 0,
      lastDoctorTarget: me?.role === 'doctor' ? this.lastDoctorTarget : null,
      chat: chat.slice(-120),
      events: events.slice(-80),
      lastDeaths: this.lastDeaths,
      timeline: over ? this.timeline : [],
    };
  }
}

function sanitizeName(name: string): string {
  return String(name ?? '')
    .replace(/[\u0000-\u001f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 18);
}

function sanitizeAvatar(a: string): string {
  const s = String(a ?? '').trim();
  return s && [...s].length <= 4 ? s : '🎭';
}

/** Random room code without ambiguous characters. */
export function makeRoomCode(rng: Rng = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => alphabet[Math.floor(rng() * alphabet.length)]).join('');
}


/** Routes a wire command to the matching Room method (shared by local + server). */
export function applyCommand(room: Room, playerId: string, cmd: import('./protocol').Command): Result {
  switch (cmd?.type) {
    case 'ready':
      return room.setReady(playerId, !!cmd.ready);
    case 'addBot':
      return room.addBot(playerId);
    case 'fillBots':
      return room.fillWithBots(playerId, Number(cmd.count) || 0);
    case 'kick':
      return room.kick(playerId, String(cmd.targetId));
    case 'settings':
      return room.updateSettings(playerId, cmd.patch ?? {});
    case 'start':
      return room.start(playerId);
    case 'vote':
      return room.vote(playerId, String(cmd.targetId));
    case 'night':
      return room.nightAction(playerId, String(cmd.targetId));
    case 'clearNight':
      return room.clearNightAction(playerId);
    case 'chat':
      return room.say(playerId, String(cmd.text ?? ''));
    case 'endTurn':
      return room.endTurn(playerId);
    case 'cosmetics':
      room.setCosmetics(playerId, cmd.cosmetics ?? {});
      return { ok: true };
    case 'backToLobby':
      return room.backToLobby(playerId);
    default:
      return { ok: false, error: 'أمر غير معروف' };
  }
}
