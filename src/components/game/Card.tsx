'use client';

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { playSound } from '@/hooks/useSound';

interface CardProps {
  frontContent: React.ReactNode;
  backContent?: React.ReactNode;
  isFlipped?: boolean;
  backImage?: string;
  className?: string;
  onClick?: () => void;
  /** Disable the hover tilt (e.g. for cards that are not interactive). */
  static?: boolean;
}

/**
 * A two-sided card. "Back" is the face-down cover; "front" is the role art.
 * `isFlipped` shows the front.
 */
export default function Card({
  frontContent,
  backContent,
  isFlipped: controlled,
  backImage = '/cards/CARDcover.jpg',
  className,
  onClick,
  static: isStatic = false,
}: CardProps) {
  const [internal, setInternal] = useState(false);
  const isFlipped = controlled ?? internal;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x);
  const sy = useSpring(y);
  const rotateX = useTransform(sy, [-0.5, 0.5], ['14deg', '-14deg']);
  const rotateY = useTransform(sx, [-0.5, 0.5], ['-14deg', '14deg']);
  const glareX = useTransform(sx, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(sy, [-0.5, 0.5], ['0%', '100%']);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.18) 0%, transparent 60%)`;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isStatic) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };
  const onTap = () => {
    playSound('card-flip', 0.3);
    if (onClick) onClick();
    else setInternal(v => !v);
  };

  return (
    <motion.div
      className={cn('w-48 h-72 cursor-pointer', className)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onTap}
      style={{ rotateX: isStatic ? 0 : rotateX, rotateY: isStatic ? 0 : rotateY, transformStyle: 'preserve-3d', perspective: 2000 }}
    >
      <motion.div
        className="relative w-full h-full"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* BACK (face down) */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] card-texture"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            backgroundImage: `url(${backImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '6px solid #cfb06f22',
          }}
        >
          <div className="absolute inset-3 border-2 border-[#cfb06f33] rounded-lg pointer-events-none" />
          <div className="relative z-10 h-full w-full flex items-center justify-center">{backContent}</div>
        </div>

        {/* FRONT (role art) */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] card-texture"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: '#0a0a0a',
            border: '6px solid #cfb06f44',
          }}
        >
          <motion.div className="absolute inset-0 z-20 pointer-events-none" style={{ background: glare }} />
          <div className="relative z-10 w-full h-full">{frontContent}</div>
        </div>
      </motion.div>
    </motion.div>
  );
}
