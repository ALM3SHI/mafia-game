import { PageShell } from '@/components/page-shell';
import { Panel } from '@/components/ui';

const CREDITS: { what: string; who: string; license: string; url: string; note?: string }[] = [
  {
    what: 'أيقونات الأدوار والمراحل',
    who: 'game-icons.net — Lorc, Delapouite وآخرون',
    license: 'CC BY 3.0',
    url: 'https://game-icons.net',
    note: 'عبر حزمة @iconify-json/game-icons',
  },
  {
    what: 'مؤثرات النوار (رعد، مطرقة القاضي، آلة كاتبة، نبض، مطر، موسيقى الفوز والخسارة)',
    who: 'WHODUNIT?! SFX kit — Toon',
    license: 'CC0 1.0',
    url: 'https://github.com/GeorgeShani/whodunit',
  },
  {
    what: 'أصوات الكازينو (خلط وقلب البطاقات، الفيش)',
    who: 'Kenney — Casino Audio',
    license: 'CC0 1.0',
    url: 'https://kenney.nl/assets/casino-audio',
  },
  {
    what: 'جرس الصباح، الأبواب، مقطوعات الساكسفون',
    who: 'Kenney — Impact Sounds · RPG Audio · Music Jingles',
    license: 'CC0 1.0',
    url: 'https://kenney.nl',
  },
  {
    what: 'صوت الطلقة',
    who: '25 CC0 Bang SFX (مجموعة CC0-Public-Domain-Sounds)',
    license: 'CC0 1.0',
    url: 'https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds',
  },
  {
    what: 'الخطوط: Aref Ruqaa · Reem Kufi · IBM Plex Sans Arabic',
    who: 'Google Fonts عبر Fontsource',
    license: 'SIL Open Font License 1.1',
    url: 'https://fontsource.org',
  },
];

export default function CreditsPage() {
  return (
    <PageShell title="شكر وتقدير" subtitle="كل صورة وصوت في المدينة له صاحب">
      <Panel className="mx-auto max-w-3xl">
        <ul className="divide-y divide-white/10">
          {CREDITS.map(c => (
            <li key={c.what} className="py-4">
              <p className="font-kufi text-fog">{c.what}</p>
              <p className="text-sm text-mist">
                {c.who} ·{' '}
                <a href={c.url} target="_blank" rel="noreferrer" className="text-rain underline-offset-4 hover:underline" dir="ltr">
                  {c.url.replace('https://', '')}
                </a>{' '}
                · <span className="text-brass">{c.license}</span>
              </p>
              {c.note && <p className="text-xs text-mist/70">{c.note}</p>}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-mist">رسومات الطاولة والشخصيات من أصول المشروع الأصلية.</p>
      </Panel>
    </PageShell>
  );
}
