'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Crosshair, Eye, LogOut, MessageSquare, ScrollText, Users, X } from 'lucide-react';
import { useGame } from '@/client/game-store';
import { ambience, sfx } from '@/client/audio';
import { gameNow } from '@/client/game-store';
import { useProfile } from '@/client/profile';
import { ROLE_INFO } from '@/game/roles';
import { SKIP_VOTE, type Phase, type PlayerView, type PublicPlayer } from '@/game/types';
import { RainCanvas } from '../atmosphere';
import { RoleCard, RoleMedallion } from '../cards';
import { SettingsButton } from '../settings';
import { Button, cn } from '../ui';
import { ChatBox } from './ChatBox';
import { GameOver } from './GameOver';
import { Seat } from './Seat';
import { isMafiaRole, useCountdown } from './hooks';
import { VoiceButton } from './VoiceButton';
import { ChipLayer, DeckReveal, Flashlight, MuzzleFlash, ParallaxImage, PhaseCinematic, TargetCursor, useParallax, useShake, useTension } from './fx';

const PHASE_TITLE: Record<Phase, string> = {
  lobby: 'الانتظار',
  reveal: 'كشف الأدوار',
  night: 'الليل',
  morning: 'الصباح',
  testimony: 'الشهادات',
  discussion: 'النقاش',
  voting: 'التصويت',
  verdict: 'الحكم',
  'game-over': 'النهاية',
};

const ACTION_VERB: Record<string, string> = {
  mafia: 'اختر ضحية العائلة الليلة',
  godfather: 'اختر الضحية — كلمتك هي الأخيرة',
  doctor: 'اختر من تحميه الليلة',
  detective: 'اختر من تحقق فيه',
  bodyguard: 'اختر من تحرسه بجسدك',
  vigilante: 'اختر هدف رصاصتك الوحيدة... أو احتفظ بها',
};

/** Client-side mirror of canTargetAtNight (server validates again). */
function nightTargetable(meP: PublicPlayer, t: PublicPlayer, view: PlayerView): boolean {
  if (!meP.alive || !t.alive) return false;
  switch (meP.role) {
    case 'mafia':
    case 'godfather':
      return !isMafiaRole(t.role);
    case 'doctor':
      return t.id !== view.lastDoctorTarget;
    case 'detective':
    case 'bodyguard':
      return t.id !== meP.id;
    case 'vigilante':
      return t.id !== meP.id && view.vigilanteBullets > 0;
    default:
      return false;
  }
}

function hasAction(meP: PublicPlayer | undefined, view: PlayerView) {
  if (!meP?.alive || !meP.role) return false;
  if (meP.role === 'vigilante') return view.vigilanteBullets > 0;
  return ROLE_INFO[meP.role].nightAction !== null;
}

