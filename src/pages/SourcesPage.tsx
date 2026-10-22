import {
  BookOpen,
  CircleCheck,
  CodeXml,
  FileJson,
  Github,
  Landmark,
  Library,
  Link2,
  Music,
  Scale,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** ملفات بيانات القرآن المولّدة والمخدومة من الموقع */
const DATA_FILES: { path: string; desc: string }[] = [
  {
    path: '/assets/data/quran.json',
    desc: 'جميع الآيات في مصفوفة واحدة، وكل آية بالهيكل: sura و aya و text.',
  },
  {
    path: '/assets/data/quran-by-surah.json',
    desc: 'الآيات مقسّمة حسب السورة مع بياناتها الوصفية (الاسم والنوع وعدد الآيات).',
  },
  {
    path: '/assets/data/surahs.json',
    desc: 'فهرس السور: الاسم، والاسم اللاتيني، والنوع (مكية/مدنية)، وعدد الآيات.',
  },
  {
    path: '/assets/data/surahs/{id}.json',
    desc: 'ملف مستقل لكل سورة من ١ إلى ١١٤، مناسب للتحميل الجزئي.',
  },
];

/** القرّاء المتاحون آية بآية عبر شبكة islamic.network */
const RECITER_NAMES = [
  'مشاري راشد العفاسي',
  'محمود خليل الحصري',
  'محمد صديق المنشاوي',
  'عبد الباسط عبد الصمد (مرتّل)',
  'عبد الرحمن السديس',
  'أبو بكر الشاطري',
  'علي بن عبد الرحمن الحذيفي',
  'ماهر المعيقلي',
  'محمد أيوب',
  'أحمد بن علي العجمي',
  'محمد جبريل',
  'سعود الشريم',
  'محمود خليل الحصري (مجوّد)',
  'عبد الله بصفر',
  'هاني الرفاعي',
];

/** جدول توضيحي لترخيص كل عنصر من عناصر الموقع */
const LICENSE_ROWS: { item: string; license: string; note: string }[] = [
  {
    item: 'شيفرة الموقع وتصميمه',
    license: 'MIT',
    note: 'الملف LICENSE في مستودع المشروع على GitHub.',
  },
  {
    item: 'ملفات نص القرآن (quran-json)',
    license: 'CC BY 4.0',
    note: 'تتطلب الإسناد إلى مشروع quran-json عند إعادة الاستخدام.',
  },
  {
    item: 'خطوط Amiri و Amiri Quran و Plus Jakarta Sans',
    license: 'SIL OFL 1.1',
    note: 'تسمح بالتضمين والتوزيع مع الحفاظ على إشعار الترخيص واسم الخط.',
  },
  {
    item: 'خطوط مجمع الملك فهد (KFGQPC)',
    license: 'خطوط المجمع مضمّنة محليًا',
    note: 'المصدر الرسمي: مجمع الملك فهد لطباعة المصحف الشريف.',
  },
  {
    item: 'التلاوات الصوتية',
    license: 'تُبثّ من شبكة islamic.network',
    note: 'لا تُخزَّن نسخ من الملفات الصوتية داخل المستودع وتُنسب إلى أصحابها.',
  },
];

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-stone-900">
      <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" aria-hidden="true" />
      </span>
      {title}
    </h2>
  );
}

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-700/20 rounded-lg hover:bg-emerald-100 transition-colors"
    >
      <span>{children}</span>
      <ExternalLinkIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
    </a>
  );
}

function CodeLine({ children }: { children: ReactNode }) {
  return (
    <code
      dir="ltr"
      className="inline-block font-mono text-[11px] text-emerald-800 bg-stone-50 border border-stone-200/70 rounded px-1.5 py-0.5"
    >
      {children}
    </code>
  );
}

