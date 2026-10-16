import Link from 'next/link';
import { ROLE_INFO } from '@/lib/roles';
import type { Role } from '@/lib/game-types';

const ROLES: Role[] = ['mafia', 'citizen', 'doctor', 'detective', 'mayor', 'jester'];

const PHASES = [
  ['🎴 كشف الأدوار', 'كل لاعب يشوف دوره سراً. المافيا يعرفون بعض.'],
  ['🌙 الليل', 'المافيا تختار ضحية، الطبيب يحمي لاعباً، والمحقق يكشف لاعباً.'],
  ['☀️ الصباح', 'يُعلن من مات (أو أن الطبيب أنقذه).'],
  ['🎙️ الشهادات', 'كل لاعب حي يتكلم بدوره لوقت محدد.'],
  ['🗣️ النقاش', 'نقاش مفتوح للجميع.'],
  ['⚖️ التصويت', 'الأغلبية تطرد لاعباً. التعادل أو أغلبية "تجاوز" = لا أحد يُطرد.'],
];

export default function RulesPage() {
  return (
    <div className="min-h-dvh bg-[#0a0305] p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="flex justify-between items-center">
          <h1 className="font-changa text-5xl font-black text-[#cfb06f]">القوانين</h1>
          <Link href="/" className="px-6 py-2 border-2 border-[#7f95a1] text-[#7f95a1] rounded-lg font-bold hover:bg-[#7f95a1] hover:text-black transition-colors">
            العودة
          </Link>
        </div>

        <section>
          <h2 className="text-2xl font-black text-white mb-4">الهدف</h2>
          <ul className="space-y-2 text-white/70 leading-relaxed list-disc pr-6">
            <li>المواطنون يفوزون إذا طردوا كل المافيا.</li>
            <li>المافيا تفوز إذا صار عددها يساوي عدد الباقين أو أكثر.</li>
            <li>المهرج يفوز وحده إذا طرده الشعب بالتصويت.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black text-white mb-4">مراحل الجولة</h2>
          <ol className="space-y-3">
            {PHASES.map(([title, desc]) => (
              <li key={title} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <span className="font-black text-[#cfb06f]">{title}</span>
                <p className="text-white/60 mt-1">{desc}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-black text-white mb-4">الأدوار</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {ROLES.map(r => (
              <div key={r} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4">
                <span className="text-4xl">{ROLE_INFO[r].icon}</span>
                <div>
                  <h3 className="font-black text-white">
                    {ROLE_INFO[r].name}
                    {ROLE_INFO[r].minPlayers > 0 && <span className="text-xs text-white/40 font-normal"> · من {ROLE_INFO[r].minPlayers} لاعبين</span>}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">{ROLE_INFO[r].description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
