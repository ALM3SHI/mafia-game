'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Cpu, Crown, LogOut, MessageSquare, Settings, Timer, Users, X, Zap } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import Card from '@/components/game/Card';
import GothicButton from '@/components/ui/GothicButton';
import ChatPanel from '@/components/shared/ChatPanel';
import { MAX_PLAYERS, MIN_PLAYERS, buildRoleDeck, canStartGame, maxMafiaFor } from '@/lib/game-logic';
import { OPTIONAL_ROLES, ROLE_INFO } from '@/lib/roles';
import type { GameSettings } from '@/lib/game-types';
import { cn } from '@/lib/utils';
import { playSound } from '@/hooks/useSound';
import { arcLayout, CARD_COVERS } from '@/lib/layout';

type Tab = 'settings' | 'roles' | 'bots';
type TimingKey = 'testimonyDuration' | 'dayDuration' | 'voteDuration' | 'nightDuration';

const TIMINGS: { key: TimingKey; label: string; min: number; max: number; step: number }[] = [
  { key: 'testimonyDuration', label: 'وقت الشهادة لكل لاعب', min: 5, max: 60, step: 5 },
  { key: 'dayDuration', label: 'وقت النقاش العام', min: 15, max: 180, step: 15 },
  { key: 'voteDuration', label: 'وقت التصويت', min: 10, max: 90, step: 5 },
  { key: 'nightDuration', label: 'وقت الليل', min: 10, max: 90, step: 5 },
];

