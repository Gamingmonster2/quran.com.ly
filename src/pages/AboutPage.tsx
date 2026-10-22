import {
  BookOpen,
  Bookmark,
  CodeXml,
  Database,
  ExternalLink,
  Github,
  Globe,
  Heart,
  Info,
  Layers,
  Music,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
  Type,
  type LucideIcon,
} from 'lucide-react';

/** أرقام المشروع الأساسية */
const STATS = [
  { value: '١١٤', label: 'سورة' },
  { value: '٦٢٣٦', label: 'آية بالرسم العثماني' },
  { value: '١٥', label: 'قارئًا للتلاوة' },
  { value: '٢', label: 'سمتان: ليلي وبيج' },
];

/** مراحل بناء المشروع كما هي في تاريخه */
const BUILD_STORY = [
  {
    title: 'فكرة وهيكل أولي',
    text: 'بدأت الفكرة بهيكل مبدئي بسيط لعرض نص القرآن الكريم، ثم اتضحت ملامح تجربة كاملة تجمع القراءة والاستماع والبحث والبيانات في صفحة واحدة.',
  },
  {
    title: 'جمع البيانات وتوليدها',
    text: 'جُمع نص القرآن الكريم بالرسم العثماني في ملفات JSON موحّدة، وأُعدّ سكربت لتوليد ملفات الموقع من المصدر المفتوح مع تثبيت رقم الإصدار لتفادي التغيّرات المفاجئة.',
  },
  {
    title: 'واجهة القراءة والتلاوة',
    text: 'بُنيت واجهة القراءة آية بآية والقراءة المتصلة، ومشغّل التلاوة آية بآية مع تتابع تلقائي وتكرار وتنقّل بين الآيات، مع تعدّد القرّاء وحفظ القارئ المختار.',
  },
  {
    title: 'البحث والعلامات والسمات',
    text: 'أُضيف البحث الفوري في جميع الآيات مع تجاوز التشكيل، وفهرس السور، والعلامات المرجعية المحفوظة في المتصفح، والسمتان الليلية والبيج مع حفظ التفضيل.',
  },
  {
    title: 'النشر والصيانة',
    text: 'نُشر الموقع على Cloudflare Pages على النطاق quran.com.ly مع بيانات وصفية لمحركات البحث، ويُصان المشروع ويُحسّن باستمرار بعد النشر.',
  },
];

/** المكوّنات والتقنيات المستخدمة في بناء الموقع */
const TECHNOLOGIES = [
  'React 19',
  'TypeScript',
  'Vite',
  'Tailwind CSS 4',
  'lucide-react',
  'Cloudflare Pages',
  'ملفات JSON ثابتة',
  'خطوط TTF و WOFF2 مضمّنة',
];

/** أبرز ما يقدّمه الموقع للزائر */
const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: BookOpen,
    title: 'نص كامل بالرسم العثماني',
    text: '١١٤ سورة و٦٢٣٦ آية بالرسم العثماني المشكول، مع التحكم بحجم الخط والاختيار بين أكثر من خط.',
  },
  {
    icon: Music,
    title: 'تلاوات آية بآية',
    text: '١٥ قارئًا مع تشغيل متتابع للآيات، وتكرار للآية، وتنقّل بين السابق والتالي، وحفظ اختيار القارئ.',
  },
  {
    icon: Search,
    title: 'بحث فوري وفهرس للسور',
    text: 'بحث في جميع الآيات يتجاوز التشكيل وصور الألف، وفهرس سور بالاسم أو الرقم مع تصفية مكية ومدنية.',
  },
  {
    icon: Palette,
    title: 'وضعا قراءة وسمتان',
    text: 'عرض آية بآية أو قراءة متصلة على شكل المصحف، وسمتان: ليلي افتراضية وبيج مريحة للعين.',
  },
  {
    icon: Bookmark,
    title: 'علامات مرجعية',
    text: 'حفظ الآيات التي يرغب الزائر بالرجوع إليها داخل متصفحه، مع قائمة مستقلة للعلامات المحفوظة.',
  },
  {
    icon: Database,
    title: 'مستودع بيانات مفتوح',
    text: 'معاينة بيانات JSON وهيكلها وأمثلة استخدام بلغات متعددة، وتنزيل quran.json وquran-by-surah.json.',
  },
  {
    icon: Type,
    title: 'خطوط المصحف مضمّنة محليًا',
    text: 'خطوط مجمع الملك فهد لطباعة المصحف الشريف (KFGQPC) مع خط أميري القرآن، بلا اعتماد على خدمة خطوط خارجية.',
  },
  {
    icon: Globe,
    title: 'واجهة عربية أصلية',
    text: 'واجهة من اليمين إلى اليسار تعمل على الجوال والحاسوب، مع بيانات وصفية وبنية دلالية تساعد محركات البحث.',
  },
];

