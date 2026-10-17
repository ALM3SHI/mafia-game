'use client';

/**
 * Cinematic + interactive effects for the game table.
 *
 *  <PhaseCinematic/>   full-screen sequences on phase changes (blinds, lightning,
 *                      spinning newspaper, gavel, …) with matching sound
 *  <ChipLayer/>        poker chips fly from voter to target when votes land
 *  <Flashlight/>       at night the table is dark except around your cursor
 *  <TargetCursor/>     role-specific reticle while choosing a target
 *  <MuzzleFlash/>      gunshot flash at a victim's seat
 *  useParallax()       background drifts with the pointer
 *  useShake()          screen shake on impacts
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { audio, sfx } from '@/client/audio';
import { ROLE_INFO } from '@/game/roles';
import { SKIP_VOTE, type Phase, type PlayerView, type PublicPlayer } from '@/game/types';
import { CardBack, RoleCard, ROLE_ICON } from '../cards';
import { GameIcon, type GameIconName } from '../GameIcon';
import { cn } from '../ui';

const seatEl = (id: string) => (typeof document === 'undefined' ? null : (document.querySelector(`[data-seat="${id}"]`) as HTMLElement | null));
function seatCenter(id: string): { x: number; y: number } | null {
  const el = seatEl(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 40) };
}

// ── Shake ──────────────────────────────────────────────────────────────────

export function useShake() {
  const controls = useAnimationControls();
  const shake = (strength = 10) =>
    controls.start({
      x: [0, -strength, strength * 0.8, -strength * 0.6, strength * 0.4, 0],
      y: [0, strength * 0.5, -strength * 0.6, strength * 0.3, 0, 0],
      transition: { duration: 0.45 },
    });
  return { controls, shake };
}

// ── Parallax ───────────────────────────────────────────────────────────────

export function useParallax(): { px: MotionValue<number>; py: MotionValue<number>; bind: { onPointerMove: (e: React.PointerEvent) => void } } {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 40, damping: 18 });
  const py = useSpring(my, { stiffness: 40, damping: 18 });
  return {
    px,
    py,
    bind: {
      onPointerMove: (e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        mx.set((e.clientX / window.innerWidth - 0.5) * 2);
        my.set((e.clientY / window.innerHeight - 0.5) * 2);
      },
    },
  };
}

export function ParallaxImage({ src, px, py, depth, className }: { src: string; px: MotionValue<number>; py: MotionValue<number>; depth: number; className?: string }) {
  const x = useTransform(px, v => v * -depth);
  const y = useTransform(py, v => v * -depth * 0.6);
  return (
    <motion.img src={src} alt="" draggable={false} style={{ x, y, scale: 1 + depth / 400 }} className={className} />
  );
}

// ── Typewriter ─────────────────────────────────────────────────────────────

export function Typewriter({ text, speed = 28, sound = true, className, onDone }: { text: string; speed?: number; sound?: boolean; className?: string; onDone?: () => void }) {
  const [n, setN] = useState(0);
  const chars = useMemo(() => Array.from(text), [text]);
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (sound && i % 3 === 0 && chars[i - 1] !== ' ') sfx('type', { volume: 0.35, detune: true });
      if (i >= chars.length) {
        clearInterval(id);
        if (sound) sfx('type-return', 0.4);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <span className={className}>
      {chars.slice(0, n).join('')}
      {n < chars.length && <span className="inline-block w-[0.5ch] animate-pulse">▍</span>}
    </span>
  );
}

// ── Venetian blinds ────────────────────────────────────────────────────────

function Blinds({ closing, color = '#04060c' }: { closing: boolean; color?: string }) {
  const slats = 14;
  return (
    <div className="pointer-events-none fixed inset-0 z-[95] flex flex-col">
      {Array.from({ length: slats }).map((_, i) => (
        <motion.div
          key={i}
          className="flex-1 origin-top"
          style={{ background: `linear-gradient(180deg, ${color}, #000 85%, rgba(201,164,92,0.25))` }}
          initial={{ scaleY: closing ? 0 : 1 }}
          animate={{ scaleY: closing ? 1 : 0 }}
          transition={{ duration: 0.55, delay: (closing ? i : slats - i) * 0.035, ease: [0.7, 0, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

function Lightning({ times = [0.15, 0.32, 1.1] }: { times?: number[] }) {
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[96] bg-[#dfe8ff]"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.85, 0, 0.6, 0, 0.35, 0] }}
      transition={{ duration: times.at(-1)! + 0.4, times: [0, 0.1, 0.18, 0.28, 0.36, 0.8, 1] }}
    />
  );
}

// ── Phase cinematics ───────────────────────────────────────────────────────

type Scene =
  | { kind: 'night'; round: number }
  | { kind: 'morning'; headline: string; deathId: string | null; saved: boolean }
  | { kind: 'voting' }
  | { kind: 'verdict'; victim: PublicPlayer | null; counts: Record<string, number> }
  | { kind: 'testimony' }
  | { kind: 'discussion' };

const SCENE_MS: Record<Scene['kind'], number> = { night: 2900, morning: 4300, voting: 1900, verdict: 4400, testimony: 1500, discussion: 1500 };

/**
 * Watches the phase and plays a short cinematic for each transition.
 * Calls `onImpact` for moments that should shake the screen.
 */
