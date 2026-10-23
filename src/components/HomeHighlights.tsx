import React from 'react';
import { BookOpen } from 'lucide-react';
import type { Ayah, SurahMeta, SurahWithVerses } from '../types/quran.ts';
import { toArabicDigits } from '../utils/quranHelpers.ts';
import { useI18n } from '../i18n.tsx';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

export interface HomeHighlightsProps {
  surahs: SurahMeta[];
  bySurahMap: Map<number, SurahWithVerses>;
  progress: { sura: number; aya: number } | null;
  onOpenAyah: (sura: number, aya: number) => void;
  /** يُمرَّر من App للتوافق مع الاستدعاء الحالي (غير مستخدم بعد نقل آية اليوم للشريط) */
  onPlayAyah?: (ayah: Ayah) => void;
  onStartReading: () => void;
}

/** بطاقة «تابع القراءة» في جانبي فهرس السور (آية اليوم أصبحت شريطًا أعلى الصفحة). */
export const HomeHighlights: React.FC<HomeHighlightsProps> = ({
  surahs,
  bySurahMap,
  progress,
  onOpenAyah,
  onStartReading,
}) => {
  const { t } = useI18n();

  const progressSurah = progress ? surahs.find((s) => s.id === progress.sura) : null;
  const progressTotal = progress
    ? bySurahMap.get(progress.sura)?.verses.length ?? progressSurah?.total_verses ?? 0
    : 0;
  const progressPercent =
    progress && progressTotal > 0
      ? Math.min(100, Math.round((progress.aya / progressTotal) * 100))
      : 0;

  return (
    <section aria-label={t('continue.title')} className="shrink-0 p-2.5 md:p-3">
      <article className="rounded-xl border border-stone-200/90 bg-white/70 p-2.5 shadow-xs">
        {progress && progressSurah ? (
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-900/10 text-emerald-900">
              <BookOpen aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-stone-800">{t('continue.title')}</p>
              <p className="truncate text-[10px] text-stone-500">
                {t('continue.at', {
                  sura: progressSurah.name,
                  aya: toArabicDigits(progress.aya),
                })}
              </p>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-stone-200/80">
                <div
                  className="h-full rounded-full bg-emerald-700 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenAyah(progress.sura, progress.aya)}
              className={`shrink-0 rounded-lg bg-stone-900 px-2.5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-stone-800 ${FOCUS_RING}`}
            >
              {t('continue.action')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-900/10 text-emerald-900">
              <BookOpen aria-hidden="true" className="h-4 w-4" />
            </span>
            <p className="min-w-0 flex-1 truncate text-[10px] text-stone-500">
              {t('continue.start')}
            </p>
            <button
              type="button"
              onClick={onStartReading}
              className={`shrink-0 rounded-lg bg-emerald-900 px-2.5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-800 ${FOCUS_RING}`}
            >
              {t('continue.startAction')}
            </button>
          </div>
        )}
      </article>
    </section>
  );
};