export default function SourcesPage() {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
        {/* ترويسة الصفحة */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0">
              <Library className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold font-quran text-stone-900">
                المصادر والتراخيص
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 font-sans mt-1 leading-relaxed">
                من أين يأتي نص القرآن الكريم والتلاوات الصوتية والخطوط، وما ترخيص كل عنصر من
                عناصر الموقع؟
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-[11px] font-medium text-stone-600">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            شفافية المصادر
          </span>
        </div>

        {/* مقدمة */}
        <div className="flex items-start gap-3 rounded-xl bg-[#FAF7F0] border border-stone-200/90 p-4">
          <Sparkles className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-stone-700">
            حرصنا على أن يكون كل عنصر في هذا الموقع منسوبًا إلى مصدره: نص القرآن من مشروع مفتوح
            المصدر، والتلاوات من شبكة إسلامية متخصصة، والخطوط العربية مضمّنة محليًا داخل حزمة
            الموقع. وهذه الصفحة توثّق ذلك بالروابط والتراخيص.
          </p>
        </div>

        {/* ١) نص القرآن الكريم */}
        <section className="space-y-4">
          <SectionTitle icon={BookOpen} title="نص القرآن الكريم" />
          <p className="text-sm leading-relaxed text-stone-700">
            النص الكامل للقرآن الكريم بالرسم العثماني: ١١٤ سورة و٦٢٣٦ آية، يُقدَّم في ملفات JSON
            ثابتة تُخدَم من الموقع نفسه دون الحاجة إلى واجهة برمجية خارجية.
          </p>

          <div className="rounded-xl border border-stone-200/90 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-stone-900">
                  quran-json — نص القرآن بصيغة JSON
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  مشروع مفتوح المصدر لنص القرآن الكريم، والإصدار المستخدم في الموقع مثبّت على
                  الإصدار 3.1.2 لتفادي التغيّرات غير المتوقعة في النص.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <SourceLink href="https://github.com/risan/quran-json">
                  المستودع على GitHub
                </SourceLink>
                <SourceLink href="https://unpkg.com/quran-json@3.1.2/dist/quran.json">
                  ملف المصدر المباشر
                </SourceLink>
              </div>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80">
                <dt className="text-[11px] text-stone-400">عدد السور</dt>
                <dd className="text-base font-bold font-quran text-stone-900 mt-0.5">١١٤</dd>
              </div>
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80">
                <dt className="text-[11px] text-stone-400">إجمالي الآيات</dt>
                <dd className="text-base font-bold font-quran text-stone-900 mt-0.5">٦٢٣٦</dd>
              </div>
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80">
                <dt className="text-[11px] text-stone-400">الرسم</dt>
                <dd className="text-sm font-bold text-stone-900 mt-1">عثماني مشكول</dd>
              </div>
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80">
                <dt className="text-[11px] text-stone-400">ترخيص البيانات</dt>
                <dd className="text-sm font-bold text-stone-900 mt-1">CC BY 4.0</dd>
              </div>
            </dl>

            <p className="text-xs leading-relaxed text-stone-600">
              <span className="font-bold text-stone-800">الإسناد:</span> بيانات النص مصدرها
              مشروع quran-json برخصة Creative Commons Attribution 4.0 (CC BY 4.0)، وهي تتطلب
              الإسناد إلى المشروع عند إعادة الاستخدام.
            </p>
          </div>

          {/* ملفات البيانات */}
          <div className="rounded-xl border border-stone-200/90 p-4 sm:p-5 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
              <FileJson className="w-4 h-4 text-stone-500" aria-hidden="true" />
              ملفات البيانات المخدومة من الموقع
            </h3>
            <ul className="divide-y divide-stone-100">
              {DATA_FILES.map((file) => (
                <li
                  key={file.path}
                  className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-2.5"
                >
                  <span className="shrink-0 self-start">
                    <CodeLine>{file.path}</CodeLine>
                  </span>
                  <span className="text-xs leading-relaxed text-stone-600">{file.desc}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-stone-500 pt-1">
              تُكتب الملفات نفسها في ثلاثة مجلدات:{' '}
              <CodeLine>assets/data/</CodeLine> و<CodeLine>public/assets/data/</CodeLine> (النسخة
              التي تُخدَم للزائر) و<CodeLine>src/assets/data/</CodeLine> للاستيراد المباشر داخل
              الشيفرة.
            </p>
          </div>

          {/* عينة من الهيكل */}
          <div className="rounded-xl border border-stone-200/90 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                <CodeXml className="w-4 h-4 text-stone-500" aria-hidden="true" />
                هيكل الآية في quran.json
              </h3>
              <span className="font-mono text-[11px] text-stone-400" dir="ltr">
                Array of Objects
              </span>
            </div>
            <div
              className="bg-stone-950 text-stone-100 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed"
              dir="ltr"
            >
              <pre>{`[
  {
    "sura": 1,
    "aya": 1,
    "text": "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ"
  }
]`}</pre>
            </div>
            <p className="text-xs leading-relaxed text-stone-500">
              لا يُعدَّل نص الآية نفسه؛ ويقتصر السكربت على إزالة الفراغات الطرفية ثم كتابة الملفات
              بالهيكل أعلاه.
            </p>
          </div>

          {/* سكربت التوليد */}
          <div className="rounded-xl bg-stone-50 border border-stone-200/70 p-4 text-xs leading-relaxed text-stone-600">
            <span className="font-bold text-stone-800">توليد الملفات:</span> يُولِّد السكربت{' '}
            <CodeLine>scripts/generate_quran_data.mjs</CodeLine> جميع ملفات البيانات من المصدر
            المثبّت بالأمر <CodeLine>node scripts/generate_quran_data.mjs</CodeLine>.
          </div>
        </section>

        {/* ٢) التلاوات الصوتية */}
        <section className="space-y-4">
          <SectionTitle icon={Music} title="التلاوات الصوتية" />
          <p className="text-sm leading-relaxed text-stone-700">
            تلاوات آية بآية لخمسة عشر قارئًا، تُبثّ مباشرةً من شبكة islamic.network عبر شبكة توزيع
            المحتوى cdn.islamic.network، ولا تُخزَّن نسخ من الملفات الصوتية داخل المشروع.
          </p>

          <div className="flex flex-wrap gap-2">
            <SourceLink href="https://islamic.network/">
              شبكة islamic.network
            </SourceLink>
            <SourceLink href="https://cdn.islamic.network/">
              شبكة توزيع المحتوى (CDN)
            </SourceLink>
          </div>

          <div className="rounded-xl border border-stone-200/90 p-4 sm:p-5 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
              <Server className="w-4 h-4 text-stone-500" aria-hidden="true" />
              نمط رابط التلاوة
            </h3>
            <div
              className="bg-stone-950 text-stone-100 p-3.5 rounded-lg font-mono text-[11px] sm:text-xs overflow-x-auto leading-relaxed"
              dir="ltr"
            >
              <pre>{'https://cdn.islamic.network/quran/audio/{bitrate}/{reciter}/{ayah}.mp3'}</pre>
            </div>
            <ul className="space-y-2 text-xs leading-relaxed text-stone-600">
              <li className="flex items-start gap-2">
                <span className="font-mono text-emerald-800 shrink-0" dir="ltr">
                  {'{bitrate}'}
                </span>
                <span>جودة الصوت بالكيلوبت/ثانية: 64 أو 128 حسب القارئ، ويُجرَّب الأعلى أولاً.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-emerald-800 shrink-0" dir="ltr">
                  {'{reciter}'}
                </span>
                <span>
                  معرّف القارئ في الشبكة، مثل <CodeLine>ar.alafasy</CodeLine>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-emerald-800 shrink-0" dir="ltr">
                  {'{ayah}'}
                </span>
                <span>
                  رقم الآية العام في المصحف من 1 إلى 6236، وليس رقمها داخل السورة؛ ويُحسب بجمع
                  آيات السور السابقة ثم إضافة رقم الآية.
                </span>
              </li>
            </ul>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <SourceLink href="https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3">
                مثال: تلاوة العفاسي للآية رقم ١
              </SourceLink>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200/90 p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-bold text-stone-900">
              القرّاء المتاحون آية بآية (١٥ قارئًا)
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {RECITER_NAMES.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center px-2.5 py-1 rounded-md bg-stone-50 border border-stone-200 text-[11px] font-medium text-stone-700"
                >
                  {name}
                </span>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-stone-500">
              يستخدم الموقع عنصر صوت واحدًا يُنشأ مرة واحدة، ويجري تتابع الآيات تلقائيًا مع إمكانية
              تكرار الآية والتنقّل بينها. الملفات الصوتية تُنسب إلى شبكة islamic.network
              وقرّائها، ولا تُضمَّن داخل المستودع.
            </p>
          </div>
        </section>

        {/* ٣) الخطوط */}
        <section className="space-y-4">
          <SectionTitle icon={Type} title="الخطوط" />
          <p className="text-sm leading-relaxed text-stone-700">
            جميع الخطوط مضمّنة محليًا داخل المشروع بملفات TTF و WOFF2 وتُعرَّف عبر{' '}
            <CodeLine>@font-face</CodeLine>، فلا يطلب الموقع أي خط من خدمة خارجية ولا يرسل بيانات
            الزائر إليها، ويبقى عرض الآيات ثابتًا على جميع الأجهزة.
          </p>

          {/* خطوط مجمع الملك فهد */}
          <div className="rounded-xl border border-stone-200/90 p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                  <Landmark className="w-4 h-4 text-stone-500" aria-hidden="true" />
                  خطوط مجمع الملك فهد لطباعة المصحف الشريف (KFGQPC)
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  الخطوط المستخدمة لعرض الآيات: «عثمان طه نسخ» و«خط حفص». وهي ضرورية لأن الخطوط
                  العامة تفتقد محارف الرسم العثماني الدقيقة: الألف الخنجرية، وعلامات الوقف،
                  والمدود، والتشكيل المركّب.
                </p>
              </div>
              <div className="shrink-0">
                <SourceLink href="https://qurancomplex.gov.sa/">
                  الموقع الرسمي للمجمع
                </SourceLink>
              </div>
            </div>
            <ul className="divide-y divide-stone-100">
              <li className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-2.5">
                <span className="shrink-0 self-start">
                  <CodeLine>/assets/fonts/UthmanTahaNaskh.ttf</CodeLine>
                </span>
                <span className="text-xs leading-relaxed text-stone-600">
                  خط عثمان طه — الوزن العادي (حوالي 149 كيلوبايت).
                </span>
              </li>
              <li className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-2.5">
                <span className="shrink-0 self-start">
                  <CodeLine>/assets/fonts/UthmanTahaNaskh-Bold.ttf</CodeLine>
                </span>
                <span className="text-xs leading-relaxed text-stone-600">
                  خط عثمان طه — الوزن العريض (حوالي 171 كيلوبايت).
                </span>
              </li>
              <li className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-2.5">
                <span className="shrink-0 self-start">
                  <CodeLine>/assets/fonts/KFGQPC-Hafs-v18.ttf</CodeLine>
                </span>
                <span className="text-xs leading-relaxed text-stone-600">
                  خط حفص — الإصدار 18 من المجمع (حوالي 237 كيلوبايت)، ويدعم كامل محارف الرسم
                  العثماني للآيات.
                </span>
              </li>
            </ul>
          </div>

          {/* خطوط OFL */}
          <div className="rounded-xl border border-stone-200/90 p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-bold text-stone-900">
              خطوط Amiri و Plus Jakarta Sans — رخصة SIL OFL
            </h3>
            <ul className="space-y-2.5 text-xs leading-relaxed text-stone-600">
              <li className="flex items-start gap-2">
                <CircleCheck
                  className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>
                  <span className="font-bold text-stone-800">خط أميري (Amiri / Amiri Quran):</span>{' '}
                  خط عربي مفتوح المصدر برخصة SIL Open Font License 1.1، يُستخدم كخيار بديل لعرض
                  الآيات، وملفاته WOFF2 مضمّنة في <CodeLine>/fonts/</CodeLine>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CircleCheck
                  className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>
                  <span className="font-bold text-stone-800">خط Plus Jakarta Sans:</span> خط واجهة
                  الموقع اللاتيني (font-sans) برخصة SIL Open Font License 1.1، مضمّن بملفات WOFF2
                  وبأوزان 400 و500 و600 و700.
                </span>
              </li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <SourceLink href="https://fonts.google.com/specimen/Amiri">
                خط Amiri على Google Fonts
              </SourceLink>
              <SourceLink href="https://fonts.google.com/specimen/Plus+Jakarta+Sans">
                خط Plus Jakarta Sans
              </SourceLink>
              <SourceLink href="https://openfontlicense.org/">
                نص رخصة SIL OFL
              </SourceLink>
            </div>
          </div>
        </section>

        {/* ٤) الترخيص */}
        <section className="space-y-4">
          <SectionTitle icon={Scale} title="ترخيص المشروع وكل عنصر" />
          <div className="rounded-xl border border-stone-200/90 p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-stone-900">
                  شيفرة الموقع — رخصة MIT
                </h3>
                <p className="text-xs text-stone-500 mt-1 font-mono" dir="ltr">
                  Copyright (c) 2026 Saif al-Din — quran.com.ly
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <SourceLink href="https://github.com/Gamingmonster2/quran.com.ly/blob/main/LICENSE">
                  نص الرخصة في المستودع
                </SourceLink>
                <SourceLink href="https://opensource.org/license/mit">
                  تعريف رخصة MIT
                </SourceLink>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-stone-600">
              تسمح رخصة MIT باستخدام شيفرة الموقع ونسخها وتعديلها وتوزيعها، بما في ذلك الاستخدام
              التجاري، بشرط الإبقاء على إشعار حقوق النشر والترخيص. وتُقدَّم الشيفرة «كما هي» دون
              ضمان من أي نوع. أما نص القرآن وبياناته والخطوط والتلاوات فلكل منها مصدره وترخيصه
              المبيّن أدناه.
            </p>
          </div>

          <ul className="rounded-xl border border-stone-200/90 divide-y divide-stone-100 overflow-hidden">
            {LICENSE_ROWS.map((row) => (
              <li
                key={row.item}
                className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 p-3.5"
              >
                <span className="text-xs font-bold text-stone-800 shrink-0">{row.item}</span>
                <span className="inline-flex items-center self-start px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-600 shrink-0">
                  {row.license}
                </span>
                <span className="text-[11px] leading-relaxed text-stone-500 sm:mr-auto">
                  {row.note}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ٥) ملاحظات وإبلاغ */}
        <section className="space-y-4">
          <SectionTitle icon={Link2} title="ملاحظات والتحقق من المصادر" />
          <ul className="space-y-2">
            {[
              'جميع روابط المصادر أعلاه تفتح في نافذة جديدة ويمكن التحقق منها في أي وقت.',
              'نص الآيات يُنقل كما ورد في المصدر دون تغيير، ويقتصر التوليد على إزالة الفراغات الطرفية.',
              'لمصادر البيانات الكاملة يمكن الرجوع إلى ملف README في المستودع.',
              'إذا تعطّل رابط أو لاحظت خطأً في الإسناد أو الترخيص فأبلغنا عبر Issues في المستودع.',
            ].map((note) => (
              <li
                key={note}
                className="flex items-start gap-2 p-3 rounded-lg bg-stone-50 border border-stone-200/70 text-xs sm:text-[13px] leading-relaxed text-stone-700"
              >
                <CircleCheck
                  className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{note}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl bg-[#FAF7F0] border border-stone-200/90 p-4">
            <div className="flex items-start gap-3 min-w-0">
              <Terminal className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-stone-600">
                الشيفرة وبيانات المشروع متاحة في مستودع عام على GitHub للمراجعة والمساهمة.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <a
                href="https://github.com/Gamingmonster2/quran.com.ly"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-sm"
              >
                <Github className="w-3.5 h-3.5" aria-hidden="true" />
                <span>المستودع على GitHub</span>
              </a>
              <a
                href="https://github.com/Gamingmonster2/quran.com.ly/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
              >
                <span>Issues</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
