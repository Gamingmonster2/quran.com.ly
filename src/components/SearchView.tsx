import React, { useState, useMemo } from 'react';
import { Search, Play, ArrowLeft } from 'lucide-react';
import { Ayah, SurahMeta } from '../types/quran.ts';
import { toArabicDigits } from '../utils/quranHelpers.ts';
import { buildSearchIndex, searchAyahs } from '../utils/searchIndex.ts';

interface SearchViewProps {
  allVerses: Ayah[];
  surahs: SurahMeta[];
  onSelectResult: (suraId: number, ayaNumber: number) => void;
  onPlayAyah: (ayah: Ayah) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  allVerses,
  surahs,
  onSelectResult,
  onPlayAyah,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSurahFilter, setSelectedSurahFilter] = useState<number | 'all'>('all');

  const surahMap = useMemo(() => {
    const map = new Map<number, SurahMeta>();
    surahs.forEach((s) => map.set(s.id, s));
    return map;
  }, [surahs]);

  // فهرس البحث المقلوب: يُبنى مرة واحدة عند توفّر الآيات ثم يُعاد استخدامه
  const searchIndex = useMemo(() => buildSearchIndex(allVerses), [allVerses]);

  const searchResults = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed || trimmed.length < 2) return [];

    const matches: { ayah: Ayah; surah: SurahMeta }[] = [];
    const results = searchAyahs(searchIndex, trimmed, {
      limit: 100,
      surahId: selectedSurahFilter,
    });

    for (const { ayah } of results) {
      const surah = surahMap.get(ayah.sura);
      if (surah) matches.push({ ayah, surah });
    }

    return matches;
  }, [searchIndex, searchTerm, selectedSurahFilter, surahMap]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Search Header */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs mb-6">
        <h2 className="text-2xl font-bold font-quran text-stone-900 mb-2 text-right">
          البحث في آيات القرآن الكريم
        </h2>
        <p className="text-xs text-stone-500 font-sans mb-5 text-right">
          ابحث في جميع آيات القرآن الكريم الـ ٦,٢٣٦ بالرسم العثماني مع إمكانية البحث بدون تشكيل
        </p>

        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="اكتب كلمة أو جملة من الآية (مثال: الصابرين، إياك نعبد، الحمد لله)..."
              className="w-full pl-4 pr-10 py-3 text-base bg-stone-50 border border-stone-300 rounded-xl placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-800 focus:border-stone-800 transition-all text-right"
              autoFocus
            />
            <Search className="w-5 h-5 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600 font-sans">
            <div className="flex items-center gap-2">
              <span>تصفية بالسورة:</span>
              <select
                value={selectedSurahFilter}
                onChange={(e) =>
                  setSelectedSurahFilter(
                    e.target.value === 'all' ? 'all' : Number(e.target.value)
                  )
                }
                className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-800"
              >
                <option value="all">جميع السور (١١٤)</option>
                {surahs.map((s) => (
                  <option key={s.id} value={s.id}>
                    سورة {s.name} ({toArabicDigits(s.id)})
                  </option>
                ))}
              </select>
            </div>

            {searchTerm.trim().length >= 2 && (
              <div className="text-stone-500">
                نتائج البحث: <span className="font-bold text-stone-900 font-mono">{searchResults.length}</span> آية
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {searchTerm.trim().length < 2 ? (
          <div className="text-center py-12 bg-[#FAF7F0] border border-stone-200/70 rounded-2xl text-stone-500 text-sm">
            أدخل حرفين على الأقل للبدء في البحث المباشر
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-12 bg-white border border-stone-200/70 rounded-2xl text-stone-500 text-sm">
            لم يتم العثور على آيات تطابق &quot;{searchTerm}&quot;
          </div>
        ) : (
          searchResults.map(({ ayah, surah }) => (
            <div
              key={`${ayah.sura}-${ayah.aya}`}
              className="bg-white border border-stone-200/80 hover:border-stone-300 rounded-xl p-5 shadow-xs transition-colors"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-100 text-xs text-stone-500 font-sans">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-800">
                    سورة {surah.name}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>الآية {toArabicDigits(ayah.aya)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-stone-400">
                    {ayah.sura}:{ayah.aya}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPlayAyah(ayah)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                    title="استماع"
                  >
                    <Play className="w-3 h-3" />
                    <span>تلاوة</span>
                  </button>
                  <button
                    onClick={() => onSelectResult(ayah.sura, ayah.aya)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white transition-colors"
                  >
                    <span>فتح في المصحف</span>
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Quranic Text */}
              <p className="font-quran text-xl text-stone-900 leading-loose text-right">
                {ayah.text}
                <span className="inline-flex items-center justify-center font-amiri text-stone-500 mx-2 text-xs border border-stone-300 rounded-full w-6 h-6 align-middle bg-stone-50">
                  {toArabicDigits(ayah.aya)}
                </span>
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