/** مبادئ ثابتة يلتزم بها المشروع */
const PRINCIPLES = [
  'لا إعلانات ولا شبكات تتبّع إعلاني.',
  'لا حسابات ولا تسجيل دخول لاستخدام الموقع.',
  'تُحفظ السمة والقارئ المختار والعلامات في متصفح الزائر فقط.',
  'الشيفرة منشورة للعموم تحت رخصة MIT ويمكن لأي شخص مراجعتها.',
];

export default function AboutPage() {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
        {/* ترويسة الصفحة */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0">
              <Info className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold font-quran text-stone-900">
                عن المشروع
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 font-sans mt-1 leading-relaxed">
                مصحف إلكتروني وقاعدة بيانات مفتوحة المصدر للقرآن الكريم بالرسم العثماني على
                النطاق quran.com.ly.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-[11px] font-medium text-stone-600">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            مفتوح المصدر · MIT
          </span>
        </div>

        {/* آية افتتاحية من نص الموقع */}
        <figure className="rounded-xl bg-[#FAF7F0] border border-stone-200/90 px-5 py-6 text-center">
          <blockquote>
            <p className="font-quran text-xl sm:text-2xl leading-loose text-stone-900">
              ﴿ أَوۡ زِدۡ عَلَيۡهِ وَرَتِّلِ ٱلۡقُرۡءَانَ تَرۡتِيلًا ﴾
            </p>
          </blockquote>
          <figcaption className="mt-2 text-xs text-stone-500 font-sans">
            سورة المزمل · الآية ٤
          </figcaption>
        </figure>

        {/* أرقام سريعة */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 text-center"
            >
              <div className="text-xl sm:text-2xl font-bold font-quran text-stone-900">
                {stat.value}
              </div>
              <div className="text-[11px] sm:text-xs text-stone-500 mt-1 leading-snug">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* الفكرة */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-stone-900">
            <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <Heart className="w-4 h-4" aria-hidden="true" />
            </span>
            الفكرة
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-stone-700">
            <p>
              الفكرة أن يجد القارئ مصحفًا إلكترونيًا خفيفًا وسريعًا بالرسم العثماني، يقرأ فيه
              ويستمع ويتنقّل في السور دون تعقيد، وأن يجد المطوّر في الوقت نفسه بيانات القرآن
              الكريم نفسها بصيغة منظمة يستطيع البناء عليها في تطبيقاته ومواقعه.
            </p>
            <p>
              لذلك لا يحتاج الموقع إلى حساب أو تسجيل دخول، ولا يعرض إعلانات: كل ما يحفظه
              الموقع — السمة والقارئ المختار والعلامات المرجعية — يبقى داخل متصفح الزائر ولا
              يُرسل إلى أي جهة.
            </p>
            <p>
              الرسم العثماني ليس تحسينًا شكليًا: فعلامات الوقف والمدود والألف الخنجرية من صميم
              ضبط النص. ولذلك يعتمد الموقع خطوط مجمع الملك فهد لطباعة المصحف الشريف مضمّنةً
              محليًا بدل الاعتماد على خطوط النظام التي تفتقد هذه المحارف الدقيقة.
            </p>
          </div>
        </section>

        {/* قصة البناء */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-stone-900">
            <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" aria-hidden="true" />
            </span>
            قصة البناء
          </h2>
          <ol className="space-y-3">
            {BUILD_STORY.map((step, index) => (
              <li
                key={step.title}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200/80"
              >
                <span className="w-7 h-7 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-stone-900">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-stone-600 mt-1">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* إشارة واحدة بسيطة إلى المساعدة الأولية في جلب بيانات JSON */}
          <div className="flex items-start gap-3 rounded-xl bg-[#FAF7F0] border border-stone-200/90 p-4">
            <Sparkles className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-stone-700">
              بدأ المشروع بمساعدة أدوات Google AI Studio في جلب بيانات القرآن الكريم بصيغة
              JSON، ثم أُكمل تطويره وتخصيصه وصيانته بالكامل من صاحب المشروع.
            </p>
          </div>
        </section>

        {/* صاحب المشروع */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-stone-900">
            <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <Heart className="w-4 h-4" aria-hidden="true" />
            </span>
            صاحب المشروع
          </h2>
          <div className="flex flex-col sm:flex-row items-start gap-4 rounded-xl border border-stone-200/90 bg-stone-50 p-4 sm:p-5">
            <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0">
              <span className="font-quran text-xl">س</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-stone-900">سيف الدين</h3>
              <p className="text-xs text-stone-500 mt-0.5">مبتكر المشروع ومطوّره وصائنه</p>
              <p className="text-sm leading-relaxed text-stone-700 mt-2">
                تولّى صاحب المشروع تصميم الواجهات وتطوير المزايا وتخصيص المشروع وصيانته بعد
                المرحلة الأولى، وأُطلق الموقع على النطاق{' '}
                <span dir="ltr" className="font-mono text-[13px]">
                  quran.com.ly
                </span>
                ، وتُدار الشيفرة والإصدارات في مستودع عام على GitHub.
              </p>
              <a
                href="https://github.com/Gamingmonster2/quran.com.ly"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-emerald-800 hover:text-emerald-900 transition-colors"
              >
                <Github className="w-4 h-4" aria-hidden="true" />
                <span>مستودع المشروع على GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        {/* التقنيات */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-stone-900">
            <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <CodeXml className="w-4 h-4" aria-hidden="true" />
            </span>
            التقنيات
          </h2>
          <div className="flex flex-wrap gap-2">
            {TECHNOLOGIES.map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700"
              >
                {tech}
              </span>
            ))}
          </div>
          <p className="text-sm leading-relaxed text-stone-600">
            يعمل الموقع بالكامل على ملفات بيانات محلية تُخدَّم من الموقع نفسه، دون حاجة إلى خادم
            خلفي؛ أما التلاوات الصوتية فتُبثّ آية بآية من شبكة islamic.network. ويمكن معرفة
            تفاصيل كل مصدر ورخصته في صفحة المصادر.
          </p>
        </section>

        {/* مزايا الموقع */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-stone-900">
            <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
            </span>
            مزايا الموقع
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <h3 className="text-sm font-bold text-stone-900">{feature.title}</h3>
                  </div>
                  <p className="text-xs sm:text-[13px] leading-relaxed text-stone-600 mt-2">
                    {feature.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* مبادئ المشروع */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-stone-900">
            <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            </span>
            مبادئ المشروع
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {PRINCIPLES.map((principle) => (
              <li
                key={principle}
                className="flex items-start gap-2 p-3 rounded-lg bg-stone-50 border border-stone-200/70 text-xs sm:text-[13px] leading-relaxed text-stone-700"
              >
                <ShieldCheck
                  className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{principle}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* شريط الترخيص */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-stone-200/90 bg-[#FAF7F0] p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-sm font-bold text-stone-900">مشروع مفتوح المصدر برخصة MIT</p>
            <p className="text-xs leading-relaxed text-stone-600 mt-1">
              الشيفرة متاحة للمراجعة والمساهمة، وبيانات القرآن منشورة بصيغة JSON للاستخدام،
              وتفاصيل المصادر والتراخيص موضّحة في صفحة المصادر.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
              href="https://github.com/Gamingmonster2/quran.com.ly/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <span>نص الرخصة</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
