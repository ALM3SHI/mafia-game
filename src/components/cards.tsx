'use client';

import { Crosshair, Drama, Landmark, Search, Shield, Skull, Syringe, User, VenetianMask, type LucideIcon } from 'lucide-react';
import { ROLE_INFO } from '@/game/roles';
import type { Role } from '@/game/types';
import { cn } from './ui';

export const ROLE_ICON: Record<Role, LucideIcon> = {
  mafia: Skull,
  godfather: VenetianMask,
  citizen: User,
  doctor: Syringe,
  detective: Search,
  bodyguard: Shield,
  vigilante: Crosshair,
  mayor: Landmark,
  jester: Drama,
};

export function RoleMedallion({ role, size = 56, className }: { role: Role; size?: number; className?: string }) {
  const Icon = ROLE_ICON[role];
  const info = ROLE_INFO[role];
  return (
    <span
      className={cn('relative inline-flex items-center justify-center rounded-full', className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, ${info.accent}, #120d0c 75%)`,
        boxShadow: `0 0 0 2px #c9a45c, 0 0 0 4px #120d0c, 0 0 0 5px #7d6331, 0 6px 18px rgba(0,0,0,.7)`,
      }}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} className="text-brass-hi drop-shadow" strokeWidth={1.6} />
    </span>
  );
}

/** Face-up role card. */
export function RoleCard({ role, className, compact = false }: { role: Role; className?: string; compact?: boolean }) {
  const info = ROLE_INFO[role];
  return (
    <div className={cn('relative aspect-[5/7] overflow-hidden rounded-xl border border-brass/60 bg-ink shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)]', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/art/${info.art}.webp`} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 35%, ${info.accent}55 60%, #0b0809 88%)` }} />
      <div className="absolute inset-2 rounded-lg border border-brass/30" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 p-3 text-center">
        <RoleMedallion role={role} size={compact ? 34 : 52} className="-mt-6 mb-1" />
        <h3 className={cn('font-display leading-none brass-text', compact ? 'text-2xl' : 'text-4xl')}>{info.name}</h3>
        {!compact && <p className="font-kufi text-xs text-fog/80">{info.tagline}</p>}
      </div>
    </div>
  );
}

const BACKS: Record<string, { bg: string; ink: string; motif: 'deco' | 'rose' | 'moon' | 'chip' }> = {
  'back-classic': { bg: '#120d0c', ink: '#c9a45c', motif: 'deco' },
  'back-crimson': { bg: '#3a0b0b', ink: '#e0a35b', motif: 'rose' },
  'back-midnight': { bg: '#0b1424', ink: '#9fb7d4', motif: 'moon' },
  'back-emerald': { bg: '#0c2a1f', ink: '#d0a35a', motif: 'chip' },
};

/** Face-down card back; design comes from the equipped cosmetic. */
export function CardBack({ design = 'back-classic', className }: { design?: string; className?: string }) {
  const d = BACKS[design] ?? BACKS['back-classic'];
  return (
    <svg viewBox="0 0 100 140" className={cn('rounded-xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.9)]', className)} aria-hidden>
      <defs>
        <pattern id={`p-${design}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 5h10" stroke={d.ink} strokeOpacity="0.12" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100" height="140" rx="8" fill={d.bg} />
      <rect width="100" height="140" rx="8" fill={`url(#p-${design})`} />
      <rect x="5" y="5" width="90" height="130" rx="5" fill="none" stroke={d.ink} strokeOpacity="0.8" />
      <rect x="8" y="8" width="84" height="124" rx="3" fill="none" stroke={d.ink} strokeOpacity="0.35" />
      {/* corner fans */}
      {[
        [8, 8, 0],
        [92, 8, 90],
        [92, 132, 180],
        [8, 132, 270],
      ].map(([x, y, r]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${r})`} stroke={d.ink} fill="none" strokeOpacity="0.7">
          <path d="M0 0 L14 0 A14 14 0 0 1 0 14 Z" />
          <path d="M0 0 L9 0 A9 9 0 0 1 0 9" />
        </g>
      ))}
      <g transform="translate(50 70)" stroke={d.ink} fill="none">
        {d.motif === 'deco' && (
          <>
            <path d="M0 -34 L22 0 L0 34 L-22 0 Z" />
            <path d="M0 -24 L14 0 L0 24 L-14 0 Z" strokeOpacity="0.6" />
            <path d="M-30 0 H30 M0 -44 V44" strokeOpacity="0.4" />
            <circle r="5" fill={d.ink} />
          </>
        )}
        {d.motif === 'rose' && (
          <>
            <circle r="16" />
            <path d="M0 -16 C10 -8 10 8 0 16 C-10 8 -10 -8 0 -16" />
            <path d="M-16 0 C-8 -10 8 -10 16 0 C8 10 -8 10 -16 0" strokeOpacity="0.7" />
            <path d="M0 16 V40 M0 28 l8 -6 M0 32 l-8 -6" />
          </>
        )}
        {d.motif === 'moon' && (
          <>
            <path d="M8 -22 A22 22 0 1 0 8 22 A16 16 0 1 1 8 -22" fill={d.ink} fillOpacity="0.25" />
            {[
              [-26, -30],
              [24, -20],
              [28, 26],
              [-20, 34],
            ].map(([x, y]) => (
              <path key={`${x}${y}`} d={`M${x} ${y - 3} L${x + 1} ${y} L${x} ${y + 3} L${x - 1} ${y} Z`} fill={d.ink} />
            ))}
          </>
        )}
        {d.motif === 'chip' && (
          <>
            <circle r="22" />
            <circle r="15" strokeDasharray="4 3" />
            <circle r="8" fill={d.ink} fillOpacity="0.3" />
          </>
        )}
      </g>
    </svg>
  );
}
