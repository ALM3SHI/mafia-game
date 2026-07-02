'use client';

import { Phase } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Vote, Mic2, MessageSquare, Skull } from 'lucide-react';

interface PhaseBadgeProps {
  phase: Phase;
}

export default function PhaseBadge({ phase }: PhaseBadgeProps) {
  const configs: Record<string, any> = {
    day: { label: 'نقاش عام', icon: MessageSquare, color: 'text-[#cfb06f]', border: 'border-[#cfb06f]', bg: 'bg-[#cfb06f]/10' },
    night: { label: 'الليل', icon: Moon, color: 'text-[#b64f43]', border: 'border-[#b64f43]', bg: 'bg-[#b64f43]/10' },
    voting: { label: 'التصويت للطرد', icon: Vote, color: 'text-red-500', border: 'border-red-500', bg: 'bg-red-500/10' },
    reveal: { label: 'كشف الأدوار', icon: Skull, color: 'text-white', border: 'border-white', bg: 'bg-white/10' },
    lobby: { label: 'الانتظار', icon: Vote, color: 'text-[#7f95a1]', border: 'border-[#7f95a1]', bg: 'bg-[#7f95a1]/10' },
    testimony: { label: 'وقت الشهادة', icon: Mic2, color: 'text-blue-400', border: 'border-blue-400', bg: 'bg-blue-400/10' },
    reaction: { label: 'رد الفعل', icon: MessageSquare, color: 'text-orange-400', border: 'border-orange-400', bg: 'bg-orange-400/10' },
    'game-over': { label: 'نهاية اللعبة', icon: Vote, color: 'text-white', border: 'border-white', bg: 'bg-black' },
  };

  const config = configs[phase];
  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className={`flex items-center gap-3 px-8 py-3 border-2 ${config.border} ${config.bg} rounded-2xl backdrop-blur-xl shadow-2xl`}
      >
        <Icon className={`w-6 h-6 ${config.color}`} />
        <span className={`font-changa text-2xl font-black ${config.color} tracking-widest`}>
          {config.label}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
