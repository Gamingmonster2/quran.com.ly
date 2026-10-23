import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, Copy, Eye, Play, Share2, X, ArrowLeft } from 'lucide-react';
import type { Ayah, SurahMeta, SurahWithVerses } from '../types/quran.ts';
import { toArabicDigits } from '../utils/quranHelpers.ts';
import { getDailyVerse } from '../utils/dailyVerses.ts';
import { useI18n } from '../i18n.tsx';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

/** زخرفة هندسية خفيفة — بصمتنا البصرية */
const Pattern: React.FC<{ className?: string }> = ({ className }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 120 120" fill="none">
    <defs>
      <pattern id="daily-strip-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
        <path d="M14 2 18 10 26 14 18 18 14 26 10 18 2 14 10 10Z" stroke="currentColor" strokeWidth="0.9" />
      </pattern>
    </defs>
    <rect width="120" height="120" fill="url(#daily-strip-pattern)" />
  </svg>
);

export interface DailyVerseStripProps {
  surahs: SurahMeta[];
  bySurahMap: Map<number, SurahWithVerses>;
  onOpenAyah: (sura: number, aya: number) => void;
  onPlayAyah: (ayah: Ayah) => void;
}

/**
 * شريط «تدبّر اليوم» الرفيع أعلى فهرس السور (ليس بطاقة جانبية).
 * يعرض الآية مختصرة، مع: استماع للآية كاملة، مشاهدة البطاقة كاملة، نسخ/مشاركة/فتح.
 */
