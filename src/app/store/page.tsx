'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Coins, Ghost, ShieldCheck, Zap } from 'lucide-react';
import GothicButton from '@/components/ui/GothicButton';
import { useGameStore } from '@/store/useGameStore';

const ITEMS = [
  { id: 1, name: 'درع الحماية', price: 500, icon: ShieldCheck, desc: 'يحميك من أول محاولة طرد' },
  { id: 2, name: 'رصاصة النخبة', price: 800, icon: Zap, desc: 'قدرة إضافية للمافيا' },
  { id: 3, name: 'روح الظل', price: 1200, icon: Ghost, desc: 'تسمح لك بالتحدث 10 ثوانٍ بعد موتك' },
];

export default function StorePage() {
  const gems = useGameStore(s => s.profile.gems);
  return (
    <div className="min-h-dvh bg-[#0a0305] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap gap-6 justify-between items-center mb-16">
          <Link href="/">
            <GothicButton variant="secondary">العودة</GothicButton>
          </Link>
          <div className="text-center">
            <h1 className="font-changa text-5xl font-black text-[#cfb06f] neon-text-gold">السوق السري</h1>
            <p className="font-changa text-white/40 mt-2">اكسب الجواهر بالفوز في المباريات</p>
          </div>
          <div className="bg-black/60 border border-[#cfb06f]/30 p-4 rounded-xl flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-white/40 font-bold">رصيدك</p>
              <p className="font-orbitron text-2xl font-black text-[#cfb06f]">{gems.toLocaleString('ar-SA')}</p>
            </div>
            <Coins className="w-8 h-8 text-[#cfb06f]" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {ITEMS.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className="relative bg-[#1a0d0d] border-2 border-[#cfb06f]/20 rounded-3xl p-8 flex flex-col"
            >
              <item.icon className="w-14 h-14 text-[#cfb06f] mb-6" />
              <h3 className="font-changa text-2xl font-black text-white mb-2">{item.name}</h3>
              <p className="text-white/40 text-sm mb-8 leading-relaxed">{item.desc}</p>
              <div className="flex justify-between items-center mt-auto">
                <span className="flex items-center gap-2 font-orbitron text-xl font-bold text-[#cfb06f]">
                  <Coins className="w-4 h-4" /> {item.price}
                </span>
                <GothicButton disabled title="قريباً">
                  قريباً
                </GothicButton>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