export function PhaseCinematic({ view, onImpact }: { view: PlayerView; onImpact: (strength: number, seatId?: string) => void }) {
  const [scene, setScene] = useState<Scene | null>(null);
  const prev = useRef<Phase>(view.phase);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  });
  const impactRef = useRef(onImpact);
  useEffect(() => {
    impactRef.current = onImpact;
  });

  useEffect(() => {
    const v = viewRef.current;
    const from = prev.current;
    prev.current = v.phase;
    if (from === v.phase) return;

    let next: Scene | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const publicEvents = v.events.filter(e => !e.to);

    switch (v.phase) {
      case 'night':
        next = { kind: 'night', round: v.round };
        sfx('thunder', 0.9);
        at(250, () => sfx('door-creak', 0.5));
        break;
      case 'morning': {
        const headline = publicEvents.at(-1)?.text ?? '';
        const deathId = v.lastDeaths[0] ?? null;
        const saved = !deathId && /أُنقذ|نجا|أسرع/.test(headline);
        next = { kind: 'morning', headline, deathId, saved };
        sfx('bell', 0.8);
        at(700, () => sfx('paper'));
        if (deathId) {
          at(1500, () => {
            sfx('gunshot');
            impactRef.current(14, deathId);
          });
          at(1700, () => sfx('sting-death', 0.8));
        } else if (saved) at(1500, () => sfx('sting-saved', 0.9));
        break;
      }
      case 'voting':
        next = { kind: 'voting' };
        sfx('sting-confront', 0.8);
        break;
      case 'verdict': {
        const victim = v.players.find(p => p.id === v.lastDeaths[0]) ?? null;
        next = { kind: 'verdict', victim, counts: v.voteCounts };
        sfx('drumroll', 0.9);
        at(2400, () => {
          sfx('gavel');
          impactRef.current(victim ? 16 : 8);
        });
        if (victim) at(2600, () => sfx('sting-death', 0.7));
        break;
      }
      case 'testimony':
        next = { kind: 'testimony' };
        sfx('paper', 0.6);
        break;
      case 'discussion':
        next = { kind: 'discussion' };
        sfx('chips', 0.6);
        break;
    }

    const show = setTimeout(() => setScene(next), 0);
    const hide = next ? setTimeout(() => setScene(null), SCENE_MS[next.kind]) : undefined;
    return () => {
      clearTimeout(show);
      if (hide) clearTimeout(hide);
      timers.forEach(clearTimeout);
    };
  }, [view.phase]);

  return (
    <AnimatePresence>
      {scene && (
        <motion.div key={scene.kind} className="pointer-events-none fixed inset-0 z-[94]" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
          {scene.kind === 'night' && <NightScene round={scene.round} />}
          {scene.kind === 'morning' && <MorningScene scene={scene} view={view} />}
          {scene.kind === 'voting' && <TitleCard icon="vote" title="ساعة الحساب" sub="اختاروا من يُطرد" tone="blood" />}
          {scene.kind === 'verdict' && <VerdictScene victim={scene.victim} />}
          {scene.kind === 'testimony' && <TitleCard icon="public-speaker" title="الشهادات" sub="كل واحد يتكلم بدوره" tone="brass" quick />}
          {scene.kind === 'discussion' && <TitleCard icon="discussion" title="النقاش مفتوح" sub="اتهموا… دافعوا… اكشفوا الكذاب" tone="brass" quick />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TitleCard({ icon, title, sub, tone, quick }: { icon: GameIconName; title: string; sub?: string; tone: 'brass' | 'blood' | 'rain'; quick?: boolean }) {
  const color = tone === 'blood' ? 'text-blood-hi' : tone === 'rain' ? 'text-rain' : 'text-brass-hi';
  return (
    <motion.div className={cn('absolute inset-0 grid place-items-center', quick ? 'bg-black/35' : 'bg-black/60')} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-col items-center text-center">
        <motion.span initial={{ scale: 3, rotate: -25, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }} className={cn('mb-3 block h-24 w-24 sm:h-28 sm:w-28', color)}>
          <GameIcon name={icon} className="h-full w-full drop-shadow-[0_0_25px_currentColor]" />
        </motion.span>
        <motion.p initial={{ y: 30, opacity: 0, letterSpacing: '0.5em' }} animate={{ y: 0, opacity: 1, letterSpacing: '0em' }} transition={{ delay: 0.15, duration: 0.6 }} className={cn('font-display text-6xl sm:text-8xl', tone === 'brass' ? 'brass-text' : color)}>
          {title}
        </motion.p>
        {sub && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 font-kufi text-lg text-fog/80">
            {sub}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

function NightScene({ round }: { round: number }) {
  return (
    <>
      <Blinds closing />
      <Lightning />
      <motion.div className="absolute inset-0 z-[97] grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
        <div className="flex flex-col items-center text-center">
          <motion.span initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7, duration: 1.2, ease: 'easeOut' }} className="mb-8 block h-24 w-24 text-[#cfd9ea]">
            <GameIcon name="moon" className="h-full w-full drop-shadow-[0_0_40px_rgba(200,215,240,0.6)]" />
          </motion.span>
          <motion.span initial={{ x: -200, opacity: 0 }} animate={{ x: 200, opacity: [0, 1, 1, 0] }} transition={{ delay: 1.1, duration: 1.6 }} className="absolute top-[30%] block h-10 w-10 text-black">
            <GameIcon name="raven" className="h-full w-full" />
          </motion.span>
          <p className="font-display text-7xl text-rain sm:text-8xl">حلّ الليل</p>
          <Typewriter text={round === 1 ? 'الليلة الأولى… أطفئوا الأنوار' : `الليلة ${round}… لا تثق بأحد`} className="mt-3 font-kufi text-lg text-fog/80" speed={45} />
        </div>
      </motion.div>
    </>
  );
}

function MorningScene({ scene, view }: { scene: Extract<Scene, { kind: 'morning' }>; view: PlayerView }) {
  const victim = view.players.find(p => p.id === scene.deathId);
  return (
    <>
      <Blinds closing={false} color="#1a1208" />
      <motion.div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(236,190,110,0.35),transparent_60%)]" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.6] }} transition={{ duration: 2 }} />
      <div className="absolute inset-0 grid place-items-center px-4">
        <motion.div
          initial={{ scale: 0.1, rotate: -1080, opacity: 0 }}
          animate={{ scale: 1, rotate: -2, opacity: 1 }}
          transition={{ delay: 0.5, duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative w-[min(560px,92vw)] bg-[#ece0c4] p-5 text-ink shadow-[0_40px_80px_rgba(0,0,0,0.8)] sm:p-7"
        >
          <div className="flex items-center justify-between border-b-4 border-double border-ink/70 pb-2">
            <span className="font-kufi text-xs">العدد {view.round}</span>
            <span className="font-display text-3xl sm:text-4xl">جريدة المدينة</span>
            <span className="h-8 w-8">
              <GameIcon name="newspaper" className="h-full w-full" />
            </span>
          </div>
          <div className="mt-4 flex items-start gap-4">
            {victim ? (
              <motion.div initial={{ filter: 'grayscale(0)' }} animate={{ filter: 'grayscale(1) contrast(1.2)' }} transition={{ delay: 1.6 }} className="relative grid h-20 w-20 shrink-0 place-items-center rounded-sm border-2 border-ink/60 bg-ink/10 text-5xl">
                {victim.avatar}
                <motion.span initial={{ scale: 3, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} transition={{ delay: 1.55, type: 'spring', stiffness: 400, damping: 15 }} className="absolute -bottom-2 -right-3 rounded border-2 border-blood bg-[#ece0c4] px-1.5 font-kufi text-xs font-bold text-blood">
                  مقتول
                </motion.span>
              </motion.div>
            ) : (
              <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ delay: 1.5, duration: 0.6 }} className={cn('grid h-20 w-20 shrink-0 place-items-center', scene.saved ? 'text-jade' : 'text-ink/70')}>
                <GameIcon name={scene.saved ? 'heart-beats' : 'sunrise'} className="h-full w-full" />
              </motion.span>
            )}
            <p className="font-kufi text-lg leading-relaxed sm:text-xl">
              <Typewriter text={scene.headline} speed={30} />
            </p>
          </div>
          {victim && (
            <svg viewBox="0 0 100 100" className="pointer-events-none absolute -left-6 -top-6 h-28 w-28 opacity-80">
              <motion.circle cx="50" cy="50" r="7" fill="#0b0809" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5 }} />
              {[0, 50, 110, 170, 230, 300].map(a => (
                <motion.path key={a} d={`M50 50 L${50 + 40 * Math.cos((a * Math.PI) / 180)} ${50 + 40 * Math.sin((a * Math.PI) / 180)}`} stroke="#0b0809" strokeWidth="1.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.5, duration: 0.15 }} />
              ))}
            </svg>
          )}
        </motion.div>
      </div>
    </>
  );
}

function VerdictScene({ victim }: { victim: PublicPlayer | null }) {
  return (
    <motion.div className="absolute inset-0 grid place-items-center bg-black/75" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="relative flex flex-col items-center text-center">
        {/* Gavel swings down at 2.4s */}
        <motion.span
          className="absolute -top-28 left-1/2 block h-32 w-32 text-brass-hi"
          style={{ originX: 0.85, originY: 0.85 }}
          initial={{ rotate: -70, x: '-10%', opacity: 0 }}
          animate={{ rotate: [-70, -70, -90, 12, 0], opacity: [0, 1, 1, 1, 1] }}
          transition={{ duration: 2.6, times: [0, 0.3, 0.85, 0.93, 1] }}
        >
          <GameIcon name="gavel" className="h-full w-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]" />
        </motion.span>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1] }} transition={{ duration: 2.4, times: [0, 0.2, 1] }} className="mt-16 font-kufi text-xl text-mist">
          الشعب يحسب الأصوات…
        </motion.div>
        {victim ? (
          <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 2.45, type: 'spring', stiffness: 260, damping: 16 }} className="mt-4 flex flex-col items-center">
            <div className="relative" style={{ perspective: 1000 }}>
              {victim.role ? (
                <motion.div initial={{ rotateY: 180 }} animate={{ rotateY: 0 }} transition={{ delay: 2.9, duration: 0.7 }} style={{ transformStyle: 'preserve-3d' }} className="w-40">
                  <div style={{ backfaceVisibility: 'hidden' }}>
                    <RoleCard role={victim.role} compact />
                  </div>
                  <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <CardBack className="h-full w-full" />
                  </div>
                </motion.div>
              ) : (
                <div className="grid h-40 w-40 place-items-center rounded-full border-2 border-brass/60 bg-ash text-7xl">{victim.avatar}</div>
              )}
              <motion.span initial={{ scale: 4, opacity: 0, rotate: -40 }} animate={{ scale: 1, opacity: 1, rotate: -14 }} transition={{ delay: 2.55, type: 'spring', stiffness: 500, damping: 14 }} className="absolute -right-8 top-6 rounded-md border-4 border-blood-hi bg-black/60 px-3 py-1 font-display text-3xl text-blood-hi">
                مطرود
              </motion.span>
            </div>
            <p className="mt-8 flex items-center gap-3 font-display text-5xl leading-relaxed text-fog">
              <span className="text-4xl">{victim.avatar}</span>
              {victim.name}
            </p>
            {victim.role && <p className="font-kufi text-lg text-brass-hi">كان {ROLE_INFO[victim.role].name}</p>}
          </motion.div>
        ) : (
          <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 2.45, type: 'spring' }} className="mt-4 flex flex-col items-center">
            <span className="block h-28 w-28 text-brass">
              <GameIcon name="scales" className="h-full w-full" />
            </span>
            <p className="font-display text-5xl text-fog">لم يُطرد أحد</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ── Role reveal: deck fans out, your card flies in and flips ───────────────

