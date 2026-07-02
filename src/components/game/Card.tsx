'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSound } from '@/hooks/useSound';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  isFlipped?: boolean;
  backImage?: string;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function Card({ 
  frontContent, 
  backContent, 
  isFlipped: controlledIsFlipped, 
  backImage = '/cards/CARDcover.jpg',
  className,
  onClick,
  style
}: CardProps) {
  const [internalIsFlipped, setInternalIsFlipped] = useState(false);
  const isFlipped = controlledIsFlipped !== undefined ? controlledIsFlipped : internalIsFlipped;
  const { playSound } = useSound();

  // 3D Tilt Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["20deg", "-20deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-20deg", "20deg"]);
  
  // Foil/Glare Effect
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareOpacity = useTransform(mouseXSpring, (v) => Math.abs(v) * 0.5);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleClick = () => {
    playSound('card-flip');
    if (onClick) {
      onClick();
    } else {
      setInternalIsFlipped(!internalIsFlipped);
    }
  };

  return (
    <motion.div 
      className={cn("perspective-2000 w-48 h-72 cursor-pointer group", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        ...style,
        rotateX: isFlipped ? 0 : rotateX,
        rotateY: isFlipped ? 0 : rotateY,
        transformStyle: 'preserve-3d',
      }}
    >
      <motion.div
        className="relative w-full h-full transform-style-3d"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 150, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* PHYSICAL THICKNESS (Side of the card) */}
        <div className="absolute inset-0 bg-[#2d1b10] rounded-2xl translate-z-[-2px] border-2 border-black/50" />

        {/* BACK OF CARD (Physical Texture) */}
        <div 
          className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
          style={{ 
            backfaceVisibility: 'hidden',
            backgroundImage: `url(${backImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '8px solid #cfb06f22',
          }}
        >
          {/* Card Material Texture */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/linen.png')] opacity-30 mix-blend-overlay" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-20" />
          
          {/* Ornate Frame */}
          <div className="absolute inset-4 border-2 border-[#cfb06f33] rounded-lg">
            <div className="absolute inset-1 border border-[#cfb06f11] rounded-sm" />
          </div>

          <div className="relative z-10 h-full w-full flex items-center justify-center">
            {backContent}
          </div>
        </div>

        {/* FRONT OF CARD (Physical Texture + Art) */}
        <div 
          className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: '#0a0a0a',
            border: '6px solid #cfb06f44',
          }}
        >
          {/* Foil Glare Layer */}
          <motion.div 
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.15) 0%, transparent 60%)`,
              opacity: glareOpacity,
            }}
          />

          {/* Linen Texture */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/linen.png')] opacity-40 z-10 mix-blend-overlay" />
          
          <div className="relative z-10 w-full h-full">
            {frontContent}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
