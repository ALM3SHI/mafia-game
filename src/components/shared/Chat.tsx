'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

interface Message {
  id: string;
  sender: string;
  text: string;
  isMe: boolean;
  isMafiaOnly?: boolean;
  isDeadOnly?: boolean;
  timestamp: string;
}

export default function Chat() {
  const { currentPhase, players, myId } = useGameStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'النظام', text: 'مرحباً بك في ساحة المعركة!', isMe: false, timestamp: '14:00' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const me = players.find(p => p.id === myId);
  const isDead = !me?.isAlive;
  const isMafiaChannel = currentPhase === 'night' && me?.role === 'mafia' && !isDead;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: me?.name || 'أنت',
      text: inputValue,
      isMe: true,
      isMafiaOnly: isMafiaChannel,
      isDeadOnly: isDead,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, newMessage]);
    setInputValue('');
  };

  const visibleMessages = messages.filter(msg => {
    if (msg.isDeadOnly) return isDead;
    if (msg.isMafiaOnly) return me?.role === 'mafia' && !isDead;
    return true;
  });

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed top-6 left-6 z-[60] gothic-button px-4 py-4 rounded-2xl flex items-center gap-3 transition-all duration-500",
          isDead ? "bg-gray-900/60 border-gray-500/40 text-gray-400" :
          isMafiaChannel ? "bg-red-900/40 border-red-500/40 shadow-[0_0_20px_rgba(220,38,38,0.3)]" : "bg-black/60 border-[#7f95a1]/40"
        )}
      >
        {isDead ? <span className="text-xl">👻</span> : <MessageSquare className={cn("w-6 h-6", isMafiaChannel ? "text-red-500" : "text-[#7f95a1]")} />}
        <span className={cn("font-orbitron text-xs tracking-widest font-black", isDead ? "text-gray-400" : isMafiaChannel ? "text-red-500" : "text-[#7f95a1]")}>
          {isDead ? 'GHOST CHAT' : isMafiaChannel ? 'MAFIA CHAT' : 'CHAT'}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -50 }}
            className={cn(
              "fixed top-24 left-6 w-80 h-[500px] z-[70] flex flex-col bg-black/90 border-2 rounded-3xl backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden transition-colors duration-500",
              isMafiaChannel ? "border-red-500/30" : "border-[#7f95a1]/30"
            )}
          >
            <div className={cn("p-4 border-b flex justify-between items-center", isDead ? "bg-gray-800/40 border-gray-600/30" : isMafiaChannel ? "bg-red-500/10 border-red-500/20" : "bg-[#7f95a1]/5 border-[#7f95a1]/20")}>
              <h3 className={cn("font-orbitron text-sm font-black tracking-[0.2em]", isDead ? "text-gray-400" : isMafiaChannel ? "text-red-500" : "text-[#7f95a1]")}>
                {isDead ? '👻 UNDERWORLD CHANNEL' : isMafiaChannel ? '💀 MAFIA CHANNEL' : 'COMMS CENTER'}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {visibleMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-start' : 'items-end'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", msg.isDeadOnly ? "text-gray-500" : msg.isMafiaOnly ? "text-red-500" : "text-[#7f95a1]/60")}>
                      {msg.sender} {msg.isMafiaOnly && '💀'} {msg.isDeadOnly && '👻'}
                    </span>
                    <span className="text-[8px] text-white/20">{msg.timestamp}</span>
                  </div>
                  <div className={cn(
                    "px-4 py-2 rounded-2xl text-sm font-changa leading-relaxed border",
                    msg.isMe 
                    ? (msg.isDeadOnly ? 'bg-gray-800/40 text-gray-300 border-gray-600/30' : msg.isMafiaOnly ? 'bg-red-900/20 text-white border-red-500/30' : 'bg-[#7f95a1]/20 text-white border-[#7f95a1]/30')
                    : (msg.isDeadOnly ? 'bg-gray-900/20 text-gray-400 border-gray-700/20 italic' : 'bg-white/5 text-white/80 border-white/10')
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 bg-black/40">
              <div className="relative">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isDead ? "تحدث مع الأرواح الأخرى..." : isMafiaChannel ? "تحدث مع المافيا فقط..." : "أرسل رسالة..."}
                  className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-sm font-changa text-white focus:outline-none focus:border-[#7f95a1] transition-colors"
                />
                <button onClick={handleSend} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white/40 hover:text-white transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
