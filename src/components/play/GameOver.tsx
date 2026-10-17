'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Gem, Home, RotateCcw } from 'lucide-react';
import { useGame } from '@/client/game-store';
import { sfx } from '@/client/audio';
import { useProfile, type Achievement } from '@/client/profile';
import { ROLE_INFO } from '@/game/roles';
import { didWin } from '@/game/rules';
import type { PlayerView } from '@/game/types';
import { RoleMedallion } from '../cards';
import { Button, Ornament, cn } from '../ui';

const WIN_TITLE = { town: 'انتصر المواطنون', mafia: 'انتصرت المافيا', jester: 'فاز المهرّج' } as const;

export function GameOver({ view, onLeave }: { view: PlayerView; onLeave: () => void }) {
  const send = useGame(s => s.send);
  const me = view.players.find(p => p.id === view.meId);
  const won = didWin(me?.role, view.winner);
  const isHost = view.hostId === view.meId;
  const [reward, setReward] = useState<{ gems: number; unlocked: Achievement[] } | null>(null);

  useEffect(() => {
    const r = useProfile.getState().recordMatch(view);
    sfx(won ? 'win' : 'lose');
    const t = setTimeout(() => r && setReward(r), 0);
    return () => clearTimeout(t);
    // record once per game-over view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!view.winner) return null;
  const names = (ids: string[]) => ids.map(id => view.players.find(p => p.id === id)?.name ?? '؟').join('، ');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[160] overflow-y-auto bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center px-4 py-10 text-center">
        <motion.p initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cn('font-kufi text-lg', won ? 'text-jade' : 'text-blood-hi')}>
          {won ? 'فزت!' : 'خسرت هذه المرة'}
        </motion.p>
        <motion.h1
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className={cn('font-display text-6xl sm:text-8xl', view.winner === 'town' ? 'brass-text' : 'text-blood-hi')}
        >
          {WIN_TITLE[view.winner]}
        </motion.h1>
        <Ornament className="my-4" />

        {reward && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-6 flex flex-col items-center gap-2">
            <p className="flex items-center gap-2 font-kufi text-xl text-brass-hi">
              <Gem className="h-5 w-5" /> +{reward.gems} جوهرة
            </p>
            {reward.unlocked.map(a => (
              <p key={a.id} className="rounded-full border border-brass/50 bg-brass/10 px-4 py-1 font-kufi text-sm text-fog">
                {a.icon} إنجاز جديد: {a.name}
              </p>
            ))}
          </motion.div>
        )}

        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {view.players.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ delay: 0.3 + i * 0.07 }}
              className={cn('flex items-center gap-3 rounded-xl border p-2.5 text-right', p.role && ROLE_INFO[p.role].team === 'mafia' ? 'border-blood/60 bg-blood/10' : 'border-white/10 bg-white/5', p.id === view.meId && 'ring-2 ring-brass')}
            >
              {p.role && <RoleMedallion role={p.role} size={36} />}
              <span className="min-w-0">
                <span className={cn('block truncate font-kufi', p.alive ? 'text-fog' : 'text-mist line-through')}>
                  {p.avatar} {p.name}
                </span>
                <span className="text-xs text-mist">{p.role ? ROLE_INFO[p.role].name : '—'}</span>
              </span>
            </motion.div>
          ))}
        </div>

        {view.timeline.length > 0 && (
          <div className="mt-8 w-full max-w-xl text-right">
            <h2 className="mb-3 text-center font-display text-3xl brass-text">ملف القضية</h2>
            <ol className="space-y-1.5 border-r border-brass/30 pr-4 text-sm">
              {view.timeline.map((t, i) => (
                <li key={i} className="text-mist">
                  <span className="font-kufi text-brass">الجولة {t.round}: </span>
                  {t.kind === 'night-kill' && `قُتل بالليل ${names(t.playerIds)}`}
                  {t.kind === 'saved' && `نجا ${names(t.playerIds)} من الموت`}
                  {t.kind === 'vigilante' && `القنّاص أطلق على ${names(t.playerIds)}`}
                  {t.kind === 'lynch' && `طرد الشعب ${names(t.playerIds)}`}
                  {t.kind === 'no-lynch' && 'لم يُطرد أحد'}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {(view.mode === 'local' || isHost) && (
            <Button
              className="px-8 py-3.5 text-lg"
              onClick={() => {
                send({ type: 'backToLobby' });
                if (view.mode === 'local') setTimeout(() => send({ type: 'start' }), 50);
              }}
            >
              <RotateCcw className="h-5 w-5" /> {view.mode === 'local' ? 'جولة جديدة' : 'رجوع للصالة'}
            </Button>
          )}
          {view.mode === 'online' && !isHost && <p className="w-full text-sm text-mist">بانتظار المضيف ليبدأ جولة جديدة...</p>}
          {view.mode === 'local' && (
            <Button variant="ghost" className="px-6 py-3.5" onClick={() => send({ type: 'backToLobby' })}>
              تغيير الإعدادات
            </Button>
          )}
          <Button variant="dark" className="px-6 py-3.5" onClick={onLeave}>
            <Home className="h-5 w-5" /> الرئيسية
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
