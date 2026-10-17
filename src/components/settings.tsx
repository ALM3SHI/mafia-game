'use client';

import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { AVATARS, useProfile } from '@/client/profile';
import { ambience } from '@/client/audio';
import { Modal, Slider, Toggle, cn } from './ui';

export function SettingsButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="الإعدادات"
        className={cn('grid h-11 w-11 place-items-center rounded-full border border-brass/40 bg-black/50 text-brass backdrop-blur transition hover:border-brass hover:text-brass-hi', className)}
      >
        <Settings2 className="h-5 w-5" />
      </button>
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const prefs = useProfile(s => s.prefs);
  const setPrefs = useProfile(s => s.setPrefs);
  const set = (p: Partial<typeof prefs>) => {
    setPrefs(p);
    ambience.unlock();
    ambience.apply();
  };
  return (
    <Modal open={open} onClose={onClose} title="الإعدادات">
      <div className="space-y-1">
        <Toggle label="الموسيقى" hint="لحن نوار هادئ يتغيّر بين الليل والنهار" checked={prefs.music} onChange={v => set({ music: v })} />
        <Toggle label="صوت المطر" checked={prefs.rain} onChange={v => set({ rain: v })} />
        <Toggle label="المؤثرات الصوتية" checked={prefs.sfx} onChange={v => set({ sfx: v })} />
        <Slider label="مستوى الصوت" value={Math.round(prefs.volume * 100)} min={0} max={100} suffix="%" onChange={v => set({ volume: v / 100 })} />
        <div className="brass-rule my-3" />
        <Toggle label="خطوط الشاشة القديمة" hint="تأثير CRT خفيف" checked={prefs.crt} onChange={v => set({ crt: v })} />
        <Toggle
          label="ردود صوتية بالذكاء الاصطناعي"
          hint="في اللعب ضد البوتات: اضغط مطولاً وتكلم، ويرد عليك بوت بصوته. يتطلب تشغيل game_backend."
          checked={prefs.voice}
          onChange={v => set({ voice: v })}
        />
      </div>
    </Modal>
  );
}

export function IdentityEditor({ onDone }: { onDone?: () => void }) {
  const name = useProfile(s => s.name);
  const avatar = useProfile(s => s.avatar);
  const setName = useProfile(s => s.setName);
  const setAvatar = useProfile(s => s.setAvatar);
  const [draft, setDraft] = useState(name);
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        setName(draft);
        onDone?.();
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="mb-1 block font-kufi text-sm text-mist">اسمك في المدينة</span>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          maxLength={18}
          className="w-full rounded-lg border border-brass/40 bg-black/50 px-4 py-3 font-kufi text-lg text-fog outline-none focus:border-brass"
        />
      </label>
      <div>
        <span className="mb-2 block font-kufi text-sm text-mist">وجهك</span>
        <div className="grid grid-cols-9 gap-1.5">
          {AVATARS.map(a => (
            <button
              type="button"
              key={a}
              onClick={() => setAvatar(a)}
              className={cn('aspect-square rounded-lg text-2xl transition', a === avatar ? 'bg-brass/25 ring-2 ring-brass' : 'bg-white/5 hover:bg-white/10')}
              aria-label={`اختيار ${a}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <button type="submit" className="w-full rounded-lg bg-brass py-2.5 font-kufi font-semibold text-ink hover:brightness-110">
        حفظ
      </button>
    </form>
  );
}
