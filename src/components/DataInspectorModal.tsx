import React, { useState } from 'react';
import { Download, FileJson, Copy, Check, ExternalLink, Code2, Database } from 'lucide-react';
import { Ayah, SurahMeta } from '../types/quran.ts';

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
# assets/data/quran.json`
  };

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
      <div className="flex items-center justify-between border-b border-stone-200 text-xs font-sans">
        <div className="flex items-center gap-2">
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
        </div>

        {activeTab === 'code' && (
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
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setCodeLang('javascript')}
              className={`px-3 py-1 rounded-md transition-colors ${
                codeLang === 'javascript'
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              JavaScript / Node.js
            </button>
            <button
              onClick={() => setCodeLang('python')}
              className={`px-3 py-1 rounded-md transition-colors ${
                codeLang === 'python'
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setCodeLang('curl')}
              className={`px-3 py-1 rounded-md transition-colors ${
                codeLang === 'curl'
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              cURL / Shell
            </button>
          </div>

          <div
            className="bg-stone-950 text-stone-100 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed"
            dir="ltr"
          >
            <pre>{codeSnippets[codeLang]}</pre>
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