export function DeckReveal({ view, me, left, cardBack }: { view: PlayerView; me: PublicPlayer; left: number; cardBack: string }) {
  const n = Math.min(view.players.length, 10);
  useEffect(() => {
    sfx('shuffle', 0.8);
    const t1 = setTimeout(() => sfx('card-fan'), 900);
    const t2 = setTimeout(() => sfx('card-flip'), 2300);
    const t3 = setTimeout(() => sfx('case-open', 0.7), 2500);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);
  const mates = view.players.filter(p => p.id !== me.id && (p.role === 'mafia' || p.role === 'godfather'));
  const info = ROLE_INFO[me.role!];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] grid place-items-center overflow-hidden bg-black/90 p-6 backdrop-blur">
      {/* Fanned deck */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
        {Array.from({ length: n }).map((_, i) => {
          const angle = (i - (n - 1) / 2) * 11;
          return (
            <motion.div
              key={i}
              className="absolute -left-14 -top-20 w-28"
              initial={{ rotate: 0, y: 0, opacity: 0 }}
              animate={{ rotate: [0, angle, angle], y: [0, -40, 300], opacity: [1, 1, 0], x: [0, angle * 9, angle * 20] }}
              transition={{ duration: 2.2, times: [0, 0.45, 1], delay: 0.2 + i * 0.03 }}
            >
              <CardBack design={cardBack} className="w-full" />
            </motion.div>
          );
        })}
      </div>

      <div className="relative flex flex-col items-center gap-4 text-center">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="font-kufi tracking-[0.3em] text-mist">
          بطاقتك
        </motion.p>
        <div className="w-56 sm:w-72" style={{ perspective: 1400 }}>
          <motion.div
            initial={{ y: -500, rotateY: 180, rotateZ: -25, scale: 0.6 }}
            animate={{ y: 0, rotateY: [180, 180, 0], rotateZ: 0, scale: 1 }}
            transition={{ y: { delay: 1.5, duration: 0.6, ease: 'easeOut' }, rotateZ: { delay: 1.5, duration: 0.6 }, scale: { delay: 1.5, duration: 0.6 }, rotateY: { delay: 1.5, duration: 1.4, times: [0, 0.55, 1] } }}
            className="relative"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div style={{ backfaceVisibility: 'hidden' }}>
              <RoleCard role={me.role!} />
            </div>
            <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <CardBack design={cardBack} className="h-full w-full" />
            </div>
            <motion.div className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl blur-2xl" style={{ background: info.accent }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.7, 0.35] }} transition={{ delay: 2.4, duration: 1.2 }} />
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.6 }} className="max-w-md">
          <p className="text-fog/90">{info.description}</p>
          {mates.length > 0 && (
            <p className="mt-2 font-kufi text-blood-hi">
              🤝 عائلتك: {mates.map(m => `${m.name} (${ROLE_INFO[m.role!].name})`).join('، ')}
            </p>
          )}
          <p className="mt-3 font-kufi text-sm text-mist">تبدأ الليلة خلال {left} ثوانٍ</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Vote chips ─────────────────────────────────────────────────────────────

