'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Dna, Gem, LayoutGrid, ScrollText, ShoppingBag, Swords, UserPen, X } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import GothicButton from '@/components/ui/GothicButton';

/** Deterministic pseudo-random in [0,1) so server and client render the same decor. */
const seeded = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const FLOATING = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  emoji: ['🎴', '🃏', '♠️', '♥️', '♦️', '♣️', '🎭', '👑', '⚔️', '🛡️'][i % 10],
  x: seeded(i + 1) * 100,
  y: seeded(i + 101) * 100,
  drift: seeded(i + 201) * 100 - 50,
  delay: seeded(i + 301) * 5,
  duration: 15 + seeded(i + 401) * 20,
}));

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير يا بطل';
  if (h < 18) return 'مساء الحماس';
  return 'أهلاً بملك الليل';
}

export default function LandingPage() {
  const router = useRouter();
  const profile = useGameStore(s => s.profile);
  const [modal, setModal] = useState<'join' | 'profile' | null>(null);

  return (
    <div className="relative min-h-dvh bg-[radial-gradient(ellipse_at_bottom,_#2a0e11_0%,_#160709_100%)] overflow-hidden flex flex-col items-center justify-center py-28">
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
        {FLOATING.map(c => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.15, scale: 1, y: [0, -150, 0], x: [0, c.drift, 0], rotate: [0, 360] }}
            transition={{ duration: c.duration, repeat: Infinity, ease: 'linear', delay: c.delay }}
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
            className="absolute text-4xl"
          >
            {c.emoji}
          </motion.div>
        ))}
      </div>

      {/* Profile bar */}
      <div className="fixed top-0 inset-x-0 p-6 flex justify-between items-center z-[100] bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={() => setModal('profile')} className="flex items-center gap-4 bg-black/40 p-2 pl-6 rounded-full border border-white/5 backdrop-blur-md hover:border-white/20 transition-colors">
          <span className="w-12 h-12 bg-gradient-to-br from-[#8f483b] to-[#7f95a1] rounded-full border-2 border-white/30 flex items-center justify-center text-2xl">{profile.avatar}</span>
          <span className="flex flex-col text-right">
            <span className="font-changa font-black text-white leading-tight">{profile.username}</span>
            <span className="font-changa text-xs text-[#cfb06f] font-bold">
              المستوى {profile.level} · {profile.wins} فوز من {profile.gamesPlayed}
            </span>
          </span>
        </button>
        <Link href="/store" className="bg-black/60 border-2 border-[#7f8f5f4d] px-6 py-2 rounded-full flex items-center gap-3 hover:border-[#cfb06f] transition-all">
          <Gem className="w-5 h-5 text-[#cfb06f]" />
          <span className="font-orbitron font-black text-[#7f8f5f] text-lg">{profile.gems.toLocaleString('ar-SA')}</span>
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex flex-col items-center gap-12 w-full">
        <div className="text-center">
          <h1
            style={{ textShadow: '0 0 24px rgba(255,248,234,0.14), 5px 5px 0 #b64f43, -5px -5px 0 #7f95a1' }}
            className="font-orbitron text-[clamp(4rem,12vw,9rem)] font-black text-white tracking-tighter leading-none select-none"
            dir="ltr"
          >
            MAFIA
          </h1>
          <p className="font-changa text-xl text-[#cfb06f] font-black tracking-[0.4em] mt-2">المافيا لا تنام</p>
          <p className="mt-6 text-[#cfb06f]/80 font-bold text-sm tracking-widest" suppressHydrationWarning>
            {greeting()}
          </p>
        </div>

        <div className="flex flex-col gap-10 w-full max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-10">
            <button className="arcade-btn btn-create" onClick={() => router.push('/lobby')}>
              <Dna />
              <span>إنشاء غرفة</span>
              <small>العب ضد البوتات</small>
            </button>
            <button className="arcade-btn btn-join" onClick={() => setModal('join')}>
              <Swords />
              <span>انضمام</span>
              <small>اللعب الجماعي — قريباً</small>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <button className="arcade-btn small btn-deck" disabled title="قريباً">
              <LayoutGrid />
              <span>مجموعتي</span>
              <small>قريباً</small>
            </button>
            <button className="arcade-btn small btn-store" onClick={() => router.push('/store')}>
              <ShoppingBag />
              <span>المتجر</span>
            </button>
            <button className="arcade-btn small btn-rules" onClick={() => router.push('/rules')}>
              <ScrollText />
              <span>القوانين</span>
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {modal === 'join' && <JoinRoomModal onClose={() => setModal(null)} />}
        {modal === 'profile' && <ProfileModal onClose={() => setModal(null)} />}
      </AnimatePresence>
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-[#1a0d0d] border-2 border-[#cfb06f4d] rounded-[40px] p-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-changa text-3xl font-black text-[#cfb06f]">{title}</h2>
          <button onClick={onClose} aria-label="إغلاق" className="text-white/30 hover:text-white">
            <X className="w-7 h-7" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function JoinRoomModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="الانضمام لغرفة" onClose={onClose}>
      <p className="text-white/60 leading-relaxed mb-8">
        اللعب الجماعي عبر الإنترنت ما زال قيد التطوير. حالياً تقدر تنشئ غرفة محلية وتلعب ضد البوتات (مع ردود صوتية إذا كان الخادم الصوتي شغال).
      </p>
      <Link href="/lobby" onClick={onClose}>
        <GothicButton className="w-full py-4 text-xl">إنشاء غرفة محلية</GothicButton>
      </Link>
    </ModalShell>
  );
}

function ProfileModal({ onClose }: { onClose: () => void }) {
  const profile = useGameStore(s => s.profile);
  const setProfileName = useGameStore(s => s.setProfileName);
  const [name, setName] = useState(profile.username);
  return (
    <ModalShell title="ملفك" onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
          setProfileName(name);
          onClose();
        }}
      >
        <label className="flex items-center gap-2 text-white/60 mb-3">
          <UserPen className="w-4 h-4" /> اسمك في اللعبة
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          className="w-full bg-black/60 border-2 border-[#cfb06f4d] rounded-2xl px-5 py-4 text-xl text-[#cfb06f] focus:outline-none focus:border-[#cfb06f]"
        />
        <GothicButton type="submit" className="w-full py-4 text-xl mt-8">
          حفظ
        </GothicButton>
      </form>
    </ModalShell>
  );
}
