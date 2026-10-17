'use client';

import { useEffect, useRef } from 'react';
import { useProfile } from '@/client/profile';

/** Diagonal rain streaks on a canvas. Cheap: ~200 lines, one rAF loop. */
export function RainCanvas({ intensity = 1, className }: { intensity?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const enabled = useProfile(s => s.prefs.rain && s.hydrated);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !enabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const count = Math.round(Math.min(260, (w * h) / 6000) * intensity);
    const drops = Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h, len: 8 + Math.random() * 18, v: 9 + Math.random() * 9, a: 0.08 + Math.random() * 0.22 }));
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (const d of drops) {
        ctx.strokeStyle = `rgba(190,210,230,${d.a})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * 0.25, d.y + d.len);
        ctx.stroke();
        d.y += d.v;
        d.x -= d.v * 0.25;
        if (d.y > h) {
          d.y = -20;
          d.x = Math.random() * (w + 100);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [enabled, intensity]);

  return <canvas ref={ref} aria-hidden className={className ?? 'pointer-events-none fixed inset-0 z-[5] h-full w-full'} />;
}

/** Film grain + vignette + optional scanlines. */
export function Atmosphere() {
  const crt = useProfile(s => s.prefs.crt);
  return (
    <>
      <div className="vignette" aria-hidden />
      <div className="film-grain" aria-hidden />
      {crt && <div className="scanlines" aria-hidden />}
    </>
  );
}
