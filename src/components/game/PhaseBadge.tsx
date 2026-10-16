'use client';

import type { Phase } from '@/lib/game-types';
import { AnimatePresence, motion } from 'framer-motion';
import { Flag, Hourglass, MessageSquare, Mic2, Moon, Skull, Sun, Vote, type LucideIcon } from 'lucide-react';

const CONFIG: Record<Phase, { label: string; icon: LucideIcon; tone: string }> = {
  lobby: { label: 'الانتظار', icon: Hourglass, tone: 'text-[#7f95a1] border-[#7f95a1] bg-[#7f95a1]/10' },
  reveal: { label: 'كشف الأدوار', icon: Skull, tone: 'text-white border-white bg-white/10' },
  night: { label: 'الليل', icon: Moon, tone: 'text-[#b64f43] border-[#b64f43] bg-[#b64f43]/10' },
  reaction: { label: 'الصباح', icon: Sun, tone: 'text-orange-400 border-orange-400 bg-orange-400/10' },
  testimony: { label: 'وقت الشهادة', icon: Mic2, tone: 'text-blue-400 border-blue-400 bg-blue-400/10' },
  day: { label: 'نقاش عام', icon: MessageSquare, tone: 'text-[#cfb06f] border-[#cfb06f] bg-[#cfb06f]/10' },
  voting: { label: 'التصويت للطرد', icon: Vote, tone: 'text-red-500 border-red-500 bg-red-500/10' },
  'game-over': { label: 'نهاية اللعبة', icon: Flag, tone: 'text-white border-white bg-black' },
};

export default function PhaseBadge({ phase }: { phase: Phase }) {
  const { label, icon: Icon, tone } = CONFIG[phase];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className={`flex items-center gap-3 px-6 py-2 border-2 rounded-2xl backdrop-blur-xl shadow-2xl ${tone}`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-changa text-xl font-black tracking-widest">{label}</span>
      </motion.div>
    </AnimatePresence>
  );
}
