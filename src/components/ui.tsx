'use client';

import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { sfx } from '@/client/audio';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Variant = 'brass' | 'ghost' | 'blood' | 'dark';

const VARIANTS: Record<Variant, string> = {
  brass:
    'text-ink bg-[linear-gradient(180deg,#f2dca2,#c9a45c_55%,#9b7a3c)] shadow-[0_8px_24px_-6px_rgba(201,164,92,0.55),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110',
  ghost: 'text-brass border border-brass/50 bg-black/30 hover:bg-brass/10 hover:border-brass',
  blood: 'text-fog bg-[linear-gradient(180deg,#c43a33,#8d1916)] shadow-[0_8px_24px_-6px_rgba(163,32,28,0.7)] hover:brightness-110',
  dark: 'text-fog bg-smoke/90 border border-white/10 hover:border-brass/60',
};

export function Button({
  variant = 'brass',
  className,
  children,
  onClick,
  disabled,
  type = 'button',
  ...rest
}: HTMLMotionProps<'button'> & { variant?: Variant }) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={e => {
        if (!disabled) sfx('click', 0.7);
        onClick?.(e);
      }}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-kufi text-base font-semibold tracking-wide transition-[filter,background,border-color,opacity] duration-200 select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass',
        'disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:brightness-100',
        VARIANTS[variant],
        className
      )}
      {...rest}
      onPointerEnter={e => {
        if (!disabled && e.pointerType === 'mouse') sfx('hover', { volume: 0.2, detune: true });
        rest.onPointerEnter?.(e);
      }}
    >
      {children}
    </motion.button>
  );
}

export function Panel({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('deco-panel p-5', className)} {...rest}>
      {children}
    </div>
  );
}

export function Ornament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 16" className={cn('h-4 w-60 text-brass', className)} aria-hidden>
      <path d="M0 8h96M144 8h96" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <path d="M100 8l10-6 10 6-10 6z" fill="none" stroke="currentColor" />
      <path d="M120 8l10-6 10 6-10 6z" fill="currentColor" opacity="0.8" />
      <circle cx="96" cy="8" r="2" fill="currentColor" />
      <circle cx="144" cy="8" r="2" fill="currentColor" />
    </svg>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 py-2 text-right">
      <span>
        <span className="block font-kufi text-fog">{label}</span>
        {hint && <span className="block text-xs text-mist">{hint}</span>}
      </span>
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full border transition-colors', checked ? 'border-brass bg-brass/80' : 'border-white/15 bg-white/5')}>
        <motion.span layout className={cn('absolute top-0.5 h-4.5 w-4.5 rounded-full bg-fog shadow', checked ? 'left-0.5' : 'right-0.5')} />
      </span>
    </button>
  );
}

export function Slider({ label, value, min, max, step = 1, suffix = '', onChange, disabled }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <label className={cn('block py-1.5', disabled && 'opacity-50')}>
      <span className="mb-1.5 flex justify-between text-sm">
        <span className="text-mist">{label}</span>
        <span className="font-kufi text-brass" dir="ltr">
          {value}
          {suffix}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e => onChange(Number(e.target.value))} className="w-full accent-[#c9a45c]" />
    </label>
  );
}

export function Modal({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: 24, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 24, scale: 0.97 }}
            className={cn('deco-panel relative max-h-[90dvh] w-full max-w-lg overflow-y-auto p-6 sm:p-8', className)}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              {title && <h2 className="font-display text-3xl brass-text">{title}</h2>}
              <button onClick={onClose} aria-label="إغلاق" className="rounded-full p-1 text-mist hover:text-fog">
                <X className="h-6 w-6" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
