import { ALL_ROLES, ROLE_INFO } from '@/game/roles';
import { RoleCard } from '@/components/cards';
import { PageShell } from '@/components/page-shell';
import { Panel } from '@/components/ui';

const PHASES: [string, string][] = [
  ['🎴 كشف الأدوار', 'كل لاعب يشوف بطاقته سراً. أفراد المافيا يعرفون بعض.'],
  ['🌙 الليل', 'المافيا تختار ضحية (والعرّاب يحسم). الطبيب يحمي، المحقق يحقق، الحارس يحرس، والقنّاص قد يطلق رصاصته. العائلة تقدر تتهامس في دردشة خاصة.'],
  ['☀️ الصباح', 'جريدة المدينة تعلن من مات (أو أن أحداً نجا بأعجوبة).'],
  ['🎙️ الشهادات', 'كل لاعب حي يتكلم بدوره، والباقي يسمعون. اللي يخلّص قبل وقته يضغط "أنهيت كلامي".'],
  ['🗣️ النقاش', 'الكلام مفتوح للجميع: اتهامات، دفاع، ادعاء أدوار.'],
  ['⚖️ التصويت', 'اضغط على صورة لاعب لتصوّت عليه، أو تجاوز. الأغلبية تطرد. التعادل أو أغلبية التجاوز = لا أحد يُطرد. صوت العمدة بصوتين.'],
];

export default function RulesPage() {
  return (
    <PageShell title="قوانين المدينة" subtitle="اقرأها مرة... وبعدين لا تثق بأحد">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-3 font-display text-3xl brass-text">الهدف</h2>
          <ul className="space-y-2 pr-5 text-fog/90 [list-style:'—_'] marker:text-brass">
            <li>المواطنون يفوزون إذا طردوا كل المافيا.</li>
            <li>المافيا تفوز إذا صار عددها يساوي عدد الباقين أو أكثر.</li>
            <li>المهرّج يفوز وحده — وتنتهي اللعبة — إذا طرده الشعب.</li>
          </ul>
          <h2 className="mb-3 mt-6 font-display text-3xl brass-text">مراحل الجولة</h2>
          <ol className="space-y-2">
            {PHASES.map(([t, d]) => (
              <li key={t} className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="font-kufi text-brass-hi">{t}</p>
                <p className="text-sm text-mist">{d}</p>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel>
          <h2 className="mb-3 font-display text-3xl brass-text">اللعب أونلاين</h2>
          <ul className="space-y-2 pr-5 text-sm text-fog/90 [list-style:'—_']">
            <li>من الرئيسية اختر &quot;أنشئ غرفة أونلاين&quot; وشارك الرمز أو الرابط مع أصحابك.</li>
            <li>المضيف يحدد الأدوار والتوقيت، ويقدر يكمّل المقاعد ببوتات.</li>
            <li>إذا انقطع اتصالك، افتح الصفحة من جديد وترجع لمقعدك تلقائياً.</li>
            <li>كل لاعب يشوف فقط اللي يحق له يشوفه — حتى لو فتح أدوات المطوّر.</li>
          </ul>
          <h2 className="mb-3 mt-6 font-display text-3xl brass-text">نصائح</h2>
          <ul className="space-y-2 pr-5 text-sm text-fog/90 [list-style:'—_']">
            <li>البوتات تتأثر بكلامك: اذكر اسم لاعب مع كلمة &quot;مشبوه&quot; أو &quot;مافيا&quot; وراح يزيد شكّهم فيه.</li>
            <li>المحقق البوت إذا لقى مافيا بيعلن عنه في النقاش.</li>
            <li>انتبه للي يغيّر صوته آخر لحظة.</li>
          </ul>
        </Panel>
      </div>

      <h2 className="mb-4 mt-10 text-center font-display text-4xl brass-text">الأدوار</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {ALL_ROLES.map(r => (
          <div key={r} className="flex flex-col gap-2">
            <RoleCard role={r} compact />
            <p className="text-xs leading-relaxed text-mist">
              {ROLE_INFO[r].description}
              {ROLE_INFO[r].minPlayers > 0 && <span className="text-brass/70"> (من {ROLE_INFO[r].minPlayers} لاعبين)</span>}
            </p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
