'use client';

import { useGameStore, Player } from '@/store/useGameStore';
import { useVoiceSocket } from '@/hooks/useVoiceSocket';
import Card from '@/components/game/Card';
import PhaseBadge from '@/components/game/PhaseBadge';
import GothicButton from '@/components/ui/GothicButton';
import Chat from '@/components/shared/Chat';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import {
  Shield, Crosshair, Eye, MessageSquare, Timer,
  Skull, Zap, Mic2, AlertTriangle, CheckCircle2,
  X, Target, Swords, User, EyeOff, Trophy, RotateCcw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSound } from '@/hooks/useSound';

export default function GamePage() {
  const {
    players, currentPhase, dayCount, myId,
    logs, currentSpeakerId, votes, settings,
    addLog, setPhase, setSpeaker, castVote
  } = useGameStore();

  const { isConnected, isRecording, lastResponse, startRecording, stopRecording } = useVoiceSocket();

  const deadCount = players.filter(p => !p.isAlive).length;
  const darknessLevel = Math.min(deadCount * 0.15, 0.7);

  const [timeLeft, setTimeLeft] = useState(10);
  const [isEyesClosed, setIsEyesClosed] = useState(false);
  const [showTurnAnnounce, setShowTurnAnnounce] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [targetingMode, setTargetingMode] = useState<'vote' | 'ability' | null>(null);

  const me = players.find(p => p.id === myId);
  const router = useRouter();

  // Ensure game data exists
  useEffect(() => {
    // Only initialize mock data if absolutely necessary (e.g., direct page load in dev)
    if (players.length === 0) {
      const mockId = 'player-1';
      useGameStore.getState().setMyId(mockId);
      useGameStore.getState().setPlayers([
        { id: mockId, name: 'أنت (المافيا)', isAlive: true, isReady: true, voteCount: 0, avatar: '🎭', role: 'mafia', cardArt: '/cards/mafia.png' },
        { id: 'player-2', name: 'العميل 007', isAlive: true, isReady: true, voteCount: 0, avatar: '🕵️', role: 'citizen', cardArt: '/cards/citizen.png' },
        { id: 'player-3', name: 'لص الليل', isAlive: true, isReady: true, voteCount: 0, avatar: '🥷', role: 'mafia', cardArt: '/cards/mafia.png' },
        { id: 'player-4', name: 'الشبح', isAlive: true, isReady: true, voteCount: 0, avatar: '👻', role: 'citizen', cardArt: '/cards/citizen.png' },
        { id: 'bot-1', name: 'بوت 1', isAlive: true, isReady: true, isBot: true, voteCount: 0, avatar: '🤖', role: 'citizen', cardArt: '/cards/citizen.png' },
      ]);
      useGameStore.getState().setPhase('reveal');
      addLog('🚀 تم بدء محاكاة اللعبة لعدم وجود بيانات سابقة.', 'special');
    }
  }, [players]);

  const [bulletHoles, setBulletHoles] = useState<{ x: number, y: number, id: number }[]>([]);
  const [screenFlash, setScreenFlash] = useState(false);
  const { playSound } = useSound();

  const triggerKillFX = () => {
    playSound('kill');
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 100);

    // Add random bullet holes around the center
    const newHoles = Array.from({ length: 3 }).map(() => ({
      x: Math.random() * 80 + 10, // 10% to 90%
      y: Math.random() * 80 + 10,
      id: Math.random()
    }));
    setBulletHoles(prev => [...prev, ...newHoles].slice(-20));
  };

  // Watch for deaths to trigger FX
  const prevAliveCount = useRef(players.filter(p => p.isAlive).length);
  useEffect(() => {
    const currentAlive = players.filter(p => p.isAlive).length;
    if (currentAlive < prevAliveCount.current && currentPhase !== 'lobby') {
      triggerKillFX();
    }
    prevAliveCount.current = currentAlive;
  }, [players, currentPhase]);

  // Phase Progression logic
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      if (currentPhase === 'testimony') {
        setTestimonyIndex(prev => prev + 1);
      } else {
        useGameStore.getState().startNextPhase();
      }
    }
  }, [timeLeft]);

  // Bot Simulation Logic (Talking & Voting)
  useEffect(() => {
    if (currentPhase === 'day' || currentPhase === 'voting') {
      const botInterval = setInterval(() => {
        const bots = players.filter(p => p.isBot && p.isAlive);
        if (bots.length === 0) return;

        const randomBot = bots[Math.floor(Math.random() * bots.length)];

        if (currentPhase === 'day' && Math.random() > 0.7) {
          const messages = [
            "أعتقد أن اللاعب 2 مشبوه...",
            "لماذا يلتزم الجميع الصمت؟",
            "أنا مواطن بريء، صدقوني!",
            "المحقق، هل كشفت أحداً؟"
          ];
          addLog(`${randomBot.name}: ${messages[Math.floor(Math.random() * messages.length)]}`, 'info');
        }

        if (currentPhase === 'voting' && Math.random() > 0.8) {
          const alivePlayers = players.filter(p => p.isAlive && p.id !== randomBot.id);
          const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
          castVote(randomBot.id, target.id);
        }
      }, 5000);
      return () => clearInterval(botInterval);
    }
  }, [currentPhase, players]);

  // Phase Transition logic (Eyelids)
  useEffect(() => {
    if (currentPhase === 'night') {
      setIsEyesClosed(true);
      setTimeout(() => setIsEyesClosed(false), 2000);
    }
  }, [currentPhase]);

  // Speaker logic (Simulated for demo)
  useEffect(() => {
    if (currentPhase === 'day' && !currentSpeakerId && players.length > 0) {
      const firstAlive = players.find(p => p.isAlive);
      if (firstAlive) {
        setSpeaker(firstAlive.id);
        setShowTurnAnnounce(true);
        setTimeout(() => setShowTurnAnnounce(false), 3000);
      }
    }
  }, [currentPhase, players]);


  const handleAction = (targetId: string) => {
    if (!targetingMode) return;

    const target = players.find(p => p.id === targetId);
    if (!target) return;

    if (targetingMode === 'vote' || (targetingMode === 'ability' && me?.role === 'mafia')) {
      castVote(myId!, targetId);
      addLog(`🗳️ تم اختيار [${target.name}]`, 'danger');
    } else {
      addLog(`✅ استخدمت قدرتك على [${target.name}]`, 'special');
    }
    setTargetingMode(null);
  };

  const activeSpeaker = players.find(p => p.id === currentSpeakerId);

  const [testimonyIndex, setTestimonyIndex] = useState(0);

  // Testimony Speaker Rotation
  useEffect(() => {
    if (currentPhase === 'testimony') {
      const alivePlayers = players.filter(p => p.isAlive);
      if (testimonyIndex < alivePlayers.length) {
        setSpeaker(alivePlayers[testimonyIndex].id);
        setTimeLeft(15); // Each player gets 15s
        setShowTurnAnnounce(true);
        setTimeout(() => setShowTurnAnnounce(false), 3000);
      } else {
        useGameStore.getState().startNextPhase();
      }
    } else {
      setTestimonyIndex(0);
    }
  }, [currentPhase, testimonyIndex]);

  useEffect(() => {
    if (currentPhase === 'lobby') setTimeLeft(5);
    else if (currentPhase === 'reveal') setTimeLeft(10);
    else if (currentPhase === 'testimony') { /* Handled by speaker rotation */ }
    else if (currentPhase === 'day') setTimeLeft(settings.discussionDuration || 120);
    else if (currentPhase === 'night') setTimeLeft(settings.nightDuration || 15);
    else if (currentPhase === 'reaction') setTimeLeft(30);
    else if (currentPhase === 'voting') setTimeLeft(settings.voteDuration || 20);
  }, [currentPhase, settings]);

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-1000 flex flex-col overflow-hidden perspective-2000",
      currentPhase === 'night' ? "bg-[#0a0305]" : "bg-[radial-gradient(ellipse_at_bottom,_#2d1414_0%,_#160709_100%)]"
    )}>

      {/* 💥 COMBAT EFFECTS LAYER */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[200] pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none z-[190]">
        {bulletHoles.map(hole => (
          <motion.div
            key={hole.id}
            initial={{ scale: 3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute w-12 h-12 z-10"
            style={{ left: `${hole.x}%`, top: `${hole.y}%` }}
          >
            {/* Realistic Bullet Hole CSS */}
            <div className="absolute inset-0 bg-black rounded-full scale-[0.3] shadow-[0_0_10px_rgba(0,0,0,0.8)]" />
            <div className="absolute inset-0 border-[3px] border-gray-700/30 rounded-full scale-50" />
            <div className="absolute inset-0 border border-gray-500/20 rounded-full scale-75 rotate-45" />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-red-900/10 to-transparent rounded-full" />
          </motion.div>
        ))}
      </div>

      {/* 🌑 EYES CLOSED OVERLAY (Phase Logic) */}
      <AnimatePresence>
        {currentPhase === 'night' && me?.role !== 'mafia' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[400] flex flex-col items-center justify-center text-center p-10"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <EyeOff className="w-32 h-32 text-white/10 mb-8" />
            </motion.div>
            <h2 className="font-changa text-4xl font-black text-white/40 tracking-widest mb-4">أغمض عينيك</h2>
            <p className="font-changa text-white/20 text-xl">المافيا يتحركون الآن في الظلال...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. CRT & VIGNETTE OVERLAY */}
      <div className="fixed inset-0 pointer-events-none z-[200] opacity-30 mix-blend-overlay bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />

      {/* DYNAMIC ROOM DARKNESS BASED ON DEATHS */}
      <div
        className="fixed inset-0 pointer-events-none z-[190] transition-all duration-1000"
        style={{
          boxShadow: `inset 0 0 ${150 + (deadCount * 20)}px rgba(0,0,0, ${0.5 + darknessLevel})`,
          backgroundColor: `rgba(15, 5, 5, ${darknessLevel * 0.5})` // حمرة خفيفة جداً تزيد مع القتلى
        }}
      />

      {/* 💀 DEAD PLAYER VIBE OVERLAY */}
      {me && !me.isAlive && (
        <div className="fixed inset-0 pointer-events-none z-[195] shadow-[inset_0_0_150px_rgba(153,27,27,0.3)] backdrop-grayscale-[0.8] bg-[#0a1118]/30 mix-blend-overlay" />
      )}

      {/* 2. EYELIDS EFFECT */}
      <motion.div
        animate={{ y: isEyesClosed ? 0 : '-100%' }}
        className="fixed top-0 left-0 right-0 h-1/2 bg-[#020005] z-[300] border-b-2 border-white/5 rounded-b-[100px]"
      />
      <motion.div
        animate={{ y: isEyesClosed ? 0 : '100%' }}
        className="fixed bottom-0 left-0 right-0 h-1/2 bg-[#020005] z-[300] border-t-2 border-white/5 rounded-t-[100px]"
      />

      {/* 3. TURN ANNOUNCEMENT OVERLAY */}
      <AnimatePresence>
        {showTurnAnnounce && activeSpeaker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 z-[250] flex flex-col items-center justify-center bg-black/80 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ rotate: -20, y: 50 }}
              animate={{ rotate: 0, y: 0 }}
              className="text-[#cfb06f] mb-8"
            >
              <Mic2 className="w-32 h-32 drop-shadow-[0_0_30px_rgba(207,176,111,0.6)]" />
            </motion.div>
            <p className="font-changa text-xl text-white/40 uppercase tracking-[0.4em] mb-2">
              {activeSpeaker.id === myId ? 'إنتباه! دورك الآن' : 'دور اللاعب'}
            </p>
            <h2 className="font-changa text-7xl font-black text-white text-center">
              {activeSpeaker.name}
            </h2>
            <p className="mt-8 font-orbitron text-sm text-[#cfb06f] tracking-widest">PROCEED WITH CAUTION</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. SPEAKER INDICATOR (Top) */}
      <AnimatePresence>
        {activeSpeaker && !showTurnAnnounce && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] bg-[#cfb06f]/10 border-2 border-[#cfb06f] px-10 py-3 rounded-full backdrop-blur-xl flex items-center gap-4"
          >
            <div className="w-3 h-3 bg-[#cfb06f] rounded-full animate-ping" />
            <span className="font-changa font-black text-[#cfb06f] text-lg italic">يتحدث الآن: {activeSpeaker.name}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. TOP HUD */}
      <div className="p-8 flex justify-between items-start z-[100] relative">
        <div className="flex flex-col gap-4">
          <PhaseBadge phase={currentPhase} />
          <div className="bg-black/60 border border-white/10 px-6 py-2 rounded-full backdrop-blur-xl shadow-2xl">
            <span className="font-orbitron text-sm text-[#cfb06f] font-black tracking-[0.2em]">DAY_{dayCount.toString().padStart(2, '0')}</span>
          </div>
        </div>

        <div className="flex flex-col items-center bg-black/60 p-6 rounded-[32px] border-2 border-[#cfb06f]/20 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-4 mb-1">
            {/* AI Core Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/5">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-[8px] font-orbitron text-white/40 uppercase">AI_CORE_{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            <Timer className="w-6 h-6 text-[#cfb06f] animate-pulse" />
            <div className="font-orbitron text-5xl font-black text-[#cfb06f] tabular-nums">
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
          </div>
          <p className="text-[10px] text-[#cfb06f]/40 font-bold uppercase tracking-[0.5em]">SYSTEM_STABILITY_OK</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-black/60 border border-white/10 p-5 rounded-3xl flex flex-col items-end backdrop-blur-md">
            <p className="text-[10px] text-white/20 font-black uppercase mb-1 flex items-center gap-2">ALIVE <User className="w-3 h-3" /></p>
            <p className="font-orbitron text-3xl font-black text-white">{players.filter(p => p.isAlive).length}</p>
          </div>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="bg-red-950/40 border-2 border-red-900/50 p-5 rounded-3xl flex items-center justify-center text-red-500 hover:bg-red-600 hover:text-white transition-all backdrop-blur-md shadow-lg"
          >
            <AlertTriangle className="w-8 h-8" />
          </button>
        </div>
      </div>

      {/* 6. 3D ARENA */}
      <div className="flex-1 relative transform-style-3d mt-20">
        <div className="absolute inset-0 flex items-center justify-center transform-style-3d">
          <AnimatePresence>
            {players.filter(p => p.id !== myId && p.isAlive).map((player, index) => {
              const others = players.filter(p => p.id !== myId && p.isAlive);
              const total = others.length;

              // --- Synchronized 3D Arena Logic (from Lobby) ---
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
              const finalY = startY + (rowIndex * rowHeight) + (activeSpeaker?.id === player.id ? -60 : 0);
              // --- End of Logic ---

              const isTargeted = Object.values(votes).includes(player.id);
              const isTeammate = me?.role === 'mafia' && player.role === 'mafia';
              const showIdentity = isTeammate && currentPhase === 'night';

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
              const backImage = cardCovers[index % cardCovers.length];

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.5, y: -500 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x,
                    z,
                    rotateY: rotY,
                    rotateZ: rotZ,
                    y: finalY
                  }}
                  whileHover={targetingMode ? { scale: 1.1, z: 100 } : {}}
                  onClick={() => handleAction(player.id)}
                  className={cn(
                    "absolute transform-style-3d cursor-pointer group transition-all",
                    isTargeted && (me?.role === 'mafia' || currentPhase !== 'night') && "ring-4 ring-red-600 ring-offset-4 ring-offset-transparent rounded-2xl",
                    showIdentity && "shadow-[0_0_50px_rgba(220,38,38,0.6)] ring-2 ring-red-500 rounded-2xl",
                    targetingMode && "hover:brightness-125"
                  )}
                >
                  <Card
                    className={cn(
                      "w-44 h-64 transition-all duration-500",
                      activeSpeaker?.id === player.id && "ring-4 ring-[#cfb06f] ring-offset-4 ring-offset-transparent shadow-[0_0_50px_rgba(207,176,111,0.5)]",
                      isTargeted && (me?.role === 'mafia' || currentPhase !== 'night') && "ring-4 ring-red-600"
                    )}
                    isFlipped={!player.isAlive || showIdentity}
                    backImage={backImage}
                    backContent={
                      <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center">
                        {/* 🗳️ CLEAR VOTE INDICATORS */}
                        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-2 w-max max-w-[200px]">
                          {Object.entries(votes)
                            .filter(([_, tid]) => tid === player.id)
                            .map(([vid]) => {
                              const voter = players.find(p => p.id === vid);
                              return (
                                <motion.div
                                  key={vid}
                                  initial={{ scale: 0, y: 10 }}
                                  animate={{ scale: 1, y: 0 }}
                                  className="flex items-center gap-2 bg-black/80 border border-[#cfb06f]/40 px-3 py-1 rounded-full shadow-lg backdrop-blur-md"
                                >
                                  <span className="text-sm">{voter?.avatar}</span>
                                  <span className="text-[10px] font-changa font-bold text-[#cfb06f] whitespace-nowrap">{voter?.name}</span>
                                </motion.div>
                              );
                            })}
                        </div>

                        <div className="text-4xl mb-4 grayscale opacity-50">{player.avatar}</div>
                        <h3 className="font-changa text-xl font-black text-white/80">{player.name}</h3>

                        {targetingMode && (
                          <div className="mt-4 animate-bounce">
                            <Crosshair className={cn("w-10 h-10", targetingMode === 'vote' ? "text-red-500" : "text-[#cfb06f]")} />
                          </div>
                        )}
                      </div>
                    }
                    frontContent={
                      <div className="relative h-full w-full overflow-hidden">
                        <img
                          src={player.cardArt || '/cards/citizen.png'}
                          className="absolute inset-0 w-full h-full object-cover"
                          alt=""
                        />
                        <div className={cn("absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent", !player.isAlive && "bg-red-950/60")} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          {(!player.isAlive || showIdentity) && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <Skull className={cn("w-20 h-20", !player.isAlive ? "text-gray-400" : "text-red-600")} />
                            </motion.div>
                          )}
                          {showIdentity && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.8)]"
                            >
                              MAFIA TEAMMATE
                            </motion.span>
                          )}
                          {!player.isAlive && <span className="text-white/40 font-changa font-black text-xl uppercase tracking-widest mt-2">ELIMINATED</span>}
                        </div>

                      </div>
                    }
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* 7. GAME LOGS (Retro Terminal) */}
      <div className="fixed bottom-32 right-8 w-80 h-auto max-h-64 z-[100] flex flex-col overflow-hidden pointer-events-none bg-[#050505]/95 border border-[#cfb06f]/40 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-md">
        {/* Terminal Header */}
        <div className="bg-[#cfb06f]/10 border-b border-[#cfb06f]/30 p-2 flex justify-between items-center px-3">
          <span className="text-[10px] text-[#cfb06f] font-orbitron font-black tracking-widest uppercase">SYSTEM_LOGS</span>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500 opacity-50"></div>
            <div className="w-2 h-2 rounded-full bg-green-500 opacity-50"></div>
          </div>
        </div>

        {/* Logs Container */}
        <div className="flex flex-col-reverse gap-3 p-4 overflow-hidden">
          <AnimatePresence mode="popLayout">
            {[...logs].reverse().slice(0, 6).map((log, i) => (
              <motion.div
                key={`${logs.length - i}-${log.text}`}
                initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "font-changa text-xs tracking-wider flex items-start gap-2",
                  log.type === 'danger' ? "text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" :
                    log.type === 'special' ? "text-[#cfb06f] drop-shadow-[0_0_5px_rgba(207,176,111,0.5)]" :
                      "text-[#7f95a1]"
                )}
              >
                <span className="text-[10px] mt-0.5 opacity-50 font-orbitron">{'>'}</span>
                <span className="leading-relaxed">{log.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* 8. MY ZONE (Bottom HUD) */}
      <div className="p-8 flex justify-between items-end gap-12 relative z-[150]">

        {/* Chat Toggle */}
        <div className="w-16 h-16 rounded-full bg-black/80 border-2 border-[#7f95a1] flex items-center justify-center text-[#7f95a1] shadow-2xl hover:scale-110 transition-transform cursor-pointer">
          <MessageSquare className="w-8 h-8" />
        </div>

        {/* Action Controls */}
        <div className="flex-1 max-w-2xl bg-black/90 border-2 border-[#cfb06f4d] rounded-[40px] p-8 backdrop-blur-3xl shadow-[0_-20px_100px_rgba(0,0,0,0.8)] flex flex-col items-center">
          <AnimatePresence mode="wait">
            {targetingMode ? (
              <motion.div
                key="targeting"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 w-full"
              >
                <p className="text-[#cfb06f] font-changa font-black text-xl animate-pulse flex items-center gap-3">
                  <Target className="w-6 h-6" />
                  {targetingMode === 'vote' ? 'اختر لاعباً للتصويت عليه' : 'اختر لاعباً لتنفيذ القدرة عليه'}
                </p>
                <GothicButton onClick={() => setTargetingMode(null)} variant="secondary" className="px-12 py-3 border-red-900 text-red-500">إلغاء التصويب</GothicButton>
              </motion.div>
            ) : (
              <>
                {/* AI Response Overlay */}
                <AnimatePresence>
                  {lastResponse && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute -top-16 bg-[#cfb06f]/20 border border-[#cfb06f]/40 px-4 py-2 rounded-xl backdrop-blur-md z-50"
                    >
                      <p className="text-[#cfb06f] font-changa text-sm">🤖 {lastResponse}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  key="actions"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center gap-6 w-full"
                >
                  {/* Voice Push-to-Talk Button */}
                  <GothicButton
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording} // Failsafe if mouse leaves while held
                    className={cn(
                      "flex-1 py-5 text-xl transition-all duration-300",
                      isRecording
                        ? "bg-red-600 border-red-500 shadow-[0_0_40px_rgba(220,38,38,0.5)] scale-105"
                        : "bg-blue-900/20 border-blue-500/50 text-blue-400 hover:bg-blue-800/30"
                    )}
                  >
                    <div className="flex items-center justify-center gap-3">
                      {isRecording ? <div className="w-2 h-2 bg-white rounded-full animate-ping" /> : <Mic2 className="w-5 h-5" />}
                      <span>{isRecording ? 'اسمعك... (أفلت للإرسال)' : 'اضغط للتحدث'}</span>
                    </div>
                  </GothicButton>

                  <GothicButton
                    onClick={() => setTargetingMode('ability')}
                    disabled={currentPhase !== 'night' || (me?.role !== 'mafia')}
                    className="flex-1 py-5 text-xl bg-[#cfb06f] text-black border-[#cfb06f] shadow-[0_0_30px_rgba(207,176,111,0.3)] disabled:opacity-20"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Skull className="w-5 h-5" />
                      <span>{me?.role === 'mafia' ? 'تنفيذ القتل' : 'استخدام القدرة'}</span>
                    </div>
                  </GothicButton>

                  <GothicButton
                    onClick={() => setTargetingMode('vote')}
                    disabled={currentPhase !== 'voting'}
                    className="flex-1 py-5 text-xl bg-red-600 text-white border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)] disabled:opacity-20"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Swords className="w-5 h-5" />
                      <span>تصويت للطرد</span>
                    </div>
                  </GothicButton>

                  <GothicButton
                    variant="secondary"
                    className="px-8 border-white/10 text-white/40"
                    onClick={() => {
                      useGameStore.getState().clearVotes();
                      addLog('⏭️ تم اختيار التجاوز (Skip)', 'info');
                    }}
                  >
                    تجاوز (Skip)
                  </GothicButton>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* === THE CORRECTED 3D CMD CARD (UNFLIPPED & STABLE) === */}
        <div className="flex-none p-4 flex flex-col items-center transform-style-3d perspective-3000">
          <p className="text-[8px] text-[#cfb06f]/40 font-black uppercase tracking-[0.8em] mb-4 font-orbitron animate-pulse">
          </p>

          {/* Main 3D Wrapper (Moderate, stable perspective) */}
          <motion.div
            className="relative group cursor-pointer transform-style-3d"
            style={{ transformOrigin: 'bottom center' }}
            // Stable POV tilt (tilted back slightly, turned toward center, dropped down)
            // Reduced tilt from -45 to -25 to remove the "strange" feeling
            initial={{ rotateX: -25, rotateY: -10, scale: 1.0, z: -100, y: 30 }}
            animate={{ rotateX: -25, rotateY: -10, scale: 1.0, z: -100, y: 30 }}
            // Springs up to face the player when hovered
            whileHover={{ rotateX: -5, rotateY: -2, scale: 1.08, z: 0, y: 0 }}
            transition={{ type: 'spring', stiffness: 150, damping: 25 }}
          >
            {/* Real Card Component (Migrated and Corrected) */}
            <Card
              // REMOVED YELLOW RING. ADDED subtlety with border-white/5
              className={cn(
                "w-52 h-80 transition-all duration-700",
                "border-t-2 border-l-2 border-white/5", // Subtle edge highlight
                "shadow-[0_20px_100px_rgba(0,0,0,1)] hover:brightness-125"
              )}
              // CRITICAL FIX: isFlipped is now FALSE to show the IDENTITY FACE
              isFlipped={false}
              frontContent={
                <div className="relative h-full w-full overflow-hidden bg-[#0a0a0a]">
                  {/* The Background Art */}
                  <img
                    src={me?.cardArt || '/cards/citizen.png'}
                    className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700"
                    alt="Identity"
                  />

                  {/* Immersive Gradients for Depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-red-900/10 via-transparent to-white/5" />

                  {/* Identity Label */}
                  <div className="absolute bottom-0 left-0 right-0 p-8 text-center transform-style-3d">
                    <motion.h3
                      animate={{ textShadow: "0 0 30px rgba(207,176,111,0.5)" }}
                      className="font-orbitron text-3xl font-black text-[#cfb06f] italic tracking-tighter mb-2"
                    >
                      {me?.role?.toUpperCase() || 'UNKNOWN'}
                    </motion.h3>

                    <div className="inline-block px-4 py-1.5 bg-black/60 border border-[#cfb06f]/30 rounded-full text-[10px] text-[#cfb06f] font-black uppercase tracking-[0.3em] backdrop-blur-md">
                      {me?.role === 'mafia' ? 'SYNDICATE_OPERATIVE' : 'Neural_ALLIANCE'}
                    </div>
                  </div>
                </div>
              }
            />

            {/* Subtle table glow beneath the card */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#cfb06f]/10 rounded-full blur-xl z-0 pointer-events-none group-hover:bg-[#cfb06f]/20 transition-all duration-500" />
          </motion.div>
        </div>
        {/* === END OF THE 3D CMD SECTION === */}
      </div>

      {/* EXIT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#1a0709] border-2 border-red-600 p-12 rounded-[40px] max-w-md w-full text-center shadow-[0_0_100px_rgba(220,38,38,0.3)]"
            >
              <AlertTriangle className="w-20 h-20 text-red-600 mx-auto mb-6 animate-bounce" />
              <h2 className="font-changa text-3xl font-black text-white mb-4">هل أنت متأكد من المغادرة؟</h2>
              <p className="text-white/40 font-changa mb-10 leading-relaxed">ستفقد تقدمك في الجولة الحالية وسيتم استبعادك من الساحة فوراً.</p>

              <div className="flex flex-col gap-4">
                <GothicButton
                  onClick={() => router.push('/')}
                  className="w-full py-5 text-xl bg-red-600 border-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.3)]"
                >
                  نعم، مغادرة اللعبة
                </GothicButton>
                <GothicButton
                  onClick={() => setShowExitConfirm(false)}
                  variant="secondary"
                  className="w-full py-5 text-xl border-white/10 text-white/60"
                >
                  إلغاء والتراجع
                </GothicButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🏁 GAME OVER OVERLAY */}
      <AnimatePresence>
        {currentPhase === 'game-over' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[600] flex items-center justify-center bg-black/95 backdrop-blur-3xl overflow-hidden"
          >
            {/* Celebration Particles */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [-20, 1000],
                    x: [Math.random() * 1000 - 500, Math.random() * 1000 - 500],
                    rotate: 360
                  }}
                  transition={{ duration: Math.random() * 5 + 2, repeat: Infinity, ease: "linear" }}
                  className={cn(
                    "absolute w-2 h-2 rounded-full",
                    useGameStore.getState().winner === 'mafia' ? "bg-red-500" : "bg-yellow-500"
                  )}
                  style={{ left: `${Math.random() * 100}%`, top: `-20px` }}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className={cn(
                "relative z-10 text-center p-12 rounded-[60px] border-4 max-w-2xl w-full mx-6",
                useGameStore.getState().winner === 'mafia'
                  ? "bg-red-950/20 border-red-600 shadow-[0_0_100px_rgba(220,38,38,0.3)]"
                  : "bg-yellow-950/20 border-yellow-600 shadow-[0_0_100px_rgba(202,138,4,0.3)]"
              )}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-8 flex justify-center"
              >
                {useGameStore.getState().winner === 'mafia' ? (
                  <Skull className="w-40 h-40 text-red-600 drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]" />
                ) : (
                  <Trophy className="w-40 h-40 text-yellow-500 drop-shadow-[0_0_30px_rgba(202,138,4,0.5)]" />
                )}
              </motion.div>

              <h1 className="font-changa text-7xl font-black text-white mb-4 uppercase italic">
                {useGameStore.getState().winner === 'mafia' ? 'انتصار المافيا' : 'انتصار المواطنين'}
              </h1>

              <p className="font-changa text-2xl text-white/60 mb-12">
                {useGameStore.getState().winner === 'mafia'
                  ? "لقد تمت السيطرة على المدينة بالكامل وساد الظلام..."
                  : "تم تنظيف المدينة من قوى الشر وعاد الأمان للجميع."}
              </p>

              <div className="flex flex-col gap-4">
                <GothicButton
                  onClick={() => {
                    useGameStore.getState().resetGame();
                    router.push('/lobby');
                  }}
                  className={cn(
                    "w-full py-6 text-2xl gap-4",
                    useGameStore.getState().winner === 'mafia' ? "bg-red-600 border-red-600" : "bg-yellow-600 border-yellow-600"
                  )}
                >
                  <RotateCcw className="w-6 h-6" />
                  <span>العودة للوبي (إعادة اللعب)</span>
                </GothicButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
