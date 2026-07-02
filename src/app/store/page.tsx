'use client';

import GothicButton from '@/components/ui/GothicButton';
import { motion } from 'framer-motion';
import { ShoppingBag, Coins, ShieldCheck, Zap, Ghost } from 'lucide-react';
import Link from 'next/link';

export default function StorePage() {
  const items = [
    { id: 1, name: 'درع الحماية', price: 500, icon: ShieldCheck, desc: 'يحميك من أول محاولة استبعاد' },
    { id: 2, name: 'رصاصة النخبة', price: 800, icon: Zap, desc: 'تزيد من دقة التصويب للمافيا' },
    { id: 3, name: 'روح الظل', price: 1200, icon: Ghost, desc: 'تسمح لك بالتحدث لمدة 10 ثوانٍ بعد موتك' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0305] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-16">
          <Link href="/">
            <GothicButton variant="secondary">العودة</GothicButton>
          </Link>
          
          <div className="text-center">
            <h1 className="font-orbitron text-5xl font-black text-[#cfb06f] neon-text-gold">السوق السري</h1>
            <p className="font-changa text-white/40 mt-2 tracking-[0.4em] uppercase">تجهّز للمعركة القادمة</p>
          </div>

          <div className="bg-black/60 border border-[#cfb06f]/30 p-4 rounded-xl flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-white/40 font-bold uppercase">رصيدك</p>
              <p className="font-orbitron text-2xl font-black text-[#cfb06f]">2,450</p>
            </div>
            <Coins className="w-8 h-8 text-[#cfb06f]" />
          </div>
        </div>

        {/* Store Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className="group relative bg-[#1a0d0d] border-2 border-[#cfb06f]/20 rounded-3xl p-8 hover:border-[#cfb06f] transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#cfb06f]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <item.icon className="w-16 h-16 text-[#cfb06f] mb-6 group-hover:scale-110 transition-transform duration-500" />
              <h3 className="font-changa text-2xl font-black text-white mb-2">{item.name}</h3>
              <p className="text-white/40 text-sm mb-8 leading-relaxed">{item.desc}</p>
              
              <div className="flex justify-between items-center mt-auto">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#cfb06f]" />
                  <span className="font-orbitron text-xl font-bold text-[#cfb06f]">{item.price}</span>
                </div>
                <GothicButton variant="primary">شراء</GothicButton>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Decorative Merchant Quote */}
        <div className="mt-24 text-center">
          <p className="font-changa italic text-white/20 text-lg">
            "القوة ليست في السلاح، بل فيمن يملكه..."
          </p>
        </div>
      </div>
    </div>
  );
}