export const DailyVerseStrip: React.FC<DailyVerseStripProps> = ({
  surahs,
  bySurahMap,
  onOpenAyah,
  onPlayAyah,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const daily = useMemo(() => getDailyVerse(), []);
  const dailySurah = surahs.find((s) => s.id === daily.sura);
  const dailyAyah = bySurahMap.get(daily.sura)?.verses.find((v) => v.aya === daily.aya);

  useEffect(() => {
    if (!showFull) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowFull(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showFull]);

  if (!dailyAyah || !dailySurah) return null;

  const verseLink = `https://quran.com.ly/surah/${daily.sura}/${daily.aya}`;
  const shareText = `${dailyAyah.text}\n\n— سورة ${dailySurah.name} • الآية ${toArabicDigits(daily.aya)}\n${verseLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const handleShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener');
  };

  return (
    <>
      {/* الشريط الرفيع */}
      <section
        aria-label={t('daily.region')}
        className="relative z-10 w-full shrink-0 overflow-hidden border-b border-emerald-900/15 bg-gradient-to-l from-emerald-50/90 via-[#F6F2E9] to-[#FBF9F4]"
      >
        <Pattern className="pointer-events-none absolute -left-3 -top-3 h-20 w-20 text-emerald-900 opacity-[0.06]" />
        <div className="relative mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1 sm:px-4 sm:py-1.5">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-900 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <BookOpen aria-hidden="true" className="h-2.5 w-2.5" />
            {t('daily.label')}
          </span>

          <p
            lang="ar"
            dir="rtl"
            className="min-w-0 flex-1 truncate font-quran text-xs leading-normal text-stone-800 sm:text-[13px]"
            title={dailyAyah.text}
          >
            {dailyAyah.text}
            <span
              aria-label={t('daily.ayahNumber', { aya: toArabicDigits(daily.aya) })}
              className="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-emerald-900/30 bg-[#FAF7F0] px-1 align-middle font-sans text-[8px] font-bold text-emerald-900"
            >
              {toArabicDigits(daily.aya)}
            </span>
          </p>

          <span className="hidden shrink-0 text-[9px] text-stone-500 sm:inline">
            {t('daily.surah', { sura: dailySurah.name })}
          </span>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => onPlayAyah(dailyAyah)}
              aria-label={t('daily.listenFull')}
              title={t('daily.listenFull')}
              className={`inline-flex items-center justify-center rounded-md bg-emerald-900 p-1.5 text-white transition-colors hover:bg-emerald-800 ${FOCUS_RING}`}
            >
              <Play aria-hidden="true" className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setShowFull(true)}
              aria-label={t('daily.viewImage')}
              title={t('daily.viewImage')}
              className={`inline-flex items-center justify-center rounded-md bg-stone-200/80 p-1.5 text-stone-700 transition-colors hover:bg-stone-200 ${FOCUS_RING}`}
            >
              <Eye aria-hidden="true" className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? t('daily.copied') : t('daily.copy')}
              title={copied ? t('daily.copied') : t('daily.copy')}
              className={`inline-flex items-center justify-center rounded-md bg-stone-200/80 p-1.5 text-stone-700 transition-colors hover:bg-stone-200 ${FOCUS_RING}`}
            >
              {copied ? (
                <Check aria-hidden="true" className="h-3 w-3 text-emerald-700" />
              ) : (
                <Copy aria-hidden="true" className="h-3 w-3" />
              )}
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label={t('daily.share')}
              title={t('daily.share')}
              className={`inline-flex items-center justify-center rounded-md bg-stone-200/80 p-1.5 text-stone-700 transition-colors hover:bg-stone-200 ${FOCUS_RING}`}
            >
              <Share2 aria-hidden="true" className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => onOpenAyah(daily.sura, daily.aya)}
              aria-label={t('daily.open')}
              title={t('daily.open')}
              className={`inline-flex items-center justify-center rounded-md p-1.5 text-emerald-900 transition-colors hover:bg-emerald-900/10 ${FOCUS_RING}`}
            >
              <ArrowLeft aria-hidden="true" className="h-3 w-3" />
            </button>
          </div>
        </div>
      </section>

      {/* البطاقة الكاملة (نافذة منبثقة) */}
      {showFull && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={t('daily.imageTitle')}
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowFull(false);
          }}
        >
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-[#FBF7EF] p-6 text-stone-900 shadow-2xl sm:p-8">
            <Pattern className="pointer-events-none absolute -left-6 -top-6 h-40 w-40 text-emerald-900 opacity-[0.07]" />
            <div className="relative flex items-start justify-between gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900 px-2.5 py-1 text-[10px] font-bold text-white">
                {t('daily.label')}
              </span>
              <button
                type="button"
                onClick={() => setShowFull(false)}
                aria-label={t('common.close')}
                className={`rounded-lg p-1.5 text-stone-500 transition-colors hover:bg-stone-200/70 hover:text-stone-800 ${FOCUS_RING}`}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <p
              lang="ar"
              dir="rtl"
              className="relative mt-4 text-center font-quran text-[22px] leading-[2.4] text-stone-900 sm:text-2xl"
            >
              {dailyAyah.text}
              <span
                aria-label={t('daily.ayahNumber', { aya: toArabicDigits(daily.aya) })}
                className="ms-2 inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-emerald-900/35 bg-[#F3EFE4] px-1 align-middle font-sans text-xs font-bold text-emerald-900"
              >
                {toArabicDigits(daily.aya)}
              </span>
            </p>

            <p className="relative mt-2 text-center text-xs font-medium text-stone-500">
              {t('daily.surah', { sura: dailySurah.name })}
            </p>
            <p className="relative mt-4 text-center font-mono text-[10px] tracking-wide text-stone-400" dir="ltr">
              quran.com.ly
            </p>

            <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onPlayAyah(dailyAyah)}
                className={`inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 ${FOCUS_RING}`}
              >
                <Play aria-hidden="true" className="h-3.5 w-3.5" />
                {t('daily.listenFull')}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 rounded-xl bg-stone-200/80 px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-200 ${FOCUS_RING}`}
              >
                {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
                {copied ? t('daily.copied') : t('daily.copy')}
              </button>
              <button
                type="button"
                onClick={handleShare}
                className={`inline-flex items-center gap-1.5 rounded-xl bg-stone-200/80 px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-200 ${FOCUS_RING}`}
              >
                <Share2 aria-hidden="true" className="h-3.5 w-3.5" />
                {t('daily.share')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