interface Flight {
  id: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
}

/** Animates a chip from voter to target whenever a new vote appears. */
export function ChipLayer({ view }: { view: PlayerView }) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const prev = useRef<Record<string, string>>({});
  const seq = useRef(0);

  useEffect(() => {
    if (view.phase !== 'voting') {
      prev.current = {};
      return;
    }
    const fresh: Flight[] = [];
    for (const [voter, target] of Object.entries(view.votes)) {
      if (prev.current[voter] === target || target === SKIP_VOTE) continue;
      const from = seatCenter(voter);
      const to = seatCenter(target);
      if (from && to) fresh.push({ id: ++seq.current, from, to, color: voter === view.meId ? '#ecd49a' : '#d8473f' });
    }
    prev.current = { ...view.votes };
    if (!fresh.length) return;
    const show = setTimeout(() => {
      setFlights(f => [...f, ...fresh]);
      fresh.forEach((_, i) => sfx('chip', { delay: 0.45 + i * 0.05, detune: true, volume: 0.8 }));
    }, 0);
    const ids = fresh.map(f => f.id);
    const hide = setTimeout(() => setFlights(f => f.filter(x => !ids.includes(x.id))), 900);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [view.votes, view.phase, view.meId]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]">
      {flights.map(f => {
        const mid = { x: (f.from.x + f.to.x) / 2, y: Math.min(f.from.y, f.to.y) - 120 };
        return (
          <motion.span
            key={f.id}
            className="absolute -ml-3 -mt-3 h-6 w-6 rounded-full border-[3px] border-dashed border-white/80 shadow-[0_4px_10px_rgba(0,0,0,0.7)]"
            style={{ background: f.color }}
            initial={{ x: f.from.x, y: f.from.y, scale: 0.4, rotate: 0 }}
            animate={{ x: [f.from.x, mid.x, f.to.x], y: [f.from.y, mid.y, f.to.y], scale: [0.4, 1.3, 1], rotate: 540 }}
            transition={{ duration: 0.55, ease: 'easeIn' }}
          />
        );
      })}
    </div>
  );
}

