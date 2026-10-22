import React, { useState, useMemo } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { SurahMeta } from '../types/quran.ts';
import { toArabicDigits, normalizeArabicText } from '../utils/quranHelpers.ts';

interface SurahListProps {
  surahs: SurahMeta[];
  selectedSurahId: number;
  onSelectSurah: (id: number) => void;
}

export const SurahList: React.FC<SurahListProps> = ({
  surahs,
  selectedSurahId,
  onSelectSurah,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'meccan' | 'medinan'>('all');

  const filteredSurahs = useMemo(() => {
    const q = normalizeArabicText(query);
    return surahs.filter((s) => {
      // Type filter
      if (filterType !== 'all' && s.type !== filterType) {
        return false;
      }
      if (!q) return true;

      const normName = normalizeArabicText(s.name);
      const normTrans = s.transliteration.toLowerCase();
      const numMatch = String(s.id).includes(q) || toArabicDigits(s.id).includes(query);

      return normName.includes(q) || normTrans.includes(q.toLowerCase()) || numMatch;
    });
  }, [surahs, query, filterType]);

  return (
    <aside className="w-full md:w-80 lg:w-96 shrink-0 bg-[#F7F4EE] border-l border-stone-200 flex flex-col h-[calc(100vh-4rem)]">
      {/* Search & Filter Header */}
      <div className="p-4 border-b border-stone-200 bg-[#FAF7F0] space-y-3">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث برقم أو اسم السورة..."
            className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-800 focus:border-stone-800 transition-all text-right"
          />
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter buttons - interactive filter tabs */}
        <div className="flex items-center gap-1 p-1 bg-stone-200/60 rounded-lg text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1 rounded-md font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            الكل (١١٤)
          </button>
          <button
            onClick={() => setFilterType('meccan')}
            className={`flex-1 py-1 rounded-md font-medium transition-colors ${
              filterType === 'meccan'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            مكية (٨٦)
          </button>
          <button
            onClick={() => setFilterType('medinan')}
            className={`flex-1 py-1 rounded-md font-medium transition-colors ${
              filterType === 'medinan'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            مدنية (٢٨)
          </button>
        </div>
      </div>

      {/* Surah List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-stone-200/70">
        {filteredSurahs.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-500">
            لا توجد سورة مطابقة لبحثك
          </div>
        ) : (
          filteredSurahs.map((surah) => {
            const isSelected = surah.id === selectedSurahId;
            return (
              <button
                key={surah.id}
                onClick={() => onSelectSurah(surah.id)}
                className={`w-full text-right p-3.5 flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-white border-r-2 border-stone-800 text-stone-950 shadow-xs'
                    : 'hover:bg-stone-100/70 text-stone-800'
                }`}
              >
                {/* Surah number & Names */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-amiri text-sm font-bold border transition-colors ${
                      isSelected
                        ? 'bg-stone-900 text-[#FBF9F5] border-stone-900'
                        : 'bg-white text-stone-700 border-stone-200'
                    }`}
                  >
                    {toArabicDigits(surah.id)}
                  </div>
                  <div>
                    <h3 className="font-quran text-lg font-bold text-stone-900 leading-tight">
                      سورة {surah.name}
                    </h3>
                    <p className="text-xs text-stone-500 font-sans mt-0.5">
                      {surah.transliteration}
                    </p>
                  </div>
                </div>

                {/* Metadata: Unboxed text with subtle separators */}
                <div className="text-left text-xs text-stone-500 font-sans space-y-0.5">
                  <div className="font-medium text-stone-700">
                    {toArabicDigits(surah.total_verses)} آية
                  </div>
                  <div className="text-[11px] text-stone-400">
                    {surah.type === 'meccan' ? 'مكية' : 'مدنية'}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
