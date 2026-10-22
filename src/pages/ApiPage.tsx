import React from 'react';
import { Code2, Database, Download, Globe2, ShieldCheck } from 'lucide-react';

// حلقة تركيز موحّدة وواضحة لمستخدمي لوحة المفاتيح
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

interface Endpoint {
  path: string;
  title: string;
  description: string;
  sample: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    path: '/assets/data/surahs.json',
    title: 'فهرس السور',
    description: '١١٤ سورة مع الاسم والترجمة والنوع وعدد الآيات.',
    sample: 'GET https://quran.com.ly/assets/data/surahs.json',
  },
  {
    path: '/assets/data/quran.json',
    title: 'كل الآيات (مصفوفة واحدة)',
    description: '٦٢٣٦ آية بالرسم العثماني بصيغة { sura, aya, text }.',
    sample: 'GET https://quran.com.ly/assets/data/quran.json',
  },
  {
    path: '/assets/data/quran-by-surah.json',
    title: 'الآيات مقسّمة حسب السور',
    description: 'كل سورة مع بياناتها وآياتها في كائن واحد.',
    sample: 'GET https://quran.com.ly/assets/data/quran-by-surah.json',
  },
  {
    path: '/assets/data/surahs/{1..114}.json',
    title: 'سورة منفردة',
    description: 'ملف صغير لسورة واحدة، مناسب للتطبيقات التي تحمّل عند الطلب.',
    sample: 'GET https://quran.com.ly/assets/data/surahs/2.json',
  },
  {
    path: '/assets/data/translations/en-sahih-international/{1..114}.json',
    title: 'الترجمة الإنجليزية',
    description: 'ترجمة Saheeh International لكل آية في السورة.',
    sample:
      'GET https://quran.com.ly/assets/data/translations/en-sahih-international/2.json',
  },
  {
    path: '/assets/data/tafsir/muyassar/{1..114}.json',
    title: 'التفسير الميسر',
    description: 'تفسير عربي مختصر لكل آية في السورة.',
    sample: 'GET https://quran.com.ly/assets/data/tafsir/muyassar/2.json',
  },
  {
    path: '/assets/data/words/{1..114}.json',
    title: 'كلمة بكلمة',
    description: 'كل كلمة مع معناها الإنجليزي والنقل الصوتي وموقعها.',
    sample: 'GET https://quran.com.ly/assets/data/words/1.json',
  },
];

const RECITER_SAMPLE =
  'https://cdn.islamic.network/quran/audio/128/ar.alafasy/262.mp3';

export default function ApiPage() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-200">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-stone-500 font-sans text-xs">
              <Code2 aria-hidden="true" className="w-4 h-4" />
              <span>واجهة البيانات المفتوحة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-quran text-stone-900">
              واجهة البيانات (Content API)
            </h1>
            <p className="text-sm text-stone-500 font-sans leading-relaxed">
              كل بيانات الموقع متاحة كملفات JSON ثابتة على نفس النطاق، دون مفاتيح API
              ولا حدود طلبات، ومع تفعيل CORS لأي تطبيق أو موقع.
            </p>
          </div>
          <a
            href="https://github.com/Gamingmonster2/quran.com.ly/blob/main/docs/API.md"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-stone-800 ${FOCUS_RING}`}
          >
            <Download aria-hidden="true" className="w-4 h-4" />
            <span>التوثيق الكامل</span>
          </a>
        </header>

        {/* Quick facts */}
        <section className="grid gap-3 sm:grid-cols-3 text-xs font-sans">
          <div className="rounded-xl border border-stone-200/80 bg-stone-50 p-3.5">
            <Globe2 aria-hidden="true" className="mb-1.5 h-4 w-4 text-emerald-700" />
            <div className="font-bold text-stone-800">CORS مفتوح</div>
            <p className="mt-1 text-stone-500 leading-relaxed">
              رأس <span className="font-mono" dir="ltr">Access-Control-Allow-Origin: *</span>{' '}
              على كل مسارات البيانات.
            </p>
          </div>
          <div className="rounded-xl border border-stone-200/80 bg-stone-50 p-3.5">
            <Database aria-hidden="true" className="mb-1.5 h-4 w-4 text-emerald-700" />
            <div className="font-bold text-stone-800">ثابت ومسرَّع</div>
            <p className="mt-1 text-stone-500 leading-relaxed">
              ملفات على CDN مع كاش يوم واحد، بلا كتابة ولا مصادقة.
            </p>
          </div>
          <div className="rounded-xl border border-stone-200/80 bg-stone-50 p-3.5">
            <ShieldCheck aria-hidden="true" className="mb-1.5 h-4 w-4 text-emerald-700" />
            <div className="font-bold text-stone-800">مفتوح مع الإسناد</div>
            <p className="mt-1 text-stone-500 leading-relaxed">
              نص القرآن برخصة CC BY 4.0، وشيفرة المشروع برخصة MIT.
            </p>
          </div>
        </section>

        {/* Endpoints */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold font-quran text-stone-900">نقاط النهاية</h2>
          <div className="space-y-2.5">
            {ENDPOINTS.map((endpoint) => (
              <article
                key={endpoint.path}
                className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs"
              >
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-bold text-stone-900 font-sans">
                    {endpoint.title}
                  </h3>
                  <code
                    dir="ltr"
                    className="rounded bg-[#FAF7F0] px-2 py-1 text-[11px] text-stone-600 font-mono"
                  >
                    {endpoint.path}
                  </code>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-500 font-sans">
                  {endpoint.description}
                </p>
                <pre
                  dir="ltr"
                  className="mt-2 overflow-x-auto rounded-lg bg-stone-950 p-2.5 text-[11px] text-stone-100 font-mono"
                >
                  {endpoint.sample}
                </pre>
              </article>
            ))}
          </div>
        </section>

        {/* Audio + example */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold font-quran text-stone-900">
            التلاوات الصوتية (آية بآية)
          </h2>
          <p className="text-xs leading-relaxed text-stone-500 font-sans">
            تُبنى روابط التلاوة على الرقم العام للآية (١..٦٢٣٦) وفق نمط ثابت. مثال للبقرة
            الآية ٢٥٥ (رقمها العام ٢٦٢):
          </p>
          <pre
            dir="ltr"
            className="overflow-x-auto rounded-lg bg-stone-950 p-3 text-[11px] text-stone-100 font-mono"
          >
            {RECITER_SAMPLE}
          </pre>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold font-quran text-stone-900">
            مثال استخدام (JavaScript)
          </h2>
          <pre
            dir="ltr"
            className="overflow-x-auto rounded-lg bg-stone-950 p-3 text-[11px] text-stone-100 font-mono leading-relaxed"
          >
            {`const surahs = await fetch(
  'https://quran.com.ly/assets/data/surahs.json'
).then((r) => r.json());

const alBaqarah = await fetch(
  'https://quran.com.ly/assets/data/surahs/2.json'
).then((r) => r.json());

console.log(alBaqarah.verses[0].text); // الٓمٓ`}
          </pre>
        </section>

        <footer className="border-t border-stone-200 pt-4 text-xs text-stone-500 font-sans leading-relaxed">
          للتوثيق التفصيلي والتراخيص راجع{' '}
          <a
            href="https://github.com/Gamingmonster2/quran.com.ly/blob/main/docs/API.md"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-800 underline decoration-emerald-700/40"
          >
            docs/API.md
          </a>
          . هذه الواجهة ثابتة للقراءة فقط؛ نرجو عدم إغراق CDN بطلبات آلية كثيفة.
        </footer>
      </div>
    </div>
  );
}