// ── Night flashlight + target reticles ─────────────────────────────────────

/**
 * Darkens its parent (the table area only — the chat and action bar stay
 * readable) except a soft circle of light around the pointer.
 */
export function Flashlight({ active, tint = 'rgba(3,5,12,0.86)' }: { active: boolean; tint?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const move = (e: PointerEvent) => {
      const el = ref.current;
      const box = el?.getBoundingClientRect();
      if (!el || !box) return;
      el.style.setProperty('--fx', `${e.clientX - box.left}px`);
      el.style.setProperty('--fy', `${e.clientY - box.top}px`);
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [active]);
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="pointer-events-none absolute inset-x-0 -inset-y-4 z-[5] rounded-3xl"
          style={{
            background: `radial-gradient(circle 200px at var(--fx, 50%) var(--fy, 50%), rgba(255,240,200,0.07) 0%, rgba(0,0,0,0) 55%, ${tint} 100%)`,
          }}
        />
      )}
    </AnimatePresence>
  );
}

const RETICLE: Record<string, { icon: GameIconName; color: string; label: string }> = {
  mafia: { icon: 'crosshair', color: '#d8473f', label: 'تصفية' },
  godfather: { icon: 'crosshair', color: '#d8473f', label: 'تصفية' },
  vigilante: { icon: 'targeted', color: '#b79ce0', label: 'طلقة' },
  doctor: { icon: 'heart-beats', color: '#5fc79a', label: 'حماية' },
  bodyguard: { icon: 'shield', color: '#e0be6a', label: 'حراسة' },
  detective: { icon: 'magnifying-glass', color: '#7fb0e0', label: 'تحقيق' },
  vote: { icon: 'pointing', color: '#ecd49a', label: 'صوّت' },
};

