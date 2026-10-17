'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useProfile } from '@/client/profile';
import { useGame } from '@/client/game-store';
import { ambience } from '@/client/audio';
import { Atmosphere } from './atmosphere';
import { cn } from './ui';

export function Providers({ children }: { children: React.ReactNode }) {
  const prefs = useProfile(s => s.prefs);

  useEffect(() => {
    useProfile.persist.rehydrate();
    const unlock = () => {
      ambience.unlock();
      ambience.apply();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    ambience.apply();
  }, [prefs]);

  return (
    <>
      {children}
      <Atmosphere />
      <Toaster />
    </>
  );
}

function Toaster() {
  const toasts = useGame(s => s.toasts);
  const dismiss = useGame(s => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[300] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.button
            key={t.id}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            onClick={() => dismiss(t.id)}
            className={cn(
              'pointer-events-auto max-w-md rounded-lg border px-5 py-2.5 font-kufi text-sm shadow-xl backdrop-blur',
              t.tone === 'error' ? 'border-blood-hi/60 bg-blood/30 text-fog' : 'border-brass/50 bg-char/90 text-brass-hi'
            )}
          >
            {t.text}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