export default function LobbyPage() {
  const router = useRouter();
  const players = useGameStore(s => s.players);
  const roomCode = useGameStore(s => s.roomCode);
  const myId = useGameStore(s => s.myId);
  const settings = useGameStore(s => s.settings);
  const phase = useGameStore(s => s.phase);
  const { createLocalRoom, addBot, removePlayer, toggleReady, updateSettings, startGame, leaveRoom } = useGameStore.getState();

  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState<Tab>('settings');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createLocalRoom();
  }, [createLocalRoom]);

  // A game already running (e.g. browser back) belongs on the game screen.
  useEffect(() => {
    if (phase !== 'lobby') router.replace('/game');
  }, [phase, router]);

  const me = players.find(p => p.id === myId);
  const startCheck = canStartGame(players);
  const deck = buildRoleDeck(Math.max(players.length, MIN_PLAYERS), settings);
  const mafiaInDeck = deck.filter(r => r === 'mafia').length;

  const handleStart = () => {
    const res = startGame();
    if (!res.ok) {
      setError(res.reason ?? 'لا يمكن البدء');
      playSound('error');
      return;
    }
    playSound('start');
    router.push('/game');
  };

  const copyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="h-dvh bg-[radial-gradient(ellipse_at_bottom,_#2d1414_0%,_#160709_100%)] overflow-hidden flex flex-col items-center justify-center p-8">
      {/* Big background counters */}
      <div className="fixed inset-0 flex justify-between items-start px-24 pt-16 pointer-events-none z-0" aria-hidden>
        <div className="font-orbitron text-[14vw] font-black text-[#b64f43]/20 leading-none text-center">
          {mafiaInDeck}
          <span className="block text-2xl font-changa tracking-[0.5em] opacity-60">مافيا</span>
        </div>
        <div className="font-orbitron text-[14vw] font-black text-[#7f95a1]/20 leading-none text-center">
          {Math.max(0, players.length - mafiaInDeck)}
          <span className="block text-2xl font-changa tracking-[0.5em] opacity-60">آخرون</span>
        </div>
      </div>

      {/* Top HUD */}
      <div className="fixed top-0 left-0 right-0 p-8 flex justify-between items-start z-[100] pointer-events-none">
        <div className="flex flex-col gap-4 pointer-events-auto">
          <button
            onClick={() => {
              leaveRoom();
              router.push('/');
            }}
            className="bg-black/60 border-2 border-[#b64f434d] px-8 py-3 rounded-xl text-[#b64f43] font-changa font-black hover:bg-[#b64f43] hover:text-white transition-all flex items-center gap-3 backdrop-blur-md"
          >
            <LogOut className="w-5 h-5" />
            مغادرة الغرفة
          </button>
          <div className="bg-black/60 border border-white/10 px-6 py-2 rounded-full flex items-center gap-3 backdrop-blur-md">
            <Users className="w-4 h-4 text-green-500" />
            <span className="font-changa text-white/60 text-sm font-bold">
              اللاعبون: <span className="text-white font-black font-orbitron">{players.length} / {MAX_PLAYERS}</span>
            </span>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bg-black/80 border-2 border-[#cfb06f] p-4 px-10 rounded-3xl backdrop-blur-xl shadow-2xl pointer-events-auto text-center">
          <p className="text-[11px] text-[#cfb06f99] font-black tracking-[0.3em] mb-1">غرفة محلية</p>
          <h2 className="font-orbitron text-4xl font-black text-[#cfb06f]" dir="ltr">{roomCode}</h2>
          <button onClick={copyCode} className="mt-2 text-[11px] text-[#cfb06f] font-black flex items-center gap-2 mx-auto">
            <Copy className="w-3 h-3" />
            {copied ? 'تم النسخ ✓' : 'نسخ الرمز'}
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="relative w-full h-[60vh] z-10 flex items-center justify-center" style={{ perspective: 2500, transformStyle: 'preserve-3d' }}>
        <AnimatePresence>
          {players.map((player, index) => {
            const pos = arcLayout(index, players.length, { lift: player.id === myId ? -20 : 0 });
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, z: -1000, rotateY: 90 }}
                animate={{ opacity: 1, x: pos.x, z: pos.z, rotateY: -pos.rotY, rotateZ: pos.rotZ, y: pos.y }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 60, damping: 15, delay: index * 0.05 }}
                className="absolute group"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Card
                  className={cn('w-44 h-64', player.id === myId && 'ring-4 ring-[#cfb06f] ring-offset-8 ring-offset-transparent rounded-2xl')}
                  isFlipped={player.isReady}
                  backImage={CARD_COVERS[index % CARD_COVERS.length]}
                  onClick={() => player.id === myId && toggleReady(player.id)}
                  backContent={
                    <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center bg-black/40">
                      <div className="flex flex-col items-center bg-black/75 border border-[#cfb06f]/30 rounded-xl px-4 py-2">
                        <span className="text-4xl">{player.avatar}</span>
                        <h3 className="font-changa text-xl font-black text-white">{player.name}</h3>
                      </div>
                      <div className="mt-4 px-4 py-1 bg-white/20 border border-white/40 rounded-full text-[11px] text-white font-black">
                        {player.id === myId ? 'اضغط للجاهزية' : 'غير جاهز'}
                      </div>
                    </div>
                  }
                  frontContent={
                    <div className="relative h-full w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/cards/citizen.png" className="absolute inset-0 w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      <div className="absolute top-4 left-4 flex gap-2">
                        {player.isBot && (
                          <div className="bg-black/60 p-2 rounded-lg border border-[#7f95a14d] text-[#7f95a1]" title="بوت">
                            <Cpu className="w-4 h-4" />
                          </div>
                        )}
                        {player.isHost && (
                          <div className="bg-black/60 p-2 rounded-lg border border-[#cfb06f4d] text-[#cfb06f]" title="المضيف">
                            <Crown className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center">
                        <div className="px-4 py-1 bg-[#cfb06f] text-black font-black font-changa text-xs rounded-full mb-2">جاهز ✓</div>
                        <h3 className="font-changa text-xl font-black text-white">
                          {player.avatar} {player.name}
                        </h3>
                      </div>
                    </div>
                  }
                />
                {player.id !== myId && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      removePlayer(player.id);
                    }}
                    aria-label={`طرد ${player.name}`}
                    className="absolute -top-4 -right-4 w-10 h-10 bg-[#b64f43] rounded-full flex items-center justify-center text-white border-2 border-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all shadow-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Floating toggles */}
      <button
        onClick={() => setShowChat(v => !v)}
        aria-label="الدردشة"
        className="fixed bottom-12 left-12 w-16 h-16 rounded-full bg-black/80 border-2 border-[#7f95a1] flex items-center justify-center text-[#7f95a1] z-[110] hover:scale-110 transition-transform"
      >
        <MessageSquare className="w-8 h-8" />
      </button>
      <button
        onClick={() => setShowSettings(v => !v)}
        aria-label="إعدادات الغرفة"
        className="fixed bottom-12 right-12 w-16 h-16 rounded-full bg-black/80 border-2 border-[#cfb06f] flex items-center justify-center text-[#cfb06f] z-[110] hover:scale-110 transition-transform"
      >
        <Settings className="w-8 h-8" />
      </button>

      <ChatPanel open={showChat} onClose={() => setShowChat(false)} side="left" />

      <AnimatePresence>
        {showSettings && (
          <motion.aside
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            className="fixed top-0 bottom-0 right-0 w-full max-w-[450px] bg-black/90 border-l-2 border-[#cfb06f4d] backdrop-blur-2xl z-[450] flex flex-col"
          >
            <div className="p-8 flex-1 overflow-y-auto">
              <h2 className="font-changa text-3xl font-black text-[#cfb06f] mb-6">إعدادات المضيف</h2>
              <div className="flex gap-3 mb-8">
                {(['settings', 'roles', 'bots'] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn('flex-1 py-3 rounded-xl font-changa font-black text-sm transition-all', tab === t ? 'bg-[#cfb06f] text-black' : 'bg-white/5 text-white/40 hover:bg-white/10')}
                  >
                    {t === 'settings' ? 'الإعدادات' : t === 'roles' ? 'الأدوار' : 'البوتات'}
                  </button>
                ))}
              </div>

              {tab === 'settings' && (
                <div className="space-y-6">
                  <section className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                    <h3 className="text-sm text-[#cfb06f] font-black flex items-center gap-2">
                      <Timer className="w-4 h-4" /> التوقيت
                    </h3>
                    {TIMINGS.map(item => (
                      <label key={item.key} className="flex flex-col gap-2">
                        <div className="flex justify-between text-sm font-bold text-white/50">
                          <span>{item.label}</span>
                          <span className="text-[#cfb06f] font-orbitron">{settings[item.key]}s</span>
                        </div>
                        <input
                          type="range"
                          min={item.min}
                          max={item.max}
                          step={item.step}
                          value={settings[item.key]}
                          onChange={e => updateSettings({ [item.key]: Number(e.target.value) } as Partial<GameSettings>)}
                          className="w-full accent-[#cfb06f]"
                        />
                      </label>
                    ))}
                  </section>

                  <section className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                    <h3 className="text-sm text-[#cfb06f] font-black flex items-center gap-2">
                      <Zap className="w-4 h-4" /> القواعد
                    </h3>
                    <Toggle label="تصويت سري" checked={settings.secretVoting} onChange={v => updateSettings({ secretVoting: v })} />
                    <Toggle label="كشف دور اللاعب عند موته" checked={settings.revealRolesOnDeath} onChange={v => updateSettings({ revealRolesOnDeath: v })} />
                  </section>
                </div>
              )}

              {tab === 'roles' && (
                <div className="space-y-6">
                  <section className="bg-white/5 p-6 rounded-3xl border border-white/5">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-black text-white/70">عدد المافيا</span>
                      <span className="font-orbitron text-2xl text-[#b64f43] font-black">{settings.mafiaCount}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={maxMafiaFor(Math.max(players.length, 3))}
                      value={settings.mafiaCount}
                      onChange={e => updateSettings({ mafiaCount: Number(e.target.value) })}
                      className="w-full accent-[#b64f43]"
                    />
                    <p className="text-xs text-white/30 mt-2">الحد الأقصى ثلث عدد اللاعبين.</p>
                  </section>
                  <div className="grid grid-cols-2 gap-4">
                    {OPTIONAL_ROLES.map(role => {
                      const info = ROLE_INFO[role];
                      const enabled = settings.roles[role];
                      const tooFew = players.length < info.minPlayers;
                      return (
                        <button
                          key={role}
                          onClick={() => updateSettings({ roles: { ...settings.roles, [role]: !enabled } })}
                          className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center',
                            enabled ? 'bg-[#cfb06f1a] border-[#cfb06f] text-[#cfb06f]' : 'bg-black/60 border-white/5 text-white/30'
                          )}
                        >
                          <span className="text-3xl">{info.icon}</span>
                          <span className="font-black">{info.name}</span>
                          <span className="text-[11px] leading-snug opacity-70">{info.description}</span>
                          {enabled && tooFew && <span className="text-[11px] text-orange-400">يحتاج {info.minPlayers} لاعبين+</span>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-white/40">
                    التوزيع الحالي: {deck.map(r => ROLE_INFO[r].icon).join(' ')}
                  </p>
                </div>
              )}

              {tab === 'bots' && (
                <div className="space-y-4">
                  <GothicButton onClick={addBot} disabled={players.length >= MAX_PLAYERS} className="w-full py-4 text-lg">
                    <span className="flex items-center justify-center gap-3">
                      <Cpu className="w-5 h-5" />
                      إضافة بوت
                    </span>
                  </GothicButton>
                  {players
                    .filter(p => p.isBot)
                    .map(bot => (
                      <div key={bot.id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex justify-between items-center">
                        <span className="flex items-center gap-3 text-white font-bold">
                          <span className="text-xl">{bot.avatar}</span>
                          {bot.name}
                        </span>
                        <button onClick={() => removePlayer(bot.id)} aria-label={`حذف ${bot.name}`} className="text-red-500 hover:text-white">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="p-8 border-t border-white/5">
              <GothicButton onClick={() => setShowSettings(false)} className="w-full py-4 text-xl">
                إغلاق
              </GothicButton>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <div className="fixed bottom-12 flex flex-col items-center gap-4 z-50">
        <div className="bg-black/80 border-2 border-white/10 px-8 py-3 rounded-full flex items-center gap-6 backdrop-blur-xl">
          <span className="text-white/50 text-sm font-black">الجاهزية</span>
          <span className="font-orbitron text-2xl font-black text-[#cfb06f]">
            {players.filter(p => p.isReady).length} <span className="text-white/20 text-sm">/</span> {players.length}
          </span>
          {!startCheck.ok && <span className="text-xs text-red-400 font-bold">{startCheck.reason}</span>}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-6">
          <GothicButton variant={me?.isReady ? 'secondary' : 'primary'} onClick={() => me && toggleReady(me.id)} className="px-16 py-5 text-2xl">
            {me?.isReady ? 'إلغاء الجاهزية' : 'أنا جاهز'}
          </GothicButton>
          <GothicButton
            onClick={handleStart}
            disabled={!startCheck.ok}
            className="px-16 py-5 text-2xl border-[#cfb06f] bg-[#cfb06f] text-black hover:bg-white"
          >
            بدء اللعبة 🔥
          </GothicButton>
        </div>
        <Link href="/rules" className="text-xs text-white/40 hover:text-white underline">
          كيف ألعب؟
        </Link>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="w-full flex items-center justify-between group">
      <span className="text-white/60 font-changa group-hover:text-white transition-colors">{label}</span>
      <span className={cn('w-12 h-6 rounded-full relative transition-colors', checked ? 'bg-[#cfb06f]' : 'bg-white/10')}>
        <motion.span animate={{ x: checked ? -24 : -4 }} className="absolute top-1 right-0 w-4 h-4 bg-white rounded-full shadow-lg" />
      </span>
    </button>
  );
}
