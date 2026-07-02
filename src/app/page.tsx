'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import GothicButton from '@/components/ui/GothicButton';
import { 
  X, Hash, UserPlus, Settings, LogOut, 
  Dna, Swords, LayoutGrid, ShoppingBag, ScrollText, 
  Gem, Trophy
} from 'lucide-react';

export default function LandingPage() {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const { profile } = useGameStore();
  
  const [greeting, setGreeting] = useState('أهلاً بك يا بطل');
  const [footerMsg, setFooterMsg] = useState('المافيا لا تنام');
  const [mounted, setMounted] = useState(false);
  const [floatingCards, setFloatingCards] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('صباح الخير يا بطل');
    else if (hour < 18) setGreeting('مساء الحماس');
    else setGreeting('أهلاً بملك الليل');

    const msgs = ['صُنعت بِـ ❤️ و ☕ كثير', 'لا أحد بأمان في الظلام', 'ثق بنفسك... لا أحد غيرك', 'البطاقات لا تكذب أبداً'];
    setFooterMsg(msgs[Math.floor(Math.random() * msgs.length)]);

    // Generate floating cards only on client
    const cards = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      emoji: ['🎴','🃏','♠️','♥️','♦️','♣️','🎭','👑','⚔️','🛡️'][i % 10],
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 15 + Math.random() * 20
    }));
    setFloatingCards(cards);
  }, []);

  if (!mounted) return <div className="min-h-screen bg-[#160709]" />;

  return (
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_bottom,_#2a0e11_0%,_#160709_100%)] overflow-hidden flex flex-col items-center justify-center">
      
      {/* 1. BACKGROUND FLOATING CARDS */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {floatingCards.map((card) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: 0.15, 
              scale: 1,
              y: [0, -150, 0],
              x: [0, Math.random() * 100 - 50, 0],
              rotate: [0, 360],
            }}
            transition={{ 
              duration: card.duration, 
              repeat: Infinity, 
              ease: "linear",
              delay: card.delay
            }}
            style={{ left: `${card.x}%`, top: `${card.y}%` }}
            className="absolute text-4xl"
          >
            {card.emoji}
          </motion.div>
        ))}
      </div>

      {/* 2. PROFILE HUD (TOP BAR) */}
      <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-[100] bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4 bg-black/40 p-2 pr-6 rounded-full border border-white/5 backdrop-blur-md">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: -5 }}
            className="w-12 h-12 bg-gradient-to-br from-[#8f483b] to-[#7f95a1] rounded-full border-2 border-white/30 flex items-center justify-center text-2xl shadow-lg cursor-pointer"
          >
            {profile?.avatar}
          </motion.div>
          <div className="flex flex-col">
            <span className="font-changa font-black text-white leading-tight">{profile?.username}</span>
            <span className="font-changa text-[10px] text-[#cfb06f] font-bold">
              LV {profile?.level} · <span className="text-white font-black">{profile?.wins}</span> WINS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-black/60 border-2 border-[#7f8f5f4d] px-6 py-2 rounded-full flex items-center gap-3 shadow-lg hover:border-[#cfb06f] transition-all cursor-pointer group">
            <Gem className="w-5 h-5 text-[#cfb06f] group-hover:scale-110 transition-transform" />
            <span className="font-orbitron font-black text-[#7f8f5f] text-lg">{profile?.gems?.toLocaleString('ar-SA')}</span>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="w-11 h-11 rounded-full bg-black/60 border-2 border-white/10 flex items-center justify-center text-white hover:border-white transition-all hover:rotate-90 duration-500"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button className="w-11 h-11 rounded-full bg-black/60 border-2 border-[#b64f434d] flex items-center justify-center text-[#b64f43] hover:bg-[#b64f43] hover:text-white transition-all">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3. MAIN UI CONTAINER */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center gap-12"
      >
        {/* LOGO BOX */}
        <div className="text-center group">
          <motion.h1 
            style={{ 
              textShadow: "0 0 24px rgba(255,248,234,0.14), 5px 5px 0 #b64f43, -5px -5px 0 #7f95a1" 
            }}
            className="font-orbitron text-[9rem] font-black text-white mb-0 tracking-tighter leading-none select-none cursor-default"
          >
            MAFIA
          </motion.h1>
          <p className="font-changa text-xl text-[#cfb06f] font-black tracking-[0.5em] mt-2 uppercase">
            ARCADE ULTIMATE
          </p>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            className="mt-6 text-[#cfb06f] font-bold text-sm tracking-widest"
          >
            {greeting}
          </motion.div>
        </div>

        {/* BUTTONS GRID */}
        <div className="flex flex-col gap-10 w-full max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-10 w-full">
            <Link href="/lobby" className="block">
              <button className="arcade-btn-v2 btn-create w-full">
                <div className="btn-bg" />
                <div className="neon-edge" />
                <div className="btn-content">
                  <Dna />
                  <span>إنشاء غرفة</span>
                </div>
                <div className="shine-line" />
              </button>
            </Link>
            <button 
              onClick={() => setShowJoinModal(true)}
              className="arcade-btn-v2 btn-join w-full"
            >
              <div className="btn-bg" />
              <div className="neon-edge" />
              <div className="btn-content">
                <Swords />
                <span>انضمام</span>
              </div>
              <div className="shine-line" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6 w-full">
            <Link href="/collection">
              <button className="arcade-btn-v2 btn-deck small-btn w-full">
                <div className="btn-bg" />
                <div className="neon-edge" />
                <div className="btn-content">
                  <LayoutGrid />
                  <span>مجموعتي</span>
                </div>
              </button>
            </Link>
            <Link href="/store">
              <button className="arcade-btn-v2 btn-store small-btn w-full">
                <div className="btn-bg" />
                <div className="neon-edge" />
                <div className="btn-content">
                  <ShoppingBag />
                  <span>المتجر</span>
                </div>
              </button>
            </Link>
            <Link href="/rules">
              <button className="arcade-btn-v2 btn-rules small-btn w-full">
                <div className="btn-bg" />
                <div className="neon-edge" />
                <div className="btn-content">
                  <ScrollText />
                  <span>القوانين</span>
                </div>
              </button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* 4. FOOTER */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white/20 font-changa text-[10px] font-black tracking-[0.4em] uppercase z-10">
        {footerMsg}
      </div>

      <AnimatePresence>
        {showJoinModal && (
          <JoinRoomModal onClose={() => setShowJoinModal(false)} />
        )}
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      <style jsx>{`
        .arcade-btn-v2 {
          @apply relative h-52 flex flex-col items-center justify-center transition-all duration-300 group outline-none rounded-[32px] border-[4px];
          background: #1a1c26;
          box-shadow: 0 12px 0 #000, 0 20px 40px rgba(0,0,0,0.6);
        }

        .btn-create { 
          @apply border-[#b64f43]; 
          box-shadow: 0 12px 0 #4f221d, 0 15px 40px rgba(182, 79, 67, 0.15);
        }
        .btn-join { 
          @apply border-[#7f95a1]; 
          box-shadow: 0 12px 0 #44515b, 0 15px 40px rgba(127, 149, 161, 0.15);
        }
        .btn-deck { 
          @apply border-[#766078]; 
          box-shadow: 0 8px 0 #433445;
        }
        .btn-store { 
          @apply border-[#7f8f5f]; 
          box-shadow: 0 8px 0 #404b2e;
        }
        .btn-rules { 
          @apply border-[#cfb06f]; 
          box-shadow: 0 8px 0 #6e5329;
        }

        .arcade-btn-v2:hover {
          @apply -translate-y-2;
          box-shadow: 0 15px 0 #000, 0 30px 60px rgba(0,0,0,0.8);
          background: #242736;
        }
        .btn-create:hover { box-shadow: 0 15px 0 #4f221d, 0 20px 60px rgba(182, 79, 67, 0.3); }
        .btn-join:hover { box-shadow: 0 15px 0 #44515b, 0 20px 60px rgba(127, 149, 161, 0.3); }

        /* The Content (Straight & Solid) */
        .btn-content {
          @apply relative z-10 flex flex-col items-center justify-center transition-all duration-300;
        }

        .btn-content :global(svg) {
          @apply w-16 h-16 mb-4 text-white opacity-90 transition-all duration-300;
        }
        .arcade-btn-v2:hover .btn-content :global(svg) {
          @apply scale-110 rotate-3 text-white;
          filter: drop-shadow(0 0 15px white);
        }

        .btn-content span {
          @apply text-2xl font-black tracking-widest uppercase text-white transition-all duration-300 font-changa;
        }
        .arcade-btn-v2:hover .btn-content span {
          @apply scale-105;
        }

        .small-btn { @apply h-40; }
        .small-btn .btn-content :global(svg) { @apply w-12 h-12 mb-2; }
        .small-btn .btn-content span { @apply text-xl; }

        .arcade-btn-v2:active {
          @apply translate-y-8;
          box-shadow: none !important;
          transition: 0.05s;
        }

        /* Reflection Shine */
        .arcade-btn-v2::before {
          content: '';
          @apply absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-500;
        }
        .arcade-btn-v2:hover::before { @apply opacity-100; }
      `}</style>
    </div>
  );
}

function JoinRoomModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-[#1a0d0d] border-2 border-[#cfb06f4d] rounded-[40px] p-12">
        <div className="flex justify-between items-center mb-10">
          <h2 className="font-orbitron text-3xl font-black text-[#cfb06f]">JOIN ROOM</h2>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
        </div>
        <input 
          type="text" 
          placeholder="ENTER CODE..."
          className="w-full bg-black/60 border-2 border-[#cfb06f4d] rounded-2xl px-6 py-5 font-orbitron text-2xl text-[#cfb06f] focus:outline-none focus:border-[#cfb06f] transition-all"
        />
        <GothicButton className="w-full py-5 text-2xl mt-8">انضم الآن</GothicButton>
      </motion.div>
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-[#241011] border border-[#51362e] rounded-[32px] p-10">
        <h2 className="font-orbitron text-2xl text-[#cfb06f] text-center mb-10 tracking-[0.2em]">SETTINGS</h2>
        <div className="space-y-6">
          <div className="flex justify-between items-center text-white font-changa">
            <span>تأثير شاشة CRT</span>
            <div className="w-12 h-6 bg-white/5 rounded-full relative p-1"><div className="w-4 h-4 bg-[#cfb06f] rounded-full" /></div>
          </div>
          <div className="flex justify-between items-center text-white font-changa">
            <span>الموسيقى</span>
            <div className="w-12 h-6 bg-white/5 rounded-full relative p-1"><div className="w-4 h-4 bg-[#cfb06f] rounded-full" /></div>
          </div>
        </div>
        <GothicButton onClick={onClose} variant="secondary" className="w-full mt-12">إغلاق</GothicButton>
      </motion.div>
    </div>
  );
}
