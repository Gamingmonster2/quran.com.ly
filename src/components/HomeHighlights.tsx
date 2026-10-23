import React, { useMemo, useState } from 'react';
import { BookOpen, Check, Copy, Play, Share2, Sparkles, ArrowLeft } from 'lucide-react';
import type { Ayah, SurahMeta, SurahWithVerses } from '../types/quran.ts';
import { toArabicDigits } from '../utils/quranHelpers.ts';
import { getDailyVerse } from '../utils/dailyVerses.ts';
import { useI18n } from '../i18n.tsx';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

/** زخرفة إسلامية خفيفة (نمط هندسي) كبصمة بصرية خاصة بنا */
const GeometricPattern: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    aria-hidden="true"
    className={className}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="quran-star-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
        <path
          d="M15 1 19 11 29 15 19 19 15 29 11 19 1 15 11 11Z"
          stroke="currentColor"
          strokeWidth="1"
        />
        <circle cx="15" cy="15" r="3" stroke="currentColor" strokeWidth="0.8" />
      </pattern>
    </defs>
    <rect width="120" height="120" fill="url(#quran-star-pattern)" />
  </svg>
);

export interface HomeHighlightsProps {
  surahs: SurahMeta[];
  bySurahMap: Map<number, SurahWithVerses>;
  progress: { sura: number; aya: number } | null;
  onOpenAyah: (sura: number, aya: number) => void;
  onPlayAyah: (ayah: Ayah) => void;
  onStartReading: () => void;
}

/**
 * لمسات الواجهة الأولى (الخطوات 1–3): بطاقة «تدبّر اليوم» + بطاقة «تابع القراءة».
 * تصميم خاص بنا: زخرفة هندسية، خط المصحف، ألوان السمة، وأزرار فعلية بلا حسابات.
 */
export const HomeHighlights: React.FC<HomeHighlightsProps> = ({
  surahs,
  bySurahMap,
  progress,
  onOpenAyah,
  onPlayAyah,
  onStartReading,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const daily = useMemo(() => getDailyVerse(), []);
  const dailySurah = surahs.find((s) => s.id === daily.sura);
  const dailyAyah = bySurahMap
    .get(daily.sura)
    ?.verses.find((v) => v.aya === daily.aya);

  const progressSurah = progress ? surahs.find((s) => s.id === progress.sura) : null;
  const progressTotal = progress
    ? bySurahMap.get(progress.sura)?.verses.length ?? progressSurah?.total_verses ?? 0
    : 0;
  const progressPercent =
    progress && progressTotal > 0
      ? Math.min(100, Math.round((progress.aya / progressTotal) * 100))
      : 0;

  const verseLink = dailyAyah
    ? `https://quran.com.ly/surah/${daily.sura}/${daily.aya}`
    : 'https://quran.com.ly';

  const shareText = dailyAyah
    ? `${dailyAyah.text}\n\n— سورة ${dailySurah?.name ?? ''} • الآية ${toArabicDigits(
        daily.aya
      )}\n${verseLink}`
    : verseLink;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* الحافظة غير متاحة — لا نكسر الواجهة */
    }
  };

  const handleShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener');
  };

  const handlePlay = () => {
    if (dailyAyah) onPlayAyah(dailyAyah);
  };

  if (!dailyAyah || !dailySurah) return null;

  return (
    <section
      aria-label={t('daily.region')}
      className="shrink-0 space-y-2 border-b border-stone-200/80 bg-gradient-to-b from-stone-50 to-[#F7F4EE] p-2.5 md:p-3"
    >
      {/* تدبّر اليوم */}
      <article className="relative overflow-hidden rounded-2xl border border-emerald-900/15 bg-white/80 p-3 shadow-xs">
        <GeometricPattern className="pointer-events-none absolute -left-4 -top-4 h-28 w-28 text-emerald-900 opacity-[0.07]" />
        <div className="relative flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/10 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
            <Sparkles aria-hidden="true" className="h-3 w-3" />
            {t('daily.label')}
          </span>
          <span className="text-[10px] text-stone-400">
            {new Intl.DateTimeFormat('ar-LY-u-nu-arab', {
              day: 'numeric',
              month: 'long',
            }).format(new Date())}
          </span>
        </div>

        <p
          lang="ar"
          dir="rtl"
          className="relative mt-2 font-quran text-[15px] leading-[2.35] text-stone-900 md:text-base"
        >
          {dailyAyah.text}
        </p>

        <div className="relative mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium text-stone-500">
            {t('daily.reference', {
              sura: dailySurah.name,
              aya: toArabicDigits(daily.aya),
            })}
          </span>
        </div>

        <div className="relative mt-2 flex items-center gap-1">
          <button
            type="button"
            onClick={handlePlay}
            title={t('daily.listen')}
            aria-label={t('daily.listen')}
            className={`inline-flex items-center gap-1 rounded-lg bg-emerald-900 px-2 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-800 ${FOCUS_RING}`}
          >
            <Play aria-hidden="true" className="h-3 w-3" />
            {t('daily.listen')}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? t('daily.copied') : t('daily.copy')}
            aria-label={copied ? t('daily.copied') : t('daily.copy')}
            className={`inline-flex items-center gap-1 rounded-lg bg-stone-200/70 px-2 py-1.5 text-[10px] font-semibold text-stone-700 transition-colors hover:bg-stone-200 ${FOCUS_RING}`}
          >
            {copied ? (
              <Check aria-hidden="true" className="h-3 w-3 text-emerald-700" />
            ) : (
              <Copy aria-hidden="true" className="h-3 w-3" />
            )}
            {copied ? t('daily.copied') : t('daily.copy')}
          </button>
          <button
            type="button"
            onClick={handleShare}
            title={t('daily.share')}
            aria-label={t('daily.share')}
            className={`inline-flex items-center gap-1 rounded-lg bg-stone-200/70 px-2 py-1.5 text-[10px] font-semibold text-stone-700 transition-colors hover:bg-stone-200 ${FOCUS_RING}`}
          >
            <Share2 aria-hidden="true" className="h-3 w-3" />
            <span className="hidden sm:inline">{t('daily.share')}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenAyah(daily.sura, daily.aya)}
            title={t('daily.open')}
            aria-label={t('daily.open')}
            className={`ms-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/10 ${FOCUS_RING}`}
          >
            {t('daily.open')}
            <ArrowLeft aria-hidden="true" className="h-3 w-3" />
          </button>
        </div>
      </article>

      {/* تابع القراءة */}
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