/** A role-themed reticle that follows the pointer while picking a target. */
export function TargetCursor({ mode }: { mode: keyof typeof RETICLE | null }) {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 900, damping: 50 });
  const sy = useSpring(y, { stiffness: 900, damping: 50 });
  const [hot, setHot] = useState(false);
  useEffect(() => {
    if (!mode) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x.set(e.clientX);
      y.set(e.clientY);
      setHot(!!(e.target as HTMLElement | null)?.closest?.('[data-target="1"]'));
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [mode, x, y]);
  if (!mode) return null;
  const r = RETICLE[mode];
  return (
    <motion.div className="pointer-events-none fixed left-0 top-0 z-[85] hidden sm:block" style={{ x: sx, y: sy }}>
      <motion.span animate={{ scale: hot ? 1.25 : 0.85, rotate: hot ? 90 : 0, opacity: hot ? 1 : 0.55 }} className="absolute -left-7 -top-7 block h-14 w-14" style={{ color: r.color }}>
        <GameIcon name={r.icon} className="h-full w-full drop-shadow-[0_0_8px_currentColor]" />
      </motion.span>
      {hot && <span className="absolute left-6 top-5 whitespace-nowrap rounded bg-black/80 px-2 py-0.5 font-kufi text-xs" style={{ color: r.color }}>{r.label}</span>}
    </motion.div>
  );
}

