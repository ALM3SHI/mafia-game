'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Crosshair, EyeOff, Home, MessageSquare, Mic2, RotateCcw, Search, Shield, Skull, Swords, Target, Timer, Trophy, User } from 'lucide-react';
import { useGameStore, currentTestimonySpeaker } from '@/store/useGameStore';
import { useVoiceSocket, type VoiceContext } from '@/hooks/useVoiceSocket';
import { playSound } from '@/hooks/useSound';
import Card from '@/components/game/Card';
import PhaseBadge from '@/components/game/PhaseBadge';
import GothicButton from '@/components/ui/GothicButton';
import ChatPanel from '@/components/shared/ChatPanel';
import { SKIP_VOTE, type Player } from '@/lib/game-types';
import { alive, canTargetAtNight, didPlayerWin, hasNightAction, pick } from '@/lib/game-logic';
import { ROLE_INFO, roleName } from '@/lib/roles';
import { arcLayout, CARD_COVERS } from '@/lib/layout';
import { cn } from '@/lib/utils';

const TALK_PHASES = new Set(['reaction', 'testimony', 'day']);

export default function GamePage() {
  const router = useRouter();
  const players = useGameStore(s => s.players);
  const phase = useGameStore(s => s.phase);
  const round = useGameStore(s => s.round);
  const myId = useGameStore(s => s.myId);
  const logs = useGameStore(s => s.logs);
  const votes = useGameStore(s => s.votes);
  const night = useGameStore(s => s.night);
  const settings = useGameStore(s => s.settings);
  const winner = useGameStore(s => s.winner);
  const phaseEndsAt = useGameStore(s => s.phaseEndsAt);
  const phaseStartedAt = useGameStore(s => s.phaseStartedAt);

  const [now, setNow] = useState(() => Date.now());
  const [targeting, setTargeting] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [eyesClosed, setEyesClosed] = useState(false);
  const [announceId, setAnnounceId] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const lastSpeakerRef = useRef<string | null>(null);

  const me = players.find(p => p.id === myId);
  const others = players.filter(p => p.id !== myId);
  const living = alive(players);
  const timeLeft = Math.max(0, Math.ceil((phaseEndsAt - now) / 1000));
  const speaker = currentTestimonySpeaker({ phase, players, phaseStartedAt, settings }, now);
  const iCanAct = !!me?.isAlive && ((phase === 'voting') || (phase === 'night' && hasNightAction(me)));

  // No game in progress → back to the lobby.
  useEffect(() => {
    if (players.length === 0 || phase === 'lobby') router.replace('/lobby');
  }, [players.length, phase, router]);

  // Master clock: advances phases, finishes voting early, announces speakers.
  useEffect(() => {
    const id = setInterval(() => {
      const s = useGameStore.getState();
      const t = Date.now();
      setNow(t);
      if (s.phase === 'lobby' || s.phase === 'game-over') return;

      const everyoneVoted = s.phase === 'voting' && alive(s.players).every(p => p.id in s.votes);
      if (t >= s.phaseEndsAt || (everyoneVoted && t - s.phaseStartedAt > 2500)) {
        s.advancePhase(s.phaseToken);
        return;
      }

      const sp = currentTestimonySpeaker(s, t);
      const spId = sp?.id ?? null;
      if (spId !== lastSpeakerRef.current) {
        lastSpeakerRef.current = spId;
        if (spId) {
          setAnnounceId(spId);
          setTimeout(() => setAnnounceId(cur => (cur === spId ? null : cur)), 2200);
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Bots chat / vote / follow the mafia lead.
  useEffect(() => {
    const id = setInterval(() => useGameStore.getState().botTick(), 1800);
    return () => clearInterval(id);
  }, []);

  // Phase / death side effects (sound, eyelids, flash) via store subscription.
  useEffect(() => {
    return useGameStore.subscribe((s, prev) => {
      if (s.phase !== prev.phase) {
        setTargeting(false);
        if (s.phase === 'night') {
          playSound('night-start', 0.4);
          setEyesClosed(true);
          setTimeout(() => setEyesClosed(false), 1600);
        } else if (s.phase === 'reaction') {
          playSound('day-start', 0.4);
        } else if (s.phase === 'game-over') {
          const meNow = s.players.find(p => p.id === s.myId);
          playSound(didPlayerWin(meNow, s.winner) ? 'win' : 'lose');
        }
      }
      if (alive(s.players).length < alive(prev.players).length) {
        playSound('kill');
        setFlash(true);
        setTimeout(() => setFlash(false), 120);
      }
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(cur => (cur === msg ? null : cur)), 3000);
  }, []);

  // ── Voice: the human talks, one living bot answers in character ──────────
  const buildContext = useCallback((): VoiceContext | null => {
    const s = useGameStore.getState();
    const human = s.players.find(p => p.id === s.myId);
    const livingBots = alive(s.players).filter(p => p.isBot);
    const sp = currentTestimonySpeaker(s, Date.now());
    const bot = sp?.isBot ? sp : pick(livingBots);
    if (!bot || !human) return null;
    return {
      speaker: {
        id: bot.id,
        name: bot.name,
        role: bot.role ? ROLE_INFO[bot.role].name : undefined,
        mafiaTeammates: bot.role === 'mafia' ? s.players.filter(p => p.role === 'mafia' && p.id !== bot.id).map(p => p.name) : [],
      },
      humanName: human.name,
      phase: s.phase,
      round: s.round,
      alivePlayers: alive(s.players).map(p => p.name),
      deadPlayers: s.players.filter(p => !p.isAlive).map(p => ({ name: p.name, role: s.settings.revealRolesOnDeath && p.role ? ROLE_INFO[p.role].name : undefined })),
    };
  }, []);

  const voice = useVoiceSocket({
    buildContext,
    onTranscript: text => {
      const s = useGameStore.getState();
      const human = s.players.find(p => p.id === s.myId);
      s.addLog(`${human?.name ?? 'أنت'}: ${text}`, 'chat');
    },
    onReply: (text, speakerId) => {
      const s = useGameStore.getState();
      const bot = s.players.find(p => p.id === speakerId);
      s.addLog(`${bot?.name ?? 'بوت'}: ${text}`, 'chat');
    },
    onError: showToast,
  });
  const canTalk = !!me?.isAlive && TALK_PHASES.has(phase);

  // ── Actions ──────────────────────────────────────────────────────────────
  const isValidTarget = (target: Player): boolean => {
    if (!me || !iCanAct) return false;
    if (phase === 'voting') return target.isAlive && target.id !== me.id;
    if (phase === 'night') return canTargetAtNight(me, target);
    return false;
  };

  const handleCardClick = (target: Player) => {
    if (!targeting || !me || !isValidTarget(target)) return;
    const s = useGameStore.getState();
    if (phase === 'voting') {
      s.castVote(me.id, target.id);
      playSound('vote');
      s.addLog(`🗳️ صوّتَّ ضد ${target.name}`, 'info');
    } else {
      s.submitNightAction(me.id, target.id);
      const verb = me.role === 'mafia' ? '🔪 اخترت قتل' : me.role === 'doctor' ? '💉 ستحمي' : '🔍 ستحقق في';
      s.addLog(`${verb} ${target.name}`, me.role === 'mafia' ? 'danger' : 'special');
    }
    setTargeting(false);
  };

  const myNightTarget = me?.role === 'mafia' ? night.mafiaVotes[me.id] : me?.role === 'doctor' ? night.doctorTarget : me?.role === 'detective' ? night.detectiveTarget : null;
  const myVote = me ? votes[me.id] : undefined;
  const actionLabel = me?.role === 'mafia' ? 'تنفيذ القتل' : me?.role === 'doctor' ? 'حماية لاعب' : me?.role === 'detective' ? 'التحقيق' : 'لا قدرة لك';
  const ActionIcon = me?.role === 'doctor' ? Shield : me?.role === 'detective' ? Search : Skull;

  const darkness = Math.min((players.length - living.length) * 0.12, 0.6);

  if (!me) return <div className="h-dvh bg-[#160709]" />;

  return (
    <div
      className={cn(
        'h-dvh transition-colors duration-1000 flex flex-col overflow-hidden relative',
        phase === 'night' ? 'bg-[#0a0305]' : 'bg-[radial-gradient(ellipse_at_bottom,_#2d1414_0%,_#160709_100%)]'
      )}
    >
      {/* Flash on death */}
      <AnimatePresence>{flash && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-white z-[480] pointer-events-none" />}</AnimatePresence>

      {/* Vignette that deepens with every death */}
      <div className="fixed inset-0 pointer-events-none z-[90] transition-all duration-1000" style={{ boxShadow: `inset 0 0 ${150 + darkness * 200}px rgba(0,0,0,${0.5 + darkness})` }} />
      {!me.isAlive && <div className="fixed inset-0 pointer-events-none z-[91] backdrop-grayscale bg-[#0a1118]/30" />}

      {/* Eyelids */}
      <motion.div animate={{ y: eyesClosed ? 0 : '-100%' }} className="fixed top-0 inset-x-0 h-1/2 bg-[#020005] z-[300] rounded-b-[100px]" />
      <motion.div animate={{ y: eyesClosed ? 0 : '100%' }} className="fixed bottom-0 inset-x-0 h-1/2 bg-[#020005] z-[300] rounded-t-[100px]" />

      {/* Night screen for players with nothing to do */}
      <AnimatePresence>
        {phase === 'night' && me.isAlive && !hasNightAction(me) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-[290] flex flex-col items-center justify-center text-center p-10">
            <EyeOff className="w-28 h-28 text-white/10 mb-8" />
            <h2 className="font-changa text-4xl font-black text-white/40 mb-4">أغمض عينيك</h2>
            <p className="font-changa text-white/20 text-xl">المافيا يتحركون في الظلال... ({timeLeft}s)</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role reveal */}
      <AnimatePresence>
        {phase === 'reveal' && me.role && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[295] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center gap-6 text-center p-8">
            <p className="text-white/40 text-xl font-changa">دورك في هذه اللعبة</p>
            <motion.div initial={{ rotateY: 180, scale: 0.6 }} animate={{ rotateY: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 80 }} className="text-8xl">
              {ROLE_INFO[me.role].icon}
            </motion.div>
            <h2 className={cn('font-changa text-6xl font-black', me.role === 'mafia' ? 'text-red-500' : 'text-[#cfb06f]')}>{ROLE_INFO[me.role].name}</h2>
            <p className="max-w-lg text-white/60 text-lg">{ROLE_INFO[me.role].description}</p>
            <p className="font-orbitron text-[#cfb06f]">{timeLeft}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turn announcement */}
      <AnimatePresence>
        {announceId && phase === 'testimony' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 z-[250] flex flex-col items-center justify-center bg-black/70 backdrop-blur-xl pointer-events-none"
          >
            <Mic2 className="w-24 h-24 text-[#cfb06f] mb-6" />
            <p className="font-changa text-xl text-white/50 mb-2">{announceId === myId ? 'انتباه! دورك الآن' : 'دور اللاعب'}</p>
            <h2 className="font-changa text-6xl font-black text-white">{players.find(p => p.id === announceId)?.name}</h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top HUD */}
      <header className="p-6 flex justify-between items-start z-[100] relative">
        <div className="flex flex-col gap-3">
          <PhaseBadge phase={phase} />
          <div className="bg-black/60 border border-white/10 px-5 py-1.5 rounded-full w-fit">
            <span className="font-changa text-sm text-[#cfb06f] font-black">الجولة {Math.max(round, 1)}</span>
          </div>
        </div>

        <div className="flex flex-col items-center bg-black/60 px-6 py-4 rounded-[28px] border-2 border-[#cfb06f]/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Timer className="w-6 h-6 text-[#cfb06f]" />
            <div className="font-orbitron text-5xl font-black text-[#cfb06f] tabular-nums" dir="ltr">
              {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2" title={voice.isConnected ? 'الخادم الصوتي متصل' : 'الخادم الصوتي غير متصل — اللعب يكمل بدون صوت'}>
            <span className={cn('w-2 h-2 rounded-full', voice.isConnected ? 'bg-green-500' : 'bg-red-500')} />
            <span className="text-[11px] text-white/40">{voice.isConnected ? 'الذكاء الصوتي متصل' : 'الذكاء الصوتي غير متصل'}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="bg-black/60 border border-white/10 px-5 py-3 rounded-3xl flex flex-col items-center">
            <span className="text-[11px] text-white/30 font-black flex items-center gap-1">
              <User className="w-3 h-3" /> أحياء
            </span>
            <span className="font-orbitron text-3xl font-black text-white">{living.length}</span>
          </div>
          <button onClick={() => setShowExit(true)} aria-label="مغادرة" className="bg-red-950/40 border-2 border-red-900/50 p-4 rounded-3xl text-red-500 hover:bg-red-600 hover:text-white transition-all">
            <AlertTriangle className="w-7 h-7" />
          </button>
        </div>
      </header>

      {/* Speaker pill */}
      {speaker && !announceId && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[150] bg-[#cfb06f]/10 border-2 border-[#cfb06f] px-8 py-2 rounded-full backdrop-blur-xl flex items-center gap-3">
          <span className="w-3 h-3 bg-[#cfb06f] rounded-full animate-ping" />
          <span className="font-changa font-black text-[#cfb06f]">يتحدث الآن: {speaker.name}</span>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 relative" style={{ perspective: 2000 }}>
        <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
          {others.map((player, index) => {
            const pos = arcLayout(index, others.length, { lift: speaker?.id === player.id ? -50 : 0 });
            const teammate = me.role === 'mafia' && player.role === 'mafia';
            const valid = targeting && isValidTarget(player);
            const votersForPlayer = Object.entries(votes).filter(([, t]) => t === player.id).map(([v]) => players.find(p => p.id === v));
            const showVoters = phase === 'voting' && (!settings.secretVoting ? votersForPlayer.length > 0 : myVote === player.id);
            const isMyNightPick = phase === 'night' && myNightTarget === player.id;
            const teamPick = phase === 'night' && me.role === 'mafia' && Object.values(night.mafiaVotes).includes(player.id);
            const reveal = !player.isAlive && settings.revealRolesOnDeath;

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.5, y: -400 }}
                animate={{ opacity: 1, scale: 1, x: pos.x, z: pos.z, rotateY: pos.rotY, rotateZ: pos.rotZ, y: pos.y }}
                whileHover={valid ? { scale: 1.08 } : undefined}
                className={cn('absolute', targeting && !valid && 'opacity-40')}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Card
                  className={cn(
                    'w-40 h-60 rounded-2xl',
                    speaker?.id === player.id && 'ring-4 ring-[#cfb06f] shadow-[0_0_50px_rgba(207,176,111,0.5)]',
                    (isMyNightPick || myVote === player.id) && 'ring-4 ring-red-600',
                    teamPick && !isMyNightPick && 'ring-2 ring-red-400/60',
                    teammate && 'shadow-[0_0_40px_rgba(220,38,38,0.5)]',
                    valid && 'cursor-crosshair'
                  )}
                  static={!valid}
                  isFlipped={!player.isAlive}
                  backImage={CARD_COVERS[index % CARD_COVERS.length]}
                  onClick={() => handleCardClick(player)}
                  backContent={
                    <div className="flex flex-col items-center justify-center h-full w-full p-4 text-center bg-black/30">
                      <div className="text-4xl mb-3">{player.avatar}</div>
                      <h3 className="font-changa text-lg font-black text-white">{player.name}</h3>
                      {teammate && <span className="mt-2 bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-full">شريكك 🔫</span>}
                      {valid && <Crosshair className="w-9 h-9 mt-3 text-red-500 animate-pulse" />}
                    </div>
                  }
                  frontContent={
                    <div className="relative h-full w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={reveal && player.role ? ROLE_INFO[player.role].cardArt : '/cards/citizen.png'} className="absolute inset-0 w-full h-full object-cover grayscale" alt="" />
                      <div className="absolute inset-0 bg-red-950/60" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                        <Skull className="w-14 h-14 text-gray-300" />
                        <span className="text-white font-changa font-black">{player.name}</span>
                        <span className="text-white/60 text-sm">{reveal ? `${ROLE_INFO[player.role!].icon} ${roleName(player.role)}` : 'دور مخفي'}</span>
                      </div>
                    </div>
                  }
                />
                {showVoters && (
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-1 w-max max-w-[220px]">
                    {(settings.secretVoting ? [me] : votersForPlayer).map(v =>
                      v ? (
                        <span key={v.id} className="flex items-center gap-1 bg-black/80 border border-[#cfb06f]/40 px-2 py-0.5 rounded-full text-[11px] text-[#cfb06f] font-bold">
                          {v.avatar} {v.name}
                        </span>
                      ) : null
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Event log */}
      <div className="fixed bottom-36 right-6 w-80 max-h-64 z-[100] flex flex-col overflow-hidden pointer-events-none bg-[#050505]/95 border border-[#cfb06f]/40 rounded-lg">
        <div className="bg-[#cfb06f]/10 border-b border-[#cfb06f]/30 p-2 px-3">
          <span className="text-xs text-[#cfb06f] font-black">سجل الأحداث</span>
        </div>
        <div className="flex flex-col gap-2 p-3 overflow-hidden">
          {logs
            .filter(l => l.type !== 'chat')
            .slice(-6)
            .map(l => (
              <motion.p
                key={l.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn('font-changa text-xs leading-relaxed', l.type === 'danger' ? 'text-red-400' : l.type === 'special' ? 'text-[#cfb06f]' : 'text-[#9fb2bd]')}
              >
                {l.text}
              </motion.p>
            ))}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed top-40 left-1/2 -translate-x-1/2 z-[460] bg-black/90 border border-red-500/50 text-red-300 px-6 py-3 rounded-xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom HUD */}
      <footer className="p-6 flex justify-between items-end gap-8 relative z-[150]">
        <button
          onClick={() => setShowChat(true)}
          aria-label="الدردشة"
          className="w-16 h-16 rounded-full bg-black/80 border-2 border-[#7f95a1] flex items-center justify-center text-[#7f95a1] hover:scale-110 transition-transform"
        >
          <MessageSquare className="w-8 h-8" />
        </button>

        <div className="relative flex-1 max-w-3xl bg-black/90 border-2 border-[#cfb06f4d] rounded-[36px] p-6 backdrop-blur-3xl flex flex-col items-center gap-3">
          {voice.lastResponse && (
            <div className="absolute -top-14 bg-[#cfb06f]/20 border border-[#cfb06f]/40 px-4 py-2 rounded-xl backdrop-blur-md max-w-full truncate">
              <p className="text-[#cfb06f] font-changa text-sm">🤖 {voice.lastResponse}</p>
            </div>
          )}

          {!me.isAlive ? (
            <p className="font-changa text-white/50 text-lg py-3">👻 لقد مُتّ. تابع اللعبة كمشاهد.</p>
          ) : targeting ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <p className="text-[#cfb06f] font-changa font-black text-xl animate-pulse flex items-center gap-3">
                <Target className="w-6 h-6" />
                {phase === 'voting' ? 'اختر لاعباً لطرده' : 'اختر هدفك'}
              </p>
              <div className="flex gap-3">
                {phase === 'night' && me.role === 'doctor' && (
                  <GothicButton
                    onClick={() => {
                      useGameStore.getState().submitNightAction(me.id, me.id);
                      useGameStore.getState().addLog('💉 ستحمي نفسك الليلة', 'special');
                      setTargeting(false);
                    }}
                  >
                    احمِ نفسك
                  </GothicButton>
                )}
                <GothicButton onClick={() => setTargeting(false)} variant="danger" className="px-10">
                  إلغاء
                </GothicButton>
              </div>
            </div>
          ) : (
            <div className="flex justify-center gap-4 w-full flex-wrap">
              <GothicButton
                disabled={!canTalk}
                onPointerDown={() => canTalk && voice.startRecording()}
                onPointerUp={voice.stopRecording}
                onPointerLeave={voice.stopRecording}
                className={cn('flex-1 min-w-48 py-4 text-lg', voice.isRecording ? 'bg-red-600 border-red-500 text-white' : 'border-blue-500/50 text-blue-300')}
              >
                <span className="flex items-center justify-center gap-2">
                  <Mic2 className="w-5 h-5" />
                  {voice.isRecording ? 'أسمعك... أفلت للإرسال' : voice.isThinking ? 'البوت يفكر...' : 'اضغط مطولاً للتحدث'}
                </span>
              </GothicButton>

              {phase === 'night' && hasNightAction(me) && (
                <GothicButton onClick={() => setTargeting(true)} className="flex-1 min-w-40 py-4 text-lg bg-[#cfb06f] text-black border-[#cfb06f]">
                  <span className="flex items-center justify-center gap-2">
                    <ActionIcon className="w-5 h-5" />
                    {myNightTarget ? 'تغيير الهدف' : actionLabel}
                  </span>
                </GothicButton>
              )}

              {phase === 'voting' && (
                <>
                  <GothicButton onClick={() => setTargeting(true)} className="flex-1 min-w-40 py-4 text-lg bg-red-600 text-white border-red-600">
                    <span className="flex items-center justify-center gap-2">
                      <Swords className="w-5 h-5" />
                      {myVote && myVote !== SKIP_VOTE ? 'تغيير صوتي' : 'تصويت للطرد'}
                    </span>
                  </GothicButton>
                  <GothicButton
                    variant="secondary"
                    disabled={myVote === SKIP_VOTE}
                    onClick={() => {
                      useGameStore.getState().castVote(me.id, SKIP_VOTE);
                      useGameStore.getState().addLog('⏭️ اخترت عدم طرد أحد', 'info');
                    }}
                  >
                    تجاوز
                  </GothicButton>
                </>
              )}

              {phase === 'testimony' && speaker?.id === me.id && (
                <GothicButton variant="secondary" onClick={() => useGameStore.getState().endMyTestimony()}>
                  إنهاء دوري
                </GothicButton>
              )}
            </div>
          )}
          {phase === 'voting' && (
            <p className="text-xs text-white/40">
              صوّت {Object.keys(votes).filter(id => living.some(p => p.id === id)).length} من {living.length}
            </p>
          )}
        </div>

        {/* My card */}
        <motion.div
          className="flex-none relative group"
          initial={{ rotateX: -20, y: 30 }}
          animate={{ rotateX: -20, y: 30 }}
          whileHover={{ rotateX: 0, y: 0, scale: 1.06 }}
          style={{ transformOrigin: 'bottom center', perspective: 3000 }}
        >
          <Card
            className="w-44 h-64"
            static
            isFlipped
            frontContent={
              <div className="relative h-full w-full overflow-hidden bg-[#0a0a0a]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={me.role ? ROLE_INFO[me.role].cardArt : '/cards/citizen.png'} className="absolute inset-0 w-full h-full object-cover opacity-90" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-5 text-center">
                  <h3 className={cn('font-changa text-3xl font-black mb-1', me.role === 'mafia' ? 'text-red-500' : 'text-[#cfb06f]')}>
                    {me.role ? `${ROLE_INFO[me.role].icon} ${ROLE_INFO[me.role].name}` : '؟'}
                  </h3>
                  <p className="text-[11px] text-white/60">{me.name}</p>
                </div>
              </div>
            }
          />
        </motion.div>
      </footer>

      <ChatPanel open={showChat} onClose={() => setShowChat(false)} side="left" />

      {/* Exit confirm */}
      <AnimatePresence>
        {showExit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6">
            <div className="bg-[#1a0709] border-2 border-red-600 p-10 rounded-[40px] max-w-md w-full text-center">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-6" />
              <h2 className="font-changa text-3xl font-black text-white mb-4">متأكد إنك تبي تطلع؟</h2>
              <p className="text-white/40 mb-8">بتخسر الجولة الحالية.</p>
              <div className="flex flex-col gap-3">
                <GothicButton
                  variant="danger"
                  onClick={() => {
                    useGameStore.getState().backToLobby();
                    router.push('/lobby');
                  }}
                  className="w-full py-4 text-xl"
                >
                  نعم، رجوع للوبي
                </GothicButton>
                <GothicButton onClick={() => setShowExit(false)} variant="secondary" className="w-full py-4 text-xl">
                  إلغاء
                </GothicButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game over */}
      <AnimatePresence>
        {phase === 'game-over' && winner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[600] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-6 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.85, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              className={cn('text-center p-10 rounded-[48px] border-4 max-w-3xl w-full', winner === 'mafia' ? 'bg-red-950/20 border-red-600' : 'bg-yellow-950/20 border-yellow-600')}
            >
              <div className="mb-6 flex justify-center">
                {winner === 'mafia' ? <Skull className="w-28 h-28 text-red-600" /> : <Trophy className="w-28 h-28 text-yellow-500" />}
              </div>
              <h1 className="font-changa text-6xl font-black text-white mb-3">
                {winner === 'mafia' ? 'انتصار المافيا' : winner === 'town' ? 'انتصار المواطنين' : 'فوز المهرج'}
              </h1>
              <p className={cn('font-changa text-2xl mb-8', didPlayerWin(me, winner) ? 'text-green-400' : 'text-red-400')}>
                {didPlayerWin(me, winner) ? '🏆 فزت! (+50 جوهرة)' : '💔 خسرت هذه المرة (+10 جواهر)'}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10 text-right">
                {players.map(p => (
                  <div key={p.id} className={cn('flex items-center gap-3 bg-white/5 border rounded-xl px-4 py-2', p.role === 'mafia' ? 'border-red-600/50' : 'border-white/10')}>
                    <span className="text-2xl">{p.avatar}</span>
                    <div className="flex flex-col">
                      <span className={cn('font-bold', p.isAlive ? 'text-white' : 'text-white/40 line-through')}>
                        {p.name} {p.id === myId && '(أنت)'}
                      </span>
                      <span className="text-xs text-white/50">
                        {p.role && ROLE_INFO[p.role].icon} {roleName(p.role)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <GothicButton
                  onClick={() => {
                    useGameStore.getState().backToLobby();
                    router.push('/lobby');
                  }}
                  className="flex-1 py-5 text-xl"
                >
                  <span className="flex items-center justify-center gap-3">
                    <RotateCcw className="w-5 h-5" /> العب مرة ثانية
                  </span>
                </GothicButton>
                <GothicButton
                  variant="secondary"
                  onClick={() => {
                    useGameStore.getState().leaveRoom();
                    router.push('/');
                  }}
                  className="flex-1 py-5 text-xl"
                >
                  <span className="flex items-center justify-center gap-3">
                    <Home className="w-5 h-5" /> الرئيسية
                  </span>
                </GothicButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
