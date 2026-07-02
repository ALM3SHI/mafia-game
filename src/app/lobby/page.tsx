'use client';

import { useGameStore, Player } from '@/store/useGameStore';
import Card from '@/components/game/Card';
import GothicButton from '@/components/ui/GothicButton';
import Chat from '@/components/shared/Chat';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { 
  Users, Crown, Settings, ShieldCheck, Zap, X, 
  MessageSquare, LogOut, Link as LinkIcon, UserPlus,
  Cpu, Timer, Eye, EyeOff, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

export default function LobbyPage() {
  const { 
    players, roomCode, myId, settings, 
    updateSettings, addBot, removePlayer, updatePlayer 
  } = useGameStore();
  
  const [isHost, setIsHost] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'roles' | 'bots'>('settings');

  useEffect(() => {
    if (players.length === 0) {
      const mockId = 'player-1';
      useGameStore.getState().setMyId(mockId);
      useGameStore.getState().setRoomCode('MAFIA-777');
      useGameStore.getState().setPlayers([
        { id: mockId, name: 'أنت (المضيف)', isAlive: true, isReady: false, voteCount: 0, avatar: '🎭', cardArt: '/cards/citizen.png' },
        { id: 'player-2', name: 'العميل 007', isAlive: true, isReady: false, isBot: true, voteCount: 0, avatar: '🕵️', cardArt: '/cards/citizen.png' },
        { id: 'player-3', name: 'لص الليل', isAlive: true, isReady: false, isBot: true, voteCount: 0, avatar: '🥷', cardArt: '/cards/mafia.png' },
        { id: 'player-4', name: 'الشبح', isAlive: true, isReady: false, isBot: true, voteCount: 0, avatar: '👻', cardArt: '/cards/citizen.png' },
      ]);
    }
  }, []);

  const toggleReady = () => {
    const me = players.find(p => p.id === myId);
    if (me) updatePlayer(myId!, { isReady: !me.isReady });
  };

  const [inspectedIds, setInspectedIds] = useState<Set<string>>(new Set());

  const toggleInspect = (id: string) => {
    if (id === myId) {
      toggleReady();
    } else {
      const targetPlayer = players.find(p => p.id === id);
      // If host clicks a bot, toggle its real ready state
      if (isHost && targetPlayer?.isBot) {
        updatePlayer(id, { isReady: !targetPlayer.isReady });
      } else {
        // Otherwise just do a visual flip inspection
        setInspectedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }
    }
  };

  const cardCovers = [
    '/cards/CARDcover.jpg',
    '/cards/CARDcover2.jpg',
    '/cards/CARDcover3.png',
    '/cards/CARDcover4.png',
    '/cards/CARDcover5.jpg',
    '/cards/CARDcover6.png',
    '/cards/CARDcover7.jpg',
    '/cards/CARDcover8.png',
    '/cards/CARDcover9.png',
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_bottom,_#2d1414_0%,_#160709_100%)] overflow-hidden flex flex-col items-center justify-center p-8">
      
      {/* 1. BIG BACKGROUND STATS */}
      <div className="fixed inset-0 flex justify-between items-start px-24 pt-16 pointer-events-none z-0 overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="font-orbitron text-[15vw] font-black text-[#b64f43] leading-none drop-shadow-[0_0_50px_rgba(182,79,67,0.2)]"
        >
          {settings.mafiaCount}
          <span className="block text-3xl font-changa tracking-[1em] text-center mt-[-5%] opacity-50 uppercase">Mafia</span>
        </motion.div>

        <motion.div 
          animate={{ scale: [1.05, 1, 1.05], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="font-orbitron text-[15vw] font-black text-[#7f95a1] leading-none drop-shadow-[0_0_50px_rgba(127,149,161,0.2)]"
        >
          {Math.max(0, players.length - settings.mafiaCount)}
          <span className="block text-3xl font-changa tracking-[1em] text-center mt-[-5%] opacity-50 uppercase">Citizen</span>
        </motion.div>
      </div>

      {/* 2. TOP HUD */}
      <div className="fixed top-0 left-0 right-0 p-8 flex justify-between items-start z-[100] pointer-events-none">
        <div className="flex flex-col gap-4 pointer-events-auto">
          <Link href="/">
            <button className="bg-black/60 border-2 border-[#b64f434d] px-8 py-3 rounded-xl text-[#b64f43] font-changa font-black hover:bg-[#b64f43] hover:text-white transition-all flex items-center gap-3 backdrop-blur-md">
              <LogOut className="w-5 h-5" />
              مغادرة الغرفة
            </button>
          </Link>
          <div className="bg-black/60 border border-white/10 px-6 py-2 rounded-full flex items-center gap-3 backdrop-blur-md">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse" />
            <span className="font-changa text-white/60 text-xs font-bold uppercase tracking-widest">
              اللاعبون: <span className="text-white font-black font-orbitron ml-1">{players.length} / 12</span>
            </span>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bg-black/80 border-2 border-[#cfb06f] p-4 px-10 rounded-3xl backdrop-blur-xl shadow-2xl pointer-events-auto text-center">
          <p className="text-[10px] text-[#cfb06f99] font-black uppercase tracking-[0.4em] mb-1">ROOM ENCRYPTION</p>
          <h2 className="font-orbitron text-4xl font-black text-[#cfb06f]">{roomCode}</h2>
          <button className="mt-3 text-[10px] text-[#cfb06f] font-black flex items-center gap-2 mx-auto hover:tracking-widest transition-all">
            <LinkIcon className="w-3 h-3" />
            انسخ رابط الدعوة
          </button>
        </div>
      </div>

      {/* 3. CENTER 3D AREA */}
      <div className="relative w-full h-[65vh] perspective-[2500px] transform-style-3d z-10 flex items-center justify-center">
        <AnimatePresence>
          {players.map((player, index) => {
            const total = players.length;
            const maxPerRow = 7;
            const rowIndex = Math.floor(index / maxPerRow);
            const colIndex = index % maxPerRow;
            const itemsInThisRow = Math.min(maxPerRow, total - rowIndex * maxPerRow);

            const baseGap = 280; 
            const maxSpread = 1400; 
            const spread = Math.min((itemsInThisRow - 1) * baseGap, maxSpread);

            const progress = itemsInThisRow > 1 ? (colIndex / (itemsInThisRow - 1)) * 2 - 1 : 0;

            const x = progress * (spread / 2);
            const z = itemsInThisRow > 1 ? -Math.pow(progress, 2) * 150 : 0;
            const rotY = progress * -25;
            const rotZ = progress * 5;

            const totalRows = Math.ceil(total / maxPerRow);
            const rowHeight = 350; 
            const startY = -((totalRows - 1) * rowHeight) / 2; 
            const finalY = startY + (rowIndex * rowHeight) + (player.id === myId ? -20 : 0);

            const isFlipped = player.isReady || inspectedIds.has(player.id);
            const backImage = cardCovers[index % cardCovers.length];

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: 0, z: -1000, rotateY: 90 }}
                animate={{ 
                  opacity: 1, 
                  x: x, 
                  z: z, 
                  rotateY: -rotY,
                  rotateZ: rotZ,
                  y: finalY
                }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 50, 
                  damping: 15,
                  delay: index * 0.1 
                }}
                className="absolute transform-style-3d group cursor-pointer"
              >
                <Card
                  className={cn(
                    "w-48 h-72",
                    player.id === myId && "ring-4 ring-[#cfb06f] ring-offset-8 ring-offset-transparent rounded-2xl"
                  )}
                  isFlipped={isFlipped}
                  backImage={backImage}
                  onClick={() => toggleInspect(player.id)}
                  backContent={
                    <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center bg-black/40 backdrop-blur-[2px]">
                      <div className="mb-4 text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">{player.avatar}</div>
                      <h3 className="font-changa text-xl font-black text-white drop-shadow-lg">{player.name}</h3>
                      <div className="mt-4 px-4 py-1 bg-white/20 border border-white/40 rounded-full text-[10px] text-white uppercase tracking-widest font-black shadow-xl">
                        {player.isBot ? 'بوت تلقائي' : 'انقر للمعاينة'}
                      </div>
                    </div>
                  }
                  frontContent={
                    <div className="relative h-full w-full overflow-hidden">
                      <img src={player.cardArt} className="absolute inset-0 w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      <div className="absolute top-4 left-4 flex gap-2">
                        {player.isBot && <div className="bg-black/60 p-2 rounded-lg border border-[#7f95a14d] text-[#7f95a1]"><Cpu className="w-4 h-4" /></div>}
                        {index === 0 && <div className="bg-black/60 p-2 rounded-lg border border-[#cfb06f4d] text-[#cfb06f]"><Crown className="w-4 h-4" /></div>}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center">
                        <div className="px-4 py-1 bg-[#cfb06f] text-black font-black font-changa text-[10px] rounded-full mb-2">READY</div>
                        <h3 className="font-orbitron text-xl font-black text-white">{player.name.toUpperCase()}</h3>
                      </div>
                    </div>
                  }
                />
                
                {/* Kick Button for Host */}
                {isHost && player.id !== myId && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); removePlayer(player.id); }}
                    className="absolute -top-4 -right-4 w-10 h-10 bg-[#b64f43] rounded-full flex items-center justify-center text-white border-2 border-white opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100 shadow-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 4. FLOATING TOGGLES */}
      <button 
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-12 left-12 w-16 h-16 rounded-full bg-black/80 border-2 border-[#7f95a1] flex items-center justify-center text-[#7f95a1] z-[110] shadow-[0_0_30px_rgba(127,149,161,0.3)] hover:scale-110 transition-transform"
      >
        <MessageSquare className="w-8 h-8" />
      </button>

      <button 
        onClick={() => setShowSettings(!showSettings)}
        className="fixed bottom-12 right-12 w-16 h-16 rounded-full bg-black/80 border-2 border-[#cfb06f] flex items-center justify-center text-[#cfb06f] z-[110] shadow-[0_0_30px_rgba(207,176,111,0.3)] hover:scale-110 transition-transform"
      >
        <Settings className="w-8 h-8" />
      </button>

      {/* 5. SIDE PANELS */}
      <AnimatePresence>
        {showChat && (
          <motion.div 
            initial={{ x: -400 }} animate={{ x: 0 }} exit={{ x: -400 }}
            className="fixed top-0 bottom-0 left-0 w-96 bg-black/90 border-r-2 border-[#7f95a14d] backdrop-blur-2xl z-[105] shadow-[50px_0_100px_rgba(0,0,0,0.5)]"
          >
            <Chat />
          </motion.div>
        )}

        {showSettings && (
          <motion.div 
            initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
            className="fixed top-0 bottom-0 right-0 w-[450px] bg-black/90 border-l-2 border-[#cfb06f4d] backdrop-blur-2xl z-[105] shadow-[-50px_0_100px_rgba(0,0,0,0.5)] flex flex-col"
          >
            <div className="p-10 flex-1 overflow-y-auto">
              <h2 className="font-orbitron text-3xl font-black text-[#cfb06f] mb-8 italic tracking-tighter">
                {isHost ? 'HOST SETTINGS' : 'ROOM SUMMARY'}
              </h2>

              {isHost ? (
                <>
                  <div className="flex gap-4 mb-8">
                    {['settings', 'roles', 'bots'].map(tab => (
                      <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-changa font-black text-sm transition-all",
                          activeTab === tab ? "bg-[#cfb06f] text-black" : "bg-white/5 text-white/40 hover:bg-white/10"
                        )}
                      >
                        {tab === 'settings' ? 'الإعدادات' : tab === 'roles' ? 'الأدوار' : 'البوتات'}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-8">
                    {activeTab === 'settings' && (
                      <>
                        <div className="space-y-6 bg-white/5 p-6 rounded-3xl border border-white/5">
                          <h3 className="font-orbitron text-xs text-[#cfb06f] tracking-widest flex items-center gap-3"><Timer className="w-4 h-4" /> TIMING_CFG</h3>
                          <div className="space-y-4">
                            {[
                              { label: 'وقت المناقشة', key: 'discussionDuration', val: settings.discussionDuration },
                              { label: 'وقت النهار', key: 'dayDuration', val: settings.dayDuration },
                              { label: 'وقت التصويت', key: 'voteDuration', val: settings.voteDuration },
                              { label: 'وقت الليل', key: 'nightDuration', val: settings.nightDuration },
                            ].map(item => (
                              <div key={item.key} className="flex flex-col gap-2">
                                <div className="flex justify-between text-xs font-bold text-white/40">
                                  <span>{item.label}</span>
                                  <span className="text-[#cfb06f] font-orbitron">{item.val}s</span>
                                </div>
                                <input 
                                  type="range" min="15" max="180" step="15" 
                                  value={item.val} 
                                  onChange={(e) => updateSettings({ [item.key]: parseInt(e.target.value) })}
                                  className="w-full h-1 bg-black/60 rounded-full accent-[#cfb06f]"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                          <h3 className="font-orbitron text-xs text-[#cfb06f] tracking-widest mb-6 flex items-center gap-3"><Zap className="w-4 h-4" /> RULES_CFG</h3>
                          <div className="space-y-4">
                            <label className="flex items-center justify-between cursor-pointer group">
                              <span className="text-white/60 font-changa group-hover:text-white transition-colors">تصويت سري</span>
                              <div 
                                onClick={() => updateSettings({ secretVoting: !settings.secretVoting })}
                                className={cn("w-12 h-6 rounded-full relative transition-colors", settings.secretVoting ? "bg-[#cfb06f]" : "bg-white/10")}
                              >
                                <motion.div animate={{ x: settings.secretVoting ? 24 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg" />
                              </div>
                            </label>
                            <label className="flex items-center justify-between cursor-pointer group">
                              <span className="text-white/60 font-changa group-hover:text-white transition-colors">كشف الأدوار</span>
                              <div 
                                onClick={() => updateSettings({ revealRolesOnDeath: !settings.revealRolesOnDeath })}
                                className={cn("w-12 h-6 rounded-full relative transition-colors", settings.revealRolesOnDeath ? "bg-[#cfb06f]" : "bg-white/10")}
                              >
                                <motion.div animate={{ x: settings.revealRolesOnDeath ? 24 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg" />
                              </div>
                            </label>
                          </div>
                        </div>
                      </>
                    )}

                    {activeTab === 'roles' && (
                      <div className="grid grid-cols-3 gap-4">
                        {Object.entries(settings.roles).map(([role, enabled]) => (
                          <button 
                            key={role}
                            onClick={() => updateSettings({ roles: { ...settings.roles, [role]: !enabled } })}
                            className={cn(
                              "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                              enabled ? "bg-[#cfb06f1a] border-[#cfb06f] text-[#cfb06f]" : "bg-black/60 border-white/5 text-white/20"
                            )}
                          >
                            <span className="text-2xl">{role === 'doctor' ? '💉' : '🔍'}</span>
                            <span className="text-[10px] font-black uppercase tracking-tighter">{role}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {activeTab === 'bots' && (
                      <div className="space-y-4">
                        <GothicButton onClick={addBot} className="w-full py-4 text-lg">
                          <div className="flex items-center justify-center gap-3">
                            <Cpu className="w-5 h-5" />
                            إضافة بوت ذكي
                          </div>
                        </GothicButton>
                        <div className="space-y-2">
                          {players.filter(p => p.isBot).map(bot => (
                            <div key={bot.id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{bot.avatar}</span>
                                <span className="text-white font-bold">{bot.name}</span>
                              </div>
                              <button onClick={() => removePlayer(bot.id)} className="text-red-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {/* Guest Read-only Summary */}
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/40 font-bold">عدد المافيا</span>
                      <span className="text-[#b64f43] font-orbitron font-black text-xl">{settings.mafiaCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/40 font-bold">تصويت سري</span>
                      <span className={settings.secretVoting ? "text-green-500" : "text-red-500"}>{settings.secretVoting ? 'مفعل' : 'معطل'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-10 border-t border-white/5">
              <GothicButton onClick={() => setShowSettings(false)} className="w-full py-5 text-xl">إغلاق الإعدادات</GothicButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. BOTTOM CONTROLS */}
      <div className="fixed bottom-12 flex flex-col items-center gap-6 z-50">
        <div className="bg-black/80 border-2 border-white/10 px-8 py-3 rounded-full flex items-center gap-6 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">الجاهزية</span>
            <span className="font-orbitron text-2xl font-black text-[#cfb06f]">
              {players.filter(p => p.isReady).length} <span className="text-white/20 text-sm mx-1">/</span> {players.length}
            </span>
          </div>
          {players.length < 4 && (
            <div className="text-[10px] text-red-500 font-bold animate-pulse">نحتاج 4 لاعبين كحد أدنى</div>
          )}
        </div>

        <div className="flex gap-6">
          <GothicButton 
            variant={players.find(p => p.id === myId)?.isReady ? 'secondary' : 'primary'}
            onClick={toggleReady}
            className="px-20 py-5 text-2xl shadow-[0_0_50px_rgba(207,176,111,0.2)]"
          >
            {players.find(p => p.id === myId)?.isReady ? 'إلغاء الجاهزية' : 'تأكيد الحضور'}
          </GothicButton>

          {isHost && (
            <Link href="/game">
              <GothicButton 
                disabled={players.length < 4 || !players.every(p => p.isReady)}
                className="px-20 py-5 text-2xl border-[#cfb06f] bg-[#cfb06f] text-black hover:bg-white disabled:opacity-20 shadow-[0_0_80px_rgba(207,176,111,0.4)]"
              >
                بدء اللعبة 🔥
              </GothicButton>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
