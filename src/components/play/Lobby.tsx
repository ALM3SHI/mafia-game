'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Check, Copy, Crown, LogOut, Play, Settings2, Share2, UserMinus, Users } from 'lucide-react';
import { useGame } from '@/client/game-store';
import { sfx } from '@/client/audio';
import { MAX_PLAYERS, MIN_PLAYERS, buildRoleDeck, maxMafiaFor } from '@/game/rules';
import { OPTIONAL_ROLES, ROLE_INFO } from '@/game/roles';
import type { GameSettings, OptionalRole, PlayerView } from '@/game/types';
import { RoleMedallion } from '../cards';
import { Button, Ornament, Panel, Slider, Toggle, cn } from '../ui';
import { ChatBox } from './ChatBox';

export function Lobby({ view, onLeave }: { view: PlayerView; onLeave: () => void }) {
  const send = useGame(s => s.send);
  const me = view.players.find(p => p.id === view.meId);
  const isHost = view.hostId === view.meId;
  const s = view.settings;
  const [copied, setCopied] = useState(false);
  const deck = buildRoleDeck(Math.max(view.players.length, MIN_PLAYERS), s);
  const notReady = view.players.filter(p => !p.ready && !p.isHost);
  const canStart = view.players.length >= MIN_PLAYERS && notReady.length === 0;
  const patch = (p: Partial<GameSettings>) => send({ type: 'settings', patch: p });

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/play?join=${view.code}` : '';
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      useGame.getState().toast('ما قدرنا ننسخ، انسخ الرمز يدوياً');
    }
  };

  return (
    <div className="relative z-10 mx-auto grid min-h-dvh w-full max-w-7xl gap-5 overflow-x-hidden p-4 sm:p-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="dark" onClick={onLeave}>
            <LogOut className="h-4 w-4" /> خروج
          </Button>
          <div className="text-center">
            <p className="font-kufi text-xs tracking-[0.3em] text-mist">{view.mode === 'online' ? 'غرفة أونلاين' : 'تدريب ضد البوتات'}</p>
            <h1 className="font-display text-3xl leading-snug brass-text sm:text-5xl">صالة الانتظار</h1>
          </div>
          {view.mode === 'online' ? (
            <button onClick={() => copy(view.code)} className="group flex items-center gap-3 rounded-xl border border-brass/50 bg-black/50 px-4 py-2 backdrop-blur hover:border-brass" title="نسخ الرمز">
              <span className="font-kufi text-2xl tracking-[0.35em] text-brass-hi" dir="ltr">
                {view.code}
              </span>
              {copied ? <Check className="h-5 w-5 text-jade" /> : <Copy className="h-5 w-5 text-brass" />}
            </button>
          ) : (
            <span className="w-24" />
          )}
        </div>

        {/* Seats */}
        <Panel className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-kufi text-lg text-fog">
              <Users className="h-5 w-5 text-brass" /> الحاضرون
              <span className="text-mist" dir="ltr">
                {view.players.length}/{MAX_PLAYERS}
              </span>
            </h2>
            {isHost && (
              <div className="flex gap-2">
                <Button variant="ghost" className="px-3 py-1.5 text-sm" disabled={view.players.length >= MAX_PLAYERS} onClick={() => send({ type: 'addBot' })}>
                  <Bot className="h-4 w-4" /> بوت
                </Button>
                {view.players.length < 8 && (
                  <Button variant="ghost" className="px-3 py-1.5 text-sm" onClick={() => send({ type: 'fillBots', count: 8 })}>
                    كمّل لـ 8
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {view.players.map((p, i) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl border p-3 transition',
                  p.id === view.meId ? 'border-brass/70 bg-brass/10' : 'border-white/10 bg-black/30',
                  !p.connected && 'opacity-50'
                )}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-brass/40 bg-ash text-2xl">{p.avatar}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate font-kufi text-fog">
                    {p.isHost && <Crown className="h-3.5 w-3.5 shrink-0 text-brass-hi" />}
                    {p.isBot && <Bot className="h-3.5 w-3.5 shrink-0 text-rain" />}
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className={cn('text-xs', p.ready || p.isHost ? 'text-jade' : 'text-mist')}>{p.isHost ? 'المضيف' : !p.connected ? 'غير متصل' : p.ready ? 'جاهز ✓' : 'غير جاهز'}</span>
                </span>
                {isHost && p.id !== view.meId && (
                  <button onClick={() => send({ type: 'kick', targetId: p.id })} aria-label={`طرد ${p.name}`} className="rounded p-1 text-mist hover:text-blood-hi">
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}
              </motion.div>
            ))}
            {view.mode === 'online' &&
              Array.from({ length: Math.max(0, MIN_PLAYERS - view.players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="grid place-items-center rounded-xl border border-dashed border-white/10 p-3 text-sm text-mist/60">
                  مقعد فارغ
                </div>
              ))}
          </div>

          {view.mode === 'online' && (
            <div className="mt-5 flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-mist">
              <Share2 className="h-4 w-4 text-brass" />
              شارك الرمز مع أصحابك، أو أرسل لهم الرابط:
              <button onClick={() => copy(shareUrl)} className="max-w-full truncate text-rain underline-offset-4 hover:underline" dir="ltr">
                {shareUrl}
              </button>
            </div>
          )}
        </Panel>

        {/* Start / ready */}
        <div className="flex flex-col items-center gap-2">
          {!canStart && (
            <p className="text-sm text-mist">
              {view.players.length < MIN_PLAYERS ? `نحتاج ${MIN_PLAYERS} لاعبين على الأقل` : `بانتظار: ${notReady.map(p => p.name).join('، ')}`}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            {!isHost && (
              <Button variant={me?.ready ? 'dark' : 'ghost'} className="px-10 py-3.5 text-lg" onClick={() => send({ type: 'ready', ready: !me?.ready })}>
                {me?.ready ? 'إلغاء الجاهزية' : 'أنا جاهز'}
              </Button>
            )}
            {isHost && (
              <Button
                className="px-12 py-4 text-xl"
                disabled={!canStart}
                onClick={() => {
                  sfx('start');
                  send({ type: 'start' });
                }}
              >
                <Play className="h-5 w-5" /> ابدأ الليلة
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar: settings + chat */}
      <div className="flex min-w-0 flex-col gap-5">
        <Panel>
          <h2 className="mb-3 flex items-center gap-2 font-kufi text-lg text-fog">
            <Settings2 className="h-5 w-5 text-brass" /> قواعد الطاولة {!isHost && <span className="text-xs text-mist">(يحددها المضيف)</span>}
          </h2>
          <Slider label="عدد المافيا" value={s.mafiaCount} min={1} max={maxMafiaFor(Math.max(view.players.length, 3))} disabled={!isHost} onChange={v => patch({ mafiaCount: v })} />
          <div className="my-3 flex flex-wrap gap-1.5" aria-label="البطاقات في هذه اللعبة">
            {deck.map((r, i) => (
              <span key={i} title={ROLE_INFO[r].name}>
                <RoleMedallion role={r} size={26} />
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {OPTIONAL_ROLES.map((r: OptionalRole) => {
              const info = ROLE_INFO[r];
              const on = s.roles[r];
              const tooFew = view.players.length < info.minPlayers;
              return (
                <button
                  key={r}
                  disabled={!isHost}
                  onClick={() => patch({ roles: { ...s.roles, [r]: !on } })}
                  title={info.description}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 text-right text-sm transition',
                    on ? 'border-brass/60 bg-brass/10 text-fog' : 'border-white/10 text-mist/60',
                    isHost && 'hover:border-brass'
                  )}
                >
                  <RoleMedallion role={r} size={24} />
                  <span className="min-w-0">
                    <span className="block truncate font-kufi">{info.name}</span>
                    {on && tooFew && <span className="block text-[10px] text-blood-hi">من {info.minPlayers} لاعبين</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <details className="mt-3 group">
            <summary className="cursor-pointer font-kufi text-sm text-brass/80 hover:text-brass">التوقيت والتصويت</summary>
            <div className="mt-2">
              <Slider label="الشهادة لكل لاعب" value={s.testimonyDuration} min={5} max={60} step={5} suffix="ث" disabled={!isHost} onChange={v => patch({ testimonyDuration: v })} />
              <Slider label="النقاش" value={s.discussionDuration} min={15} max={180} step={15} suffix="ث" disabled={!isHost} onChange={v => patch({ discussionDuration: v })} />
              <Slider label="التصويت" value={s.voteDuration} min={10} max={90} step={5} suffix="ث" disabled={!isHost} onChange={v => patch({ voteDuration: v })} />
              <Slider label="الليل" value={s.nightDuration} min={10} max={90} step={5} suffix="ث" disabled={!isHost} onChange={v => patch({ nightDuration: v })} />
              <div className={cn(!isHost && 'pointer-events-none opacity-60')}>
                <Toggle label="تصويت سري" checked={s.secretVoting} onChange={v => patch({ secretVoting: v })} />
                <Toggle label="كشف الدور عند الموت" checked={s.revealRolesOnDeath} onChange={v => patch({ revealRolesOnDeath: v })} />
              </div>
            </div>
          </details>
        </Panel>

        <Panel className="flex min-h-72 flex-1 flex-col p-0">
          <div className="px-5 pt-4">
            <h2 className="font-kufi text-lg text-fog">دردشة الصالة</h2>
            <Ornament className="mt-1 w-40" />
          </div>
          <ChatBox view={view} className="min-h-0 flex-1" />
        </Panel>
      </div>
    </div>
  );
}
