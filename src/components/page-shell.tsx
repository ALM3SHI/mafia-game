'use client';

import Link from 'next/link';
import { ArrowRight, Gem } from 'lucide-react';
import { useProfile } from '@/client/profile';
import { RainCanvas } from './atmosphere';
import { SettingsButton } from './settings';
import { Ornament } from './ui';

/** Shared chrome for the secondary pages (profile, store, rules). */
export function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const gems = useProfile(s => s.gems);
  const hydrated = useProfile(s => s.hydrated);
  return (
    <div className="relative min-h-dvh">
      <div className="fixed inset-0 -z-0 bg-[radial-gradient(ellipse_at_top,#2a1d18_0%,#0b0809_60%)]" />
      <RainCanvas intensity={0.5} />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2 rounded-full border border-brass/40 bg-black/50 px-4 py-2 font-kufi text-brass hover:border-brass">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-full border border-brass/40 bg-black/50 px-4 py-2 font-kufi text-brass">
              <Gem className="h-4 w-4" /> <span dir="ltr">{hydrated ? gems.toLocaleString('en') : '—'}</span>
            </span>
            <SettingsButton />
          </div>
        </header>
        <div className="mb-8 text-center">
          <h1 className="font-display text-6xl brass-text sm:text-7xl">{title}</h1>
          {subtitle && <p className="mt-2 text-mist">{subtitle}</p>}
          <Ornament className="mx-auto mt-3" />
        </div>
        {children}
      </div>
    </div>
  );
}