// ── Muzzle flash at a seat ─────────────────────────────────────────────────

export function MuzzleFlash({ seatId, onDone }: { seatId: string; onDone: () => void }) {
  const [pos] = useState(() => seatCenter(seatId));
  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);
  if (!pos) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[93]">
      <motion.div className="absolute inset-0 bg-[#fff3d6]" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }} />
      <motion.span
        className="absolute -ml-24 -mt-24 block h-48 w-48 rounded-full"
        style={{ left: pos.x, top: pos.y, background: 'radial-gradient(circle, rgba(255,230,160,1) 0%, rgba(255,120,40,0.7) 30%, rgba(160,20,10,0) 70%)' }}
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
}

// ── Speech bubble over a seat ──────────────────────────────────────────────

export function SpeechBubble({ text, tone = 'public' }: { text: string; tone?: 'public' | 'mafia' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.6 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={cn(
        'pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[200px] -translate-x-1/2 rounded-xl border px-3 py-1.5 text-right text-xs leading-snug shadow-xl',
        tone === 'mafia' ? 'border-blood/70 bg-[#2a0b0b]/95 text-fog' : 'border-[#d9c9a3] bg-[#ece0c4] text-ink'
      )}
    >
      <Typewriter text={text.length > 90 ? text.slice(0, 88) + '…' : text} speed={14} sound={false} />
      <span className={cn('absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r', tone === 'mafia' ? 'border-blood/70 bg-[#2a0b0b]' : 'border-[#d9c9a3] bg-[#ece0c4]')} />
    </motion.div>
  );
}

/** Heartbeat speeds up in the last seconds of the vote. */
export function useTension(view: PlayerView, left: number) {
  useEffect(() => {
    if (view.phase === 'voting') audio.setTension(left);
  }, [view.phase, left]);
}

export { ROLE_ICON };
