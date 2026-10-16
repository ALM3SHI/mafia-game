'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, X } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { cn } from '@/lib/utils';

/**
 * Slide-in chat panel. Messages live in the store's log (type 'chat') so bot
 * lines, voice replies and the player's own messages share one timeline.
 */
export default function ChatPanel({ open, onClose, side = 'left' }: { open: boolean; onClose: () => void; side?: 'left' | 'right' }) {
  const logs = useGameStore(s => s.logs);
  const me = useGameStore(s => s.players.find(p => p.id === s.myId));
  const addLog = useGameStore(s => s.addLog);
  const [value, setValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = logs.filter(l => l.type === 'chat');
  const isDead = me ? !me.isAlive : false;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, open]);

  const send = () => {
    const text = value.trim();
    if (!text || isDead) return;
    addLog(`${me?.name ?? 'أنت'}: ${text}`, 'chat');
    setValue('');
  };

  const offscreen = side === 'left' ? -420 : 420;

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: offscreen }}
          animate={{ x: 0 }}
          exit={{ x: offscreen }}
          className={cn(
            'fixed top-0 bottom-0 w-full max-w-sm bg-black/90 backdrop-blur-2xl z-[450] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.6)]',
            side === 'left' ? 'left-0 border-r-2 border-[#7f95a14d]' : 'right-0 border-l-2 border-[#7f95a14d]'
          )}
        >
          <div className="p-4 border-b border-[#7f95a1]/20 flex justify-between items-center">
            <h3 className="font-changa text-lg font-black text-[#7f95a1]">{isDead ? '👻 أنت ميت — للمشاهدة فقط' : '💬 الدردشة'}</h3>
            <button onClick={onClose} aria-label="إغلاق" className="text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && <p className="text-white/30 text-sm text-center mt-8">لا توجد رسائل بعد.</p>}
            {messages.map(m => {
              const [sender, ...rest] = m.text.split(': ');
              const mine = sender === me?.name;
              return (
                <div key={m.id} className={cn('flex flex-col', mine ? 'items-start' : 'items-end')}>
                  <span className="text-[11px] font-black text-[#7f95a1]/70 mb-1">{sender}</span>
                  <div className={cn('px-4 py-2 rounded-2xl text-sm leading-relaxed border', mine ? 'bg-[#7f95a1]/20 text-white border-[#7f95a1]/30' : 'bg-white/5 text-white/80 border-white/10')}>
                    {rest.join(': ')}
                  </div>
                </div>
              );
            })}
          </div>

          <form
            className="p-4 border-t border-white/10 flex gap-2"
            onSubmit={e => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={value}
              onChange={e => setValue(e.target.value)}
              disabled={isDead}
              maxLength={200}
              placeholder={isDead ? 'الأموات لا يتكلمون...' : 'أرسل رسالة...'}
              className="flex-1 bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#7f95a1] disabled:opacity-40"
            />
            <button type="submit" disabled={isDead} aria-label="إرسال" className="px-3 text-white/50 hover:text-white disabled:opacity-30">
              <Send className="w-5 h-5" />
            </button>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
