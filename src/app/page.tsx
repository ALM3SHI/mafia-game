'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Gem, Globe, LogIn, ShoppingBag, Swords, Trophy } from 'lucide-react';
import { useProfile } from '@/client/profile';
import { useGame } from '@/client/game-store';
import { ambience, sfx } from '@/client/audio';
import { ParallaxImage, useParallax } from '@/components/play/fx';
import { GameIcon } from '@/components/GameIcon';
import { loadSession } from '@/client/transport';
import { RainCanvas } from '@/components/atmosphere';
import { SettingsButton } from '@/components/settings';
import { Button, Modal, Ornament, Panel, cn } from '@/components/ui';
import { IdentityEditor } from '@/components/settings';

export default function Home() {
  const router = useRouter();
  const p = useProfile();
  const { playLocal, createOnline, joinOnline } = useGame.getState();
  const [code, setCode] = useState('');
  const [editing, setEditing] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const { px, py, bind } = useParallax();
  const [bolt, setBolt] = useState(0);

  // Distant lightning every so often.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBolt(b => b + 1);
        sfx('thunder', { volume: 0.25, delay: 0.4 });
        loop();
      }, 9000 + Math.random() * 12000);
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    ambience.setMood('menu');
    const t = setTimeout(() => setHasSession(!!loadSession()), 0);
    return () => clearTimeout(t);
  }, []);

  const go = (fn: () => void) => {
    ambience.unlock();
    fn();
    router.push('/play');
  };

  return (
    <div className="relative min-h-dvh overflow-hidden" {...bind}>
      {/* Backdrop */}
      <div className="fixed inset-0 overflow-hidden">
        <ParallaxImage src="/art/council.webp" px={px} py={py} depth={22} className="h-full w-full object-cover opacity-40 [filter:sepia(0.35)_saturate(0.8)]" />
        <AnimatePresence>
          {bolt > 0 && (
            <motion.div key={bolt} className="absolute inset-0 bg-[#cfd9ff]" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.35, 0, 0.2, 0] }} transition={{ duration: 0.9 }} />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,transparent_0%,rgba(11,8,9,0.6)_45%,#0b0809_85%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink via-ink/80 to-transparent" />
      </div>
      <RainCanvas />
      {/* Floating noir props */}
      <div className="pointer-events-none fixed inset-0 z-[6] hidden md:block" aria-hidden>
        {(
          [
            ['revolver', '8%', '30%', -18],
            ['fedora', '86%', '24%', 12],
            ['rose', '12%', '72%', 20],
            ['cigar', '84%', '70%', -10],
          ] as const
        ).map(([name, left, top, rot], i) => (
          <motion.span key={name} className="absolute block h-20 w-20 text-brass/25" style={{ left, top }} animate={{ y: [0, -12, 0], rotate: [rot, rot + 6, rot] }} transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}>
            <GameIcon name={name} className="h-full w-full" />
          </motion.span>
        ))}
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between gap-3 p-4 sm:p-6">
        <button onClick={() => setEditing(true)} className="flex items-center gap-3 rounded-full border border-brass/30 bg-black/50 py-1.5 pl-5 pr-1.5 backdrop-blur transition hover:border-brass/70">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brass/40 to-blood/40 text-2xl">{p.avatar}</span>
          <span className="text-right">
            <span className="block font-kufi text-sm text-fog">{p.name}</span>
            <span className="block text-xs text-mist">
              {p.wins} فوز · {p.games} مباراة
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <Link href="/store" className="flex items-center gap-2 rounded-full border border-brass/40 bg-black/50 px-4 py-2 font-kufi text-brass backdrop-blur hover:border-brass">
            <Gem className="h-4 w-4" />
            <span dir="ltr">{p.hydrated ? p.gems.toLocaleString('en') : '—'}</span>
          </Link>
          <SettingsButton />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 pb-16 pt-4 sm:pt-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="text-center">
          <p className="mb-2 font-kufi text-sm tracking-[0.5em] text-brass/80">مدينة لا تنام</p>
          <h1 className="px-6 pb-6 font-display text-[clamp(5rem,18vw,11rem)] leading-[1.3] brass-text drop-shadow-[0_8px_30px_rgba(201,164,92,0.25)] animate-flicker">المافيا</h1>
          <Ornament className="mx-auto mt-4" />
          <p className="mx-auto mt-4 max-w-md text-mist">بين المطر والدخان، واحد منكم يكذب. اكشفه قبل أن يطفئ نورك.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="mt-10 w-full max-w-xl">
          <Panel className="p-6 sm:p-8">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
              <Button className="py-4 text-lg" onClick={() => go(playLocal)}>
                <Swords className="h-5 w-5" /> العب الآن ضد البوتات
              </Button>
              <Button variant="ghost" className="py-3.5" onClick={() => go(createOnline)}>
                <Globe className="h-5 w-5" /> أنشئ غرفة أونلاين
              </Button>
              <form
                className="flex gap-2"
                onSubmit={e => {
                  e.preventDefault();
                  if (code.trim().length >= 4) go(() => joinOnline(code));
                }}
              >
                <input
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
                  placeholder="رمز الغرفة"
                  aria-label="رمز الغرفة"
                  dir="ltr"
                  className="w-0 min-w-0 flex-1 rounded-lg border border-brass/40 bg-black/50 px-4 py-3 text-center font-kufi text-xl tracking-[0.4em] text-brass-hi outline-none placeholder:tracking-normal placeholder:text-mist/60 focus:border-brass"
                />
                <Button variant="dark" type="submit" disabled={code.length < 4} className="px-5">
                  <LogIn className="h-5 w-5" /> انضم
                </Button>
              </form>
              {hasSession && (
                <button onClick={() => go(() => useGame.getState().resumeOnline())} className="text-sm text-rain underline-offset-4 hover:underline">
                  ↩︎ ارجع لغرفتك الأخيرة
                </button>
              )}
            </div>
          </Panel>

          <nav className="mt-5 grid grid-cols-3 gap-3">
            {[
              { href: '/profile', label: 'ملفي', icon: Trophy },
              { href: '/store', label: 'السوق', icon: ShoppingBag },
              { href: '/rules', label: 'القوانين', icon: BookOpen },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn('group flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 py-4 font-kufi text-mist backdrop-blur transition hover:border-brass/60 hover:text-brass-hi')}
              >
                <Icon className="h-6 w-6 transition group-hover:scale-110" />
                {label}
              </Link>
            ))}
          </nav>
          <p className="mt-6 text-center text-xs text-mist/60">
            <Link href="/credits" className="hover:text-brass">
              شكر وتقدير للأصوات والأيقونات
            </Link>
          </p>
        </motion.div>
      </main>

      <Modal open={editing} onClose={() => setEditing(false)} title="هويتك">
        <IdentityEditor onDone={() => setEditing(false)} />
      </Modal>
    </div>
  );
}
