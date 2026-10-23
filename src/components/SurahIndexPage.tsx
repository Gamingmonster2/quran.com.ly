import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { SurahMeta } from '../types/quran.ts';
import { toArabicDigits, normalizeArabicText } from '../utils/quranHelpers.ts';
import { useI18n } from '../i18n.tsx';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

export interface SurahIndexPageProps {
  surahs: SurahMeta[];
  onSelectSurah: (id: number) => void;
}

/** صفحة فهرس السور المستقلة (تفتح عند الضغط على «فهرس السور» في التنقل). */
export const SurahIndexPage: React.FC<SurahIndexPageProps> = ({ surahs, onSelectSurah }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = normalizeArabicText(query.trim());
    if (!q) return surahs;
    return surahs.filter((surah) => {
      const name = normalizeArabicText(surah.name);
      const trans = surah.transliteration.toLowerCase();
      const id = String(surah.id);
      return (
        name.includes(q) ||
        trans.includes(query.trim().toLowerCase()) ||
        id === query.trim() ||
        toArabicDigits(surah.id) === query.trim()
      );
    });
  }, [surahs, query]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#FBF9F5]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 space-y-1.5 text-center">
          <h1 className="font-quran text-2xl font-bold text-stone-900 sm:text-3xl">
            {t('surahs.title')}
          </h1>
          <p className="text-xs text-stone-500 sm:text-sm">{t('surahs.subtitle')}</p>
        </header>

        <div className="mx-auto mb-5 flex max-w-md items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-xs">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('surahs.searchPlaceholder')}
            aria-label={t('surahs.searchPlaceholder')}
            className={`w-full bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400 ${FOCUS_RING}`}
          />
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((surah) => (
            <button
              key={surah.id}
              type="button"
              onClick={() => onSelectSurah(surah.id)}
              className={`group flex items-center gap-3 rounded-2xl border border-stone-200/90 bg-white p-3 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:border-emerald-900/30 hover:shadow-md ${FOCUS_RING}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F3EFE4] font-mono text-sm font-bold text-emerald-900 transition-colors group-hover:bg-emerald-900 group-hover:text-white">
                {toArabicDigits(surah.id)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-quran text-lg font-bold text-stone-900">
                  {t('surahs.name', { name: surah.name })}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-stone-500">
                  {surah.transliteration} · {surah.type === 'meccan' ? t('reader.meccan') : t('reader.medinan')} ·{' '}
                  {t('reader.verseCount', { n: toArabicDigits(surah.total_verses) })}
                </span>
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-stone-400">{t('surahs.noResults')}</p>
        )}
      </div>
    </div>
  );
};
