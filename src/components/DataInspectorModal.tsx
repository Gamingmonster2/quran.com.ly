import React, { useState } from 'react';
import { Download, FileJson, Copy, Check, ExternalLink, Code2, Database, Type } from 'lucide-react';
import { Ayah, SurahMeta } from '../types/quran.ts';
import { toArabicDigits } from '../utils/quranHelpers.ts';

interface DataInspectorProps {
  allVerses: Ayah[];
  surahs: SurahMeta[];
  onClose?: () => void;
  isModal?: boolean;
}

export const DataInspectorModal: React.FC<DataInspectorProps> = ({
  allVerses,
  surahs,
  onClose,
  isModal = false,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'schema' | 'code' | 'fonts'>('preview');
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeLang, setCodeLang] = useState<'javascript' | 'python' | 'curl' | 'flutter' | 'react-native' | 'css'>('javascript');

  const sampleVerses = allVerses.slice(0, 7);

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const codeSnippets: Record<string, string> = {
    javascript: `// استيراد وقراءة ملف القرآن الكريم في Node.js / TypeScript
import fs from 'node:fs';

interface Ayah {
  sura: number; // 1 - 114
  aya: number;  // 1 - n
  text: string; // الرسم العثماني
}

const quranData: Ayah[] = JSON.parse(
  fs.readFileSync('./assets/data/quran.json', 'utf-8')
);

console.log(\`إجمالي الآيات: \${quranData.length}\`); // 6236
const firstAyah = quranData[0];
console.log(firstAyah.text); // بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ`,

    python: `# قراءة ملف القرآن الكريم في Python
import json

with open('./assets/data/quran.json', 'r', encoding='utf-8') as f:
    quran = json.load(f)

print(f"إجمالي الآيات: {len(quran)}") # 6236
# تصفية آيات سورة الإخلاص (رقم 112)
ikhlas_ayahs = [v for v in quran if v['sura'] == 112]
for ayah in ikhlas_ayahs:
    print(f"{ayah['aya']}: {ayah['text']}")`,

    curl: `# تنزيل ملف القرآن الكريم الشامل مباشرة
curl -O https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran.json

# أو الوصول للملف المحلي من مسار التطبيق:
# assets/data/quran.json`,

    css: `/* src/index.css - تعريف خطوط الرسم العثماني محلياً */
@font-face {
  font-family: 'KFGQPC Uthman Taha Naskh';
  src: url('/assets/fonts/UthmanTahaNaskh.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'KFGQPC Uthman Taha Naskh';
  src: url('/assets/fonts/UthmanTahaNaskh-Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'KFGQPC Hafs';
  src: url('/assets/fonts/KFGQPC-Hafs-v18.ttf') format('truetype');
  font-display: swap;
}

.mushaf-ayah {
  font-family: 'KFGQPC Uthman Taha Naskh', 'KFGQPC Hafs', serif;
  font-size: 26px;
  line-height: 2.2;
  direction: rtl;
}`,

    flutter: `# pubspec.yaml - تعريف الخطوط داخل تطبيق Flutter
flutter:
  fonts:
    - family: UthmanTaha
      fonts:
        - asset: assets/fonts/UthmanTahaNaskh.ttf
        - asset: assets/fonts/UthmanTahaNaskh-Bold.ttf
          weight: 700
    - family: KFGQPCHafs
      fonts:
        - asset: assets/fonts/KFGQPC-Hafs-v18.ttf

# dart - عرض الآية بالرسم العثماني
Text(
  ayah['text'],
  textDirection: TextDirection.rtl,
  style: const TextStyle(
    fontFamily: 'UthmanTaha',
    fontSize: 26,
    height: 2.2,
  ),
)`,

    'react-native': `// react-native.config.js
module.exports = {
  assets: ['./src/assets/fonts'],
};
// ثم شغّل: npx react-native-asset

// ios/App/Info.plist
<key>UIAppFonts</key>
<array>
  <string>UthmanTahaNaskh.ttf</string>
  <string>UthmanTahaNaskh-Bold.ttf</string>
  <string>KFGQPC-Hafs-v18.ttf</string>
</array>

// android/app/src/main/assets/fonts/
// انسخ ملفات TTF إلى هذا المجلد مباشرةً

<Text style={{ fontFamily: 'UthmanTahaNaskh', fontSize: 26, writingDirection: 'rtl' }}>
  {ayah.text}
</Text>`
  };

  // خطوط الرسم العثماني المضمّنة محلياً داخل التطبيق
  const fontFiles = [
    {
      id: 'uthman-taha',
      name: 'خط عثمان طه — الوزن العادي',
      family: 'KFGQPC Uthman Taha Naskh',
      file: 'UthmanTahaNaskh.ttf',
      path: '/assets/fonts/UthmanTahaNaskh.ttf',
      sizeKb: 149,
      className: 'font-uthman-taha',
      note: 'الخط المعتمد في مصحف المدينة المنورة، يدعم الألف الخنجرية وعلامات الوقف والتشكيل المركّب.',
    },
    {
      id: 'uthman-taha-bold',
      name: 'خط عثمان طه — الوزن العريض',
      family: 'KFGQPC Uthman Taha Naskh (Bold)',
      file: 'UthmanTahaNaskh-Bold.ttf',
      path: '/assets/fonts/UthmanTahaNaskh-Bold.ttf',
      sizeKb: 171,
      className: 'font-uthman-taha',
      note: 'نسخة عريضة من الخط نفسه، مناسبة لعناوين السور وواجهة القارئ.',
    },
    {
      id: 'hafs-v18',
      name: 'خط حفص — الإصدار ١٨',
      family: 'KFGQPC Hafs',
      file: 'KFGQPC-Hafs-v18.ttf',
      path: '/assets/fonts/KFGQPC-Hafs-v18.ttf',
      sizeKb: 237,
      className: 'font-hafs-v18',
      note: 'إصدار 0.18 من مجمع الملك فهد، يدعم كامل محارف الرسم العثماني للآيات.',
    },
    {
      id: 'amiri',
      name: 'خط أميري القرآن',
      family: 'Amiri Quran (SIL OFL)',
      file: 'amiri-quran-normal-400-_Xmo-Hk0rD6DbUL4_vH8Zp5v5i2ssg.woff2',
      path: '/fonts/amiri-quran-normal-400-_Xmo-Hk0rD6DbUL4_vH8Zp5v5i2ssg.woff2',
      sizeKb: 45,
      className: 'font-amiri-quran',
      note: 'خط بديل للعرض على الويب، مضمّن محلياً داخل المشروع برخصة SIL Open Font License.',
    },
  ];


  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(codeSnippets[codeLang]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const content = (
    <div className="space-y-6 text-right">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-quran text-stone-900">
              مستودع بيانات القرآن الكريم (quran.json)
            </h2>
            <p className="text-xs text-stone-500 font-sans mt-0.5">
              بيانات مفتوحة المصدر بالرسم العثماني التام (Hafs Uthmani Script)
            </p>
          </div>
        </div>

        {/* Download Buttons Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadFile('/assets/data/quran.json', 'quran.json')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تنزيل quran.json (١.٦ ميغابايت)</span>
          </button>
          <button
            onClick={() =>
              downloadFile('/assets/data/quran-by-surah.json', 'quran-by-surah.json')
            }
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg transition-colors shadow-2xs"
          >
            <FileJson className="w-3.5 h-3.5 text-stone-500" />
            <span>مقسم حسب السور</span>
          </button>
        </div>
      </div>

      {/* Dataset Specs Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
          <div className="text-stone-400">عدد السور الكلي</div>
          <div className="text-lg font-bold font-mono text-stone-900 mt-1">
            {surahs.length || 114}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
          <div className="text-stone-400">إجمالي الآيات</div>
          <div className="text-lg font-bold font-mono text-stone-900 mt-1">
            {allVerses.length || 6236}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
          <div className="text-stone-400">الرسم والخط</div>
          <div className="text-lg font-bold text-stone-900 mt-1">
            عثماني مشكول
          </div>
        </div>
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
          <div className="text-stone-400">مسار الملف في المشروع</div>
          <div className="text-xs font-mono text-emerald-800 font-semibold mt-1.5 truncate" dir="ltr">
            assets/data/quran.json
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 text-xs font-sans">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'preview'
                ? 'border-stone-900 text-stone-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            معاينة البيانات (Live Preview)
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'schema'
                ? 'border-stone-900 text-stone-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            هيكلية الـ JSON (Schema)
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'code'
                ? 'border-stone-900 text-stone-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            أمثلة برمجية للاستخدام
          </button>
          <button
            onClick={() => {
              setActiveTab('fonts');
              if (!['css', 'flutter', 'react-native'].includes(codeLang)) {
                setCodeLang('css');
              }
            }}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'fonts'
                ? 'border-stone-900 text-stone-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            الخطوط (Fonts)
          </button>
        </div>

        {(activeTab === 'code' || activeTab === 'fonts') && (
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>تم النسخ!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الكود</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Tab 1: Live Preview */}
      {activeTab === 'preview' && (
        <div className="space-y-2">
          <div className="text-xs text-stone-500 font-sans flex items-center justify-between">
            <span>عينة من أول ٧ آيات (سورة الفاتحة كاملة بالرسم العثماني):</span>
            <span className="font-mono text-stone-400">Array of Objects</span>
          </div>
          <div
            className="bg-stone-950 text-stone-100 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-72 leading-relaxed"
            dir="ltr"
          >
            <pre>{JSON.stringify(sampleVerses, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Tab 2: Schema */}
      {activeTab === 'schema' && (
        <div className="bg-white border border-stone-200/90 rounded-xl p-5 space-y-4 font-sans text-xs">
          <h4 className="font-bold text-stone-900 text-sm">
            مواصفات هيكل كل كائن آية في ملف quran.json:
          </h4>
          <div className="divide-y divide-stone-100">
            <div className="py-2.5 flex items-start justify-between gap-4">
              <div>
                <span className="font-mono font-bold text-emerald-700">sura</span>
                <span className="text-stone-400 mr-2">(number)</span>
                <p className="text-stone-600 mt-0.5">
                  رقم السورة في المصحف الشريف من ١ (الفاتحة) إلى ١١٤ (الناس).
                </p>
              </div>
              <span className="font-mono text-stone-400 shrink-0">1 .. 114</span>
            </div>

            <div className="py-2.5 flex items-start justify-between gap-4">
              <div>
                <span className="font-mono font-bold text-emerald-700">aya</span>
                <span className="text-stone-400 mr-2">(number)</span>
                <p className="text-stone-600 mt-0.5">
                  رقم الآية داخل السورة المحددة تسلسلياً بدءاً من ١.
                </p>
              </div>
              <span className="font-mono text-stone-400 shrink-0">1 .. n</span>
            </div>

            <div className="py-2.5 flex items-start justify-between gap-4">
              <div>
                <span className="font-mono font-bold text-emerald-700">text</span>
                <span className="text-stone-400 mr-2">(string)</span>
                <p className="text-stone-600 mt-0.5">
                  نص الآية الكريمة بالرسم العثماني التام مع كامل علامات التشكيل، المدود، وعلامات الوقف المعتمدة بمصحف المدينة المنورة.
                </p>
              </div>
              <span className="font-mono text-stone-400 shrink-0">UTF-8 Uthmani</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Code Snippets */}
      {activeTab === 'code' && (
        <div className="space-y-3 font-sans">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(
              [
                ['javascript', 'JavaScript / Node.js'],
                ['python', 'Python'],
                ['curl', 'cURL / Shell'],
                ['css', 'CSS'],
                ['flutter', 'Flutter'],
                ['react-native', 'React Native'],
              ] as const
            ).map(([lang, label]) => (
              <button
                key={lang}
                onClick={() => setCodeLang(lang)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  codeLang === lang
                    ? 'bg-stone-900 text-white font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            className="bg-stone-950 text-stone-100 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed"
            dir="ltr"
          >
            <pre>{codeSnippets[codeLang]}</pre>
          </div>
        </div>
      )}

      {/* Tab 4: Fonts */}
      {activeTab === 'fonts' && (
        <div className="space-y-5 font-sans text-xs">
          <div className="bg-[#FAF7F0] border border-stone-200/90 rounded-xl p-4">
            <h4 className="font-bold text-stone-900 text-sm">
              خطوط الرسم العثماني المضمّنة في التطبيق
            </h4>
            <p className="text-stone-600 mt-1.5 leading-relaxed">
              تم تضمين خطوط مجمع الملك فهد لطباعة المصحف الشريف محلياً بدلاً من الاعتماد على خطوط
              النظام، لأن الخطوط العادية تفتقد محارف الرسم العثماني الدقيقة: الألف الخنجرية (ٰ)،
              وعلامات الوقف، ورمز السجدة، والمدود والتشكيل المركّب. تضمين الخطوط محلياً يضمن ثبات شكل
              الآيات وتطابقها على جميع الأجهزة.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {fontFiles.map((font) => (
              <div
                key={font.id}
                className="bg-white border border-stone-200/90 rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center shrink-0">
                      <Type className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-stone-900 truncate">{font.name}</div>
                      <div className="font-mono text-[10px] text-stone-400 truncate" dir="ltr">
                        {font.path}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (font.sizeKb !== null) {
                        downloadFile(font.path, font.file);
                      }
                    }}
                    disabled={font.sizeKb === null}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors shrink-0 ${
                      font.sizeKb === null
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                        : 'bg-stone-900 text-white hover:bg-stone-800'
                    }`}
                  >
                    <Download className="w-3 h-3" />
                    <span>تنزيل</span>
                  </button>
                </div>

                <div
                  dir="rtl"
                  className={`${font.className} text-xl leading-loose text-center text-stone-900 bg-[#FAF7F0] border border-stone-200/70 rounded-lg px-3 py-2`}
                >
                  بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
                </div>

                <p className="text-stone-500 leading-relaxed">{font.note}</p>
                <div className="flex items-center justify-between gap-2 text-[11px] text-stone-400">
                  <span className="font-mono truncate" dir="ltr">
                    {font.family}
                  </span>
                  {font.sizeKb !== null && (
                    <span className="shrink-0">{toArabicDigits(font.sizeKb)} كيلوبايت</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold text-stone-900 text-sm">
                طريقة تعريف الخط في CSS و Flutter و React Native
              </h4>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {(
                  [
                    ['css', 'CSS @font-face'],
                    ['flutter', 'Flutter'],
                    ['react-native', 'React Native'],
                  ] as const
                ).map(([lang, label]) => (
                  <button
                    key={lang}
                    onClick={() => setCodeLang(lang)}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      codeLang === lang
                        ? 'bg-stone-900 text-white font-semibold'
                        : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="bg-stone-950 text-stone-100 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed"
              dir="ltr"
            >
              <pre>{codeSnippets[codeLang]}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute left-6 top-6 p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors text-xs font-sans"
            >
              إغلاق ✕
            </button>
          )}
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
        {content}
      </div>
    </div>
  );
};
