'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import { ACHIEVEMENTS, SHOP, useProfile } from '@/client/profile';
import { ALL_ROLES, ROLE_INFO } from '@/game/roles';
import { RoleMedallion } from '@/components/cards';
import { PageShell } from '@/components/page-shell';
import { IdentityEditor } from '@/components/settings';
import { Modal, Panel, cn } from '@/components/ui';

const WINNER = { town: 'المواطنون', mafia: 'المافيا', jester: 'المهرّج' } as const;

export default function ProfilePage() {
  const p = useProfile();
  const [editing, setEditing] = useState(false);
  const rate = p.games ? Math.round((p.wins / p.games) * 100) : 0;
  const title = SHOP.find(i => i.id === p.equipped.title);

  return (
    <PageShell title="ملفك" subtitle="سجلّك في دفاتر الشرطة... وفي دفاتر العائلة">
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Panel className="flex flex-col items-center gap-3 p-6 text-center">
          <span className="grid h-28 w-28 place-items-center rounded-full border-2 border-brass bg-gradient-to-br from-ash to-ink text-6xl shadow-[0_0_40px_rgba(201,164,92,0.25)]">{p.avatar}</span>
          <h2 className="font-display text-4xl brass-text">{p.name}</h2>
          {title && title.id !== 'title-none' && <p className="font-kufi text-sm text-brass/80">{title.name}</p>}
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-sm text-rain hover:underline">
            <Pencil className="h-3.5 w-3.5" /> تعديل الاسم والوجه
          </button>
          <div className="brass-rule my-2 w-full" />
          <div className="grid w-full grid-cols-3 gap-2">
            {[
              ['مباريات', p.games],
              ['فوز', p.wins],
              ['نسبة الفوز', `${rate}%`],
              ['السلسلة', p.streak],
              ['أفضل سلسلة', p.bestStreak],
              ['إنجازات', `${p.achievements.length}/${ACHIEVEMENTS.length}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-black/30 p-2">
                <p className="font-kufi text-xl text-fog" dir="ltr">
                  {value}
                </p>
                <p className="text-[11px] text-mist">{label}</p>
              </div>
            ))}
          </div>
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel>
            <h3 className="mb-3 font-kufi text-lg text-fog">الأدوار التي لعبتها</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
              {ALL_ROLES.map(r => {
                const s = p.byRole[r];
                return (
                  <div key={r} className={cn('flex flex-col items-center gap-1 rounded-lg border p-2 text-center', s ? 'border-brass/40 bg-brass/5' : 'border-white/5 opacity-40')}>
                    <RoleMedallion role={r} size={36} />
                    <span className="font-kufi text-xs text-fog">{ROLE_INFO[r].name}</span>
                    <span className="text-[10px] text-mist">{s ? `${s.won}/${s.played} فوز` : '—'}</span>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <h3 className="mb-3 font-kufi text-lg text-fog">الإنجازات</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ACHIEVEMENTS.map((a, i) => {
                const got = p.achievements.includes(a.id);
                return (
                  <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className={cn('flex items-center gap-3 rounded-lg border p-3', got ? 'border-brass/60 bg-brass/10' : 'border-white/10 bg-black/20')}>
                    <span className={cn('text-3xl', !got && 'grayscale opacity-40')}>{a.icon}</span>
                    <span className="min-w-0">
                      <span className={cn('block font-kufi', got ? 'text-brass-hi' : 'text-mist')}>{a.name}</span>
                      <span className="block text-xs text-mist">
                        {a.description} · 💎{a.reward}
                      </span>
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <h3 className="mb-3 font-kufi text-lg text-fog">آخر المباريات</h3>
            {p.history.length === 0 ? (
              <p className="text-sm text-mist">ما لعبت للحين. المدينة بانتظارك.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {p.history.map(h => (
                  <li key={h.at} className="flex items-center gap-3 py-2 text-sm">
                    <RoleMedallion role={h.role} size={28} />
                    <span className={cn('w-14 font-kufi', h.won ? 'text-jade' : 'text-blood-hi')}>{h.won ? 'فوز' : 'خسارة'}</span>
                    <span className="flex-1 text-mist">
                      {ROLE_INFO[h.role].name} · فاز {WINNER[h.winner]} · {h.rounds} جولات · {h.players} لاعبين · {h.mode === 'online' ? 'أونلاين' : 'بوتات'}
                    </span>
                    <span className="text-xs text-mist/60" dir="ltr">
                      {new Date(h.at).toLocaleDateString('ar-SA')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="هويتك">
        <IdentityEditor onDone={() => setEditing(false)} />
      </Modal>
    </PageShell>
  );
}