export function Table({ view, onLeave }: { view: PlayerView; onLeave: () => void }) {
  const send = useGame(s => s.send);
  const voiceOn = useProfile(s => s.prefs.voice);
  const cardBack = useProfile(s => s.equipped.back);
  const meP = view.players.find(p => p.id === view.meId)!;
  const others = view.players.filter(p => p.id !== view.meId);
  const left = useCountdown(view.phaseEndsAt);
  const [panel, setPanel] = useState<'chat' | 'log' | null>(null);
  const [peek, setPeek] = useState(false);
  const night = view.phase === 'night';
  const acting = night && hasAction(meP, view);
  const voting = view.phase === 'voting' && meP.alive;
  const myVote = view.votes[view.meId];
  const alive = view.players.filter(p => p.alive);

  // Ambience follows the phase; cinematics handle the one-shot sounds.
  useEffect(() => {
    ambience.setMood(view.phase === 'night' ? 'night' : view.phase === 'voting' || view.phase === 'verdict' ? 'tense' : 'day');
  }, [view.phase]);
  useTension(view, left);

  const { controls: shakeControls, shake } = useShake();
  const { px, py, bind } = useParallax();
  const [muzzle, setMuzzle] = useState<string | null>(null);
  const onImpact = useCallback(
    (strength: number, seatId?: string) => {
      void shake(strength);
      if (seatId) setMuzzle(seatId);
    },
    [shake]
  );

  // Speech bubbles: each player's most recent line, for a few seconds.
  const [now, setNow] = useState(() => gameNow());
  useEffect(() => {
    const id = setInterval(() => setNow(gameNow()), 500);
    return () => clearInterval(id);
  }, []);
  const bubbles = useMemo(() => {
    const out: Record<string, { text: string; tone: 'public' | 'mafia' }> = {};
    for (const m of view.chat) {
      if (m.authorId === 'system' || m.channel === 'dead' || now - m.at > 5000) continue;
      out[m.authorId] = { text: m.text, tone: m.channel === 'mafia' ? 'mafia' : 'public' };
    }
    return out;
  }, [view.chat, now]);

  // Seat interaction
  const targetable = (p: PublicPlayer) => (voting ? p.alive && p.id !== meP.id : acting ? nightTargetable(meP, p, view) : false);
  const clickSeat = (p: PublicPlayer) => {
    if (!targetable(p)) return;
    if (voting) {
      send({ type: 'vote', targetId: p.id });
    } else if (acting) {
      const cue = meP.role === 'detective' ? 'paper' : meP.role === 'doctor' || meP.role === 'bodyguard' ? 'card-flip' : 'knock';
      sfx(cue, { detune: true });
      send({ type: 'night', targetId: p.id });
    }
  };
  const chosen = voting ? myVote : view.myNightTarget;
  const teamPicks = new Set(Object.values(view.mafiaPicks));
  const votersOf = (id: string) => Object.entries(view.votes).filter(([, t]) => t === id).map(([v]) => view.players.find(p => p.id === v)!).filter(Boolean);

  const latestEvent = useMemo(() => [...view.events].reverse().find(e => e.tone !== 'private') ?? null, [view.events]);
  const privateEvents = view.events.filter(e => e.to);
  // Only this round's secrets (e.g. last night's investigation) stay on the table.
  const lastPrivate = privateEvents.filter(e => e.round === view.round).at(-1);

  const seatProps = (p: PublicPlayer) => ({
    player: p,
    isMe: p.id === view.meId,
    speaking: view.speakerId === p.id,
    targetable: targetable(p),
    chosen: chosen === p.id,
    teamMarked: night && teamPicks.has(p.id),
    voteCount: view.voteCounts[p.id],
    voters: view.phase === 'voting' || view.phase === 'verdict' ? votersOf(p.id) : undefined,
    hasVoted: view.phase === 'voting' && view.votedIds.includes(p.id),
    bubble: bubbles[p.id],
    onClick: () => clickSeat(p),
  });

  // Ellipse positions (desktop): arc from 160° over the top to 380°.
  const positions = others.map((_, i) => {
    const n = others.length;
    const a = ((160 + (n === 1 ? 110 : (220 * i) / (n - 1))) * Math.PI) / 180;
    return { left: 50 + 44 * Math.cos(a), top: 54 + 40 * Math.sin(a) };
  });

  return (
    <motion.div animate={shakeControls} {...bind} className="relative z-10 flex min-h-dvh flex-col overflow-hidden sm:h-dvh sm:min-h-0">
      {/* Scene (parallax) */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <ParallaxImage src="/art/table.webp" px={px} py={py} depth={18} className={cn('h-full w-full object-cover transition-[filter] duration-[2000ms]', night ? 'night-tint' : 'opacity-60 [filter:sepia(0.25)_brightness(0.7)]')} />
        <div className={cn('absolute inset-0 transition-colors duration-[2000ms]', night ? 'bg-[#050812]/70' : 'bg-ink/40')} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_20%,#0b0809_80%)]" />
      </div>
      <RainCanvas intensity={night ? 1.3 : 0.7} />

      <TargetCursor mode={acting ? (meP.role as 'mafia') : voting ? 'vote' : null} />
      <ChipLayer view={view} />
      <PhaseCinematic view={view} onImpact={onImpact} />
      {muzzle && <MuzzleFlash seatId={muzzle} onDone={() => setMuzzle(null)} />}

      {/* Top HUD */}
      <header className="relative z-20 flex items-start justify-between gap-2 p-3 sm:p-5">
        <div className="flex gap-2">
          <Button variant="dark" className="px-3" onClick={onLeave} aria-label="خروج">
            <LogOut className="h-4 w-4" />
          </Button>
          <SettingsButton />
        </div>

        <div className="flex flex-col items-center text-center">
          <span className="font-kufi text-xs tracking-[0.3em] text-mist">الجولة {Math.max(view.round, 1)}</span>
          <h1 className={cn('font-display text-4xl leading-tight sm:text-5xl', night ? 'text-rain' : 'brass-text')}>{PHASE_TITLE[view.phase]}</h1>
          {view.phase !== 'game-over' && (
            <span className={cn('font-kufi text-3xl tabular-nums sm:text-4xl', left <= 5 ? 'text-blood-hi animate-pulse' : 'text-fog')} dir="ltr">
              {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 py-2 font-kufi text-sm text-fog" title="الأحياء">
            <Users className="h-4 w-4 text-brass" /> {alive.length}
          </span>
          <button onClick={() => setPanel(panel ? null : 'chat')} aria-label="الدردشة والسجل" className="relative grid h-10 w-10 place-items-center rounded-full border border-brass/40 bg-black/50 text-brass lg:hidden">
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 gap-4 px-3 pb-3 sm:px-5">
        {/* Stage */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Desktop ellipse */}
          <div className="relative hidden min-h-[260px] flex-1 sm:block">
            <Flashlight active={acting} />
            {others.map((p, i) => (
              <div key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${positions[i].left}%`, top: `${positions[i].top}%` }}>
                <Seat {...seatProps(p)} />
              </div>
            ))}
            <Narration view={view} latest={latestEvent?.text} lastPrivate={lastPrivate?.text} />
          </div>

          {/* Mobile grid */}
          <div className="flex flex-col gap-3 sm:hidden">
            <Narration view={view} latest={latestEvent?.text} lastPrivate={lastPrivate?.text} mobile />
            <div className="grid grid-cols-4 gap-y-3">
              {others.map(p => (
                <div key={p.id} className="flex justify-center">
                  <Seat {...seatProps(p)} />
                </div>
              ))}
            </div>
          </div>

          {/* Action bar */}
          <div className="mt-3 flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-end sm:justify-between">
            <MyCard view={view} me={meP} peek={peek} setPeek={setPeek} />
            <ActionBar view={view} me={meP} acting={acting} voting={voting} myVote={myVote} voiceOn={voiceOn} />
            <div className="hidden sm:block">
              <Seat {...seatProps(meP)} size="lg" />
            </div>
          </div>
        </div>

        {/* Side panel (desktop) */}
        <aside className="deco-panel hidden min-h-0 w-[340px] shrink-0 flex-col overflow-hidden p-0 lg:flex">
          <SidePanel view={view} />
        </aside>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {panel && (
          <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween' }} className="fixed inset-y-0 left-0 z-[120] flex w-[88%] max-w-sm flex-col border-r border-brass/30 bg-char/95 backdrop-blur lg:hidden">
            <button onClick={() => setPanel(null)} className="absolute left-3 top-3 z-10 text-mist" aria-label="إغلاق">
              <X className="h-6 w-6" />
            </button>
            <SidePanel view={view} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Night veil for players without a night action */}
      <AnimatePresence>
        {night && meP.alive && !acting && !isMafiaRole(meP.role) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-[40] grid place-items-center bg-[#03050b]/80">
            <div className="text-center">
              <Eye className="mx-auto mb-4 h-14 w-14 text-rain/40" />
              <p className="font-display text-5xl text-rain/70">أغمض عينيك</p>
              <p className="mt-2 text-mist">في الظلام، أحدهم يختار ضحيته...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role reveal */}
      <AnimatePresence>{view.phase === 'reveal' && meP.role && <DeckReveal view={view} me={meP} left={left} cardBack={cardBack} />}</AnimatePresence>

      {view.phase === 'game-over' && <GameOver view={view} onLeave={onLeave} />}
    </motion.div>
  );
}

function Narration({ view, latest, lastPrivate, mobile }: { view: PlayerView; latest?: string; lastPrivate?: string; mobile?: boolean }) {
  const speaker = view.players.find(p => p.id === view.speakerId);
  return (
    <div className={cn(mobile ? 'relative' : 'absolute left-1/2 top-[56%] w-[min(440px,46%)] -translate-x-1/2 -translate-y-1/2')}>
      <AnimatePresence mode="wait">
        <motion.div key={latest} initial={{ opacity: 0, y: 10, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0 }} className="rounded-sm border border-[#d9c9a3]/40 bg-[#e9dcc0] px-5 py-4 text-center text-ink shadow-[0_20px_40px_rgba(0,0,0,0.7)]">
          <p className="mb-1 border-b border-ink/20 pb-1 font-display text-lg text-ink/70">جريدة المدينة</p>
          <p className="font-kufi text-[15px] leading-relaxed sm:text-base">{latest ?? 'الكل جالس حول الطاولة...'}</p>
          {speaker && view.phase === 'testimony' && <p className="mt-2 font-kufi text-sm text-blood">🎙️ الكلمة الآن لـ {speaker.name}</p>}
        </motion.div>
      </AnimatePresence>
      {lastPrivate && view.phase !== 'game-over' && (
        <p className="mt-2 rounded border border-brass/30 bg-black/60 px-3 py-1.5 text-center text-xs text-brass-hi backdrop-blur">🔒 {lastPrivate}</p>
      )}
    </div>
  );
}

function ActionBar({ view, me, acting, voting, myVote, voiceOn }: { view: PlayerView; me: PublicPlayer; acting: boolean; voting: boolean; myVote?: string; voiceOn: boolean }) {
  const send = useGame(s => s.send);
  const speaker = view.players.find(p => p.id === view.speakerId);
  const target = (id: string | null | undefined) => view.players.find(p => p.id === id)?.name;
  const talkPhase = view.phase === 'discussion' || view.phase === 'morning' || (view.phase === 'testimony' && view.speakerId === me.id);

  let body: React.ReactNode = null;
  if (!me.alive && view.phase !== 'game-over') {
    body = <p className="text-mist">👻 أنت ميت. تقدر تتكلم مع الأموات وتتفرج.</p>;
  } else if (view.phase === 'reveal') {
    body = <p className="text-fog">احفظ دورك جيداً... الليل قادم.</p>;
  } else if (acting) {
    body = (
      <div className="flex flex-col items-center gap-2">
        <p className="flex items-center gap-2 font-kufi text-brass-hi">
          <Crosshair className="h-4 w-4" /> {ACTION_VERB[me.role!]}
        </p>
        <p className="text-sm text-mist">{view.myNightTarget ? `اخترت: ${target(view.myNightTarget)} — تقدر تغيّر رأيك` : 'اضغط على صورة لاعب'}</p>
        {isMafiaRole(me.role) && Object.keys(view.mafiaPicks).length > 0 && (
          <p className="text-xs text-blood-hi">
            العائلة:{' '}
            {Object.entries(view.mafiaPicks)
              .map(([who, t]) => `${target(who)} ← ${target(t)}`)
              .join(' · ')}
          </p>
        )}
        {me.role === 'vigilante' && view.myNightTarget && (
          <Button variant="ghost" className="py-1.5 text-sm" onClick={() => send({ type: 'clearNight' })}>
            احتفظ بالرصاصة
          </Button>
        )}
        {me.role === 'doctor' && view.lastDoctorTarget && <p className="text-xs text-mist">لا تقدر تحمي {target(view.lastDoctorTarget)} ليلتين متتاليتين.</p>}
      </div>
    );
  } else if (view.phase === 'night') {
    body = <p className="text-rain">{isMafiaRole(me.role) ? 'العائلة تتحرك... تكلم معهم في الدردشة.' : 'الليل طويل.'}</p>;
  } else if (voting) {
    body = (
      <div className="flex flex-col items-center gap-2">
        <p className="font-kufi text-brass-hi">اضغط على من تريد طرده</p>
        <p className="text-sm text-mist">
          {myVote ? (myVote === SKIP_VOTE ? 'اخترت التجاوز' : `صوتك على: ${target(myVote)}`) : 'لم تصوّت بعد'} · صوّت {view.votedIds.length} من {view.players.filter(p => p.alive).length}
          {me.role === 'mayor' && ' · صوتك بصوتين 👑'}
        </p>
        <Button variant="dark" className="py-1.5 text-sm" disabled={myVote === SKIP_VOTE} onClick={() => send({ type: 'vote', targetId: SKIP_VOTE })}>
          تجاوز — لا أطرد أحداً
        </Button>
      </div>
    );
  } else if (view.phase === 'testimony') {
    body =
      speaker?.id === me.id ? (
        <div className="flex flex-col items-center gap-2">
          <p className="font-kufi text-brass-hi">🎙️ دورك! اكتب شهادتك في الدردشة</p>
          <Button variant="ghost" className="py-1.5 text-sm" onClick={() => send({ type: 'endTurn' })}>
            أنهيت كلامي
          </Button>
        </div>
      ) : (
        <p className="text-fog">يتكلم الآن: {speaker?.name ?? '—'}</p>
      );
  } else if (view.phase === 'discussion') {
    body = <p className="text-fog">اتهم، دافع، واسأل. التصويت قادم.</p>;
  } else if (view.phase === 'morning') {
    body = <p className="text-fog">اقرأ الجريدة... من مات ولماذا؟</p>;
  } else if (view.phase === 'verdict') {
    body = <p className="text-fog">العدالة قالت كلمتها.</p>;
  }

  return (
    <div className="deco-panel w-full max-w-xl px-5 py-3 text-center sm:mx-4">
      {body}
      {voiceOn && view.mode === 'local' && talkPhase && me.alive && <VoiceButton view={view} />}
    </div>
  );
}

function MyCard({ view, me, peek, setPeek }: { view: PlayerView; me: PublicPlayer; peek: boolean; setPeek: (v: boolean) => void }) {
  if (!me.role) return null;
  return (
    <div className="relative">
      <button
        onPointerDown={() => setPeek(true)}
        onPointerUp={() => setPeek(false)}
        onPointerLeave={() => setPeek(false)}
        onKeyDown={e => e.key === ' ' && setPeek(true)}
        onKeyUp={() => setPeek(false)}
        className="flex items-center gap-3 rounded-xl border border-brass/40 bg-black/60 p-2 pl-4 backdrop-blur transition hover:border-brass"
        aria-label="اضغط مطولاً لرؤية بطاقتك"
      >
        <RoleMedallion role={me.role} size={40} />
        <span className="text-right">
          <span className="block font-display text-2xl leading-none brass-text">{ROLE_INFO[me.role].name}</span>
          <span className="text-[11px] text-mist">اضغط مطولاً لعرض البطاقة</span>
        </span>
      </button>
      {me.role === 'detective' && view.investigations.length > 0 && (
        <div className="mt-2 rounded-lg border border-rain/30 bg-black/60 p-2 text-xs">
          <p className="mb-1 flex items-center gap-1 text-rain">
            <BookOpen className="h-3.5 w-3.5" /> دفتر المحقق
          </p>
          {view.investigations.map(inv => (
            <p key={inv.round} className={inv.looksMafia ? 'text-blood-hi' : 'text-jade'}>
              ل{inv.round}: {view.players.find(p => p.id === inv.targetId)?.name} — {inv.looksMafia ? 'مافيا' : 'بريء'}
            </p>
          ))}
        </div>
      )}
      {me.role === 'vigilante' && <p className="mt-1 text-center text-xs text-mist">الرصاص: {view.vigilanteBullets ? '🎯' : 'نفد'}</p>}
      <AnimatePresence>
        {peek && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} className="pointer-events-none fixed bottom-24 left-1/2 z-[100] w-56 -translate-x-1/2 sm:absolute sm:bottom-full sm:left-0 sm:mb-3 sm:translate-x-0">
            <RoleCard role={me.role} />
            <p className="mt-2 rounded bg-black/80 p-2 text-center text-xs text-fog">{ROLE_INFO[me.role].description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidePanel({ view }: { view: PlayerView }) {
  const [tab, setTab] = useState<'chat' | 'log'>('chat');
  const events = view.events;
  return (
    <>
      <div className="flex border-b border-white/10">
        {(['chat', 'log'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('flex flex-1 items-center justify-center gap-2 py-3 font-kufi text-sm transition', tab === t ? 'border-b-2 border-brass text-brass-hi' : 'text-mist hover:text-fog')}>
            {t === 'chat' ? <MessageSquare className="h-4 w-4" /> : <ScrollText className="h-4 w-4" />}
            {t === 'chat' ? 'الدردشة' : 'السجل'}
          </button>
        ))}
      </div>
      {tab === 'chat' ? (
        <ChatBox view={view} className="min-h-0 flex-1" />
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {[...events].reverse().map(e => (
            <p
              key={e.id}
              className={cn(
                'rounded border-r-2 px-3 py-1.5 text-sm leading-relaxed',
                e.tone === 'danger' ? 'border-blood-hi bg-blood/10 text-fog' : e.tone === 'special' ? 'border-brass bg-brass/5 text-fog' : e.to ? 'border-rain bg-rain/10 text-rain' : 'border-white/20 text-mist'
              )}
            >
              {e.to && '🔒 '}
              {e.text}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
