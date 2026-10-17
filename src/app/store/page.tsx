'use client';

import { Check, Gem, Lock } from 'lucide-react';
import { SHOP, useProfile, type ShopItem } from '@/client/profile';
import { useGame } from '@/client/game-store';
import { sfx } from '@/client/audio';
import { CardBack } from '@/components/cards';
import { PageShell } from '@/components/page-shell';
import { Button, Panel, cn } from '@/components/ui';

const SECTIONS: { kind: ShopItem['kind']; title: string; hint: string }[] = [
  { kind: 'back', title: 'ظهر البطاقات', hint: 'يظهر لك على كل البطاقات المقلوبة.' },
  { kind: 'frame', title: 'إطار الصورة', hint: 'يشوفه كل اللاعبين حول الطاولة.' },
  { kind: 'title', title: 'الألقاب', hint: 'يظهر تحت اسمك للجميع.' },
];

const FRAME_PREVIEW: Record<string, string> = {
  'frame-none': 'border-white/20',
  'frame-gold': 'border-brass-hi shadow-[0_0_24px_6px_rgba(236,212,154,0.45)]',
  'frame-blood': 'border-blood-hi shadow-[0_0_26px_8px_rgba(216,71,63,0.5)]',
  'frame-smoke': 'border-[#9aa3ab] shadow-[0_0_30px_12px_rgba(180,190,200,0.35)]',
};

export default function StorePage() {
  const p = useProfile();
  const toast = useGame(s => s.toast);

  const act = (item: ShopItem) => {
    if (p.owned.includes(item.id)) {
      p.equip(item.id);
      sfx('click');
      return;
    }
    const r = p.buy(item.id);
    if (r.ok) {
      sfx('notify');
      toast(`اشتريت ${item.name} وتم تجهيزه ✨`);
    } else {
      sfx('error');
      toast(r.error ?? 'تعذّر الشراء', 'error');
    }
  };

  return (
    <PageShell title="السوق السوداء" subtitle="الجواهر تكسبها بالفوز والإنجازات. كل شي هنا تجميلي — ما يعطيك أفضلية في اللعب.">
      <div className="space-y-8">
        {SECTIONS.map(sec => (
          <section key={sec.kind}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="font-display text-3xl brass-text">{sec.title}</h2>
              <span className="text-sm text-mist">{sec.hint}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {SHOP.filter(i => i.kind === sec.kind).map(item => {
                const owned = p.owned.includes(item.id);
                const equipped = p.equipped[item.kind] === item.id;
                const affordable = p.gems >= item.price;
                return (
                  <Panel key={item.id} className={cn('flex flex-col items-center gap-3 p-4 text-center', equipped && 'ring-2 ring-brass')}>
                    <div className="grid h-36 place-items-center">
                      {item.kind === 'back' && <CardBack design={item.id} className="h-36 w-auto" />}
                      {item.kind === 'frame' && <span className={cn('grid h-24 w-24 place-items-center rounded-full border-[3px] bg-ash text-5xl', FRAME_PREVIEW[item.id])}>{p.avatar}</span>}
                      {item.kind === 'title' && (
                        <span className="flex flex-col items-center">
                          <span className="font-kufi text-fog">{p.name}</span>
                          <span className="font-display text-2xl text-brass">{item.id === 'title-none' ? '—' : item.name}</span>
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-kufi text-fog">{item.name}</p>
                      {item.description && <p className="text-xs text-mist">{item.description}</p>}
                    </div>
                    <Button variant={owned ? 'ghost' : 'brass'} className="mt-auto w-full py-2 text-sm" disabled={equipped || (!owned && !affordable)} onClick={() => act(item)}>
                      {equipped ? (
                        <>
                          <Check className="h-4 w-4" /> مجهّز
                        </>
                      ) : owned ? (
                        'تجهيز'
                      ) : (
                        <>
                          {affordable ? <Gem className="h-4 w-4" /> : <Lock className="h-4 w-4" />} {item.price}
                        </>
                      )}
                    </Button>
                  </Panel>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
