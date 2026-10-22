import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Type,
  AlignLeft,
  ListOrdered,
  Volume2,
  Languages,
  BookOpen,
  Grid3X3,
  X,
} from 'lucide-react';
import {
  SurahWithVerses,
  Ayah,
  ReadingDisplayMode,
  QuranFontChoice,
  WordEntry,
} from '../types/quran.ts';
import { toArabicDigits } from '../utils/quranHelpers.ts';
import { RECITERS } from '../utils/reciters.ts';
import {
  loadSurahTafsir,
  loadSurahTranslation,
  loadSurahWords,
} from '../utils/contentData.ts';
import { useI18n } from '../i18n.tsx';
import { VerseCard } from './VerseCard.tsx';
import { MushafContinuous } from './MushafContinuous.tsx';

// حلقة تركيز موحّدة وواضحة لمستخدمي لوحة المفاتيح
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

interface ToolbarToggleProps {
  active: boolean;
  label: string;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}

const ToolbarToggle: React.FC<ToolbarToggleProps> = ({
  active,
  label,
  title,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    title={title}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${FOCUS_RING} ${
      active
        ? 'bg-white text-stone-900 shadow-xs'
        : 'text-stone-600 hover:text-stone-900'
    }`}
  >
    <span aria-hidden="true">{children}</span>
    <span>{label}</span>
  </button>
);

interface ReaderViewProps {
  surah: SurahWithVerses;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  fontChoice: QuranFontChoice;
  setFontChoice: (font: QuranFontChoice) => void;
  displayMode: ReadingDisplayMode;
  setDisplayMode: (mode: ReadingDisplayMode) => void;
  playingAyah: Ayah | null;
  isPlaying: boolean;
  bookmarkedAyahs: Set<string>;
  onPlayAyah: (ayah: Ayah) => void;
  onPlayEntireSurah: () => void;
  onToggleBookmark: (ayah: Ayah) => void;
  onPrevSurah?: () => void;
  onNextSurah?: () => void;
  reciterId: string;
  onSelectReciter: (reciterId: string) => void;
  showTranslation: boolean;
  onToggleTranslation: () => void;
  showTafsir: boolean;
  onToggleTafsir: () => void;
  showWordByWord: boolean;
  onToggleWordByWord: () => void;
  /** العودة إلى فهرس السور (تُستخدم في الجوال) */
  onBackToSurahList?: () => void;
  /**
   * يُنادى عند تغيّر أول آية ظاهرة في القارئ أثناء التمرير،
   * ويُستخدم عادةً لحفظ تقدم القراءة (useReadingProgress).
   */
  onAyahVisible?: (sura: number, aya: number) => void;
  /** آخر موضع قراءة محفوظ يُعرض شريط استئنافه أعلى القارئ (إن وُجد). */
  resumeTarget?: { sura: number; aya: number; surahName?: string } | null;
  /** يُنادى عند الضغط على زر «متابعة» في شريط الاستئناف. */
  onResume?: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  surah,
  fontSize,
  setFontSize,
  fontChoice,
  setFontChoice,
  displayMode,
  setDisplayMode,
  playingAyah,
  isPlaying,
  bookmarkedAyahs,
  onPlayAyah,
  onPlayEntireSurah,
  onToggleBookmark,
  onPrevSurah,
  onNextSurah,
  reciterId,
  onSelectReciter,
  showTranslation,
  onToggleTranslation,
  showTafsir,
  onToggleTafsir,
  showWordByWord,
  onToggleWordByWord,
  onBackToSurahList,
  onAyahVisible,
  resumeTarget,
  onResume,
}) => {
  const { t, lang } = useI18n();
  // أرقام عربية-هندية في الواجهة العربية، ولاتينية في الواجهة الإنجليزية
  const formatNumber = (value: number): string =>
    lang === 'ar' ? toArabicDigits(value) : String(value);

  const isPlayingThisSurah = isPlaying && playingAyah?.sura === surah.id;
  const showBismillah = surah.id !== 9 && surah.id !== 1; // Surah 1 includes Bismillah as verse 1; Surah 9 doesn't have Bismillah

  // بيانات المحتوى الإضافي المحمّلة لهذه السورة (تُطلب فقط عند تفعيل الميزة)
  const [translationByAyah, setTranslationByAyah] = useState<Map<number, string> | null>(null);
  const [tafsirByAyah, setTafsirByAyah] = useState<Map<number, string> | null>(null);
  const [wordsByAyah, setWordsByAyah] = useState<Map<number, WordEntry[]> | null>(null);
  const [contentNotice, setContentNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!showTranslation) {
      setTranslationByAyah(null);
      return;
    }
    let cancelled = false;
    setContentNotice(null);
    loadSurahTranslation(surah.id)
      .then((data) => {
        if (!cancelled) {
          setTranslationByAyah(new Map(data.ayahs.map((item) => [item.aya, item.text])));
        }
      })
      .catch(() => {
        if (!cancelled) setContentNotice('تعذّر تحميل الترجمة لهذه السورة.');
      });
    return () => {
      cancelled = true;
    };
  }, [surah.id, showTranslation]);

  useEffect(() => {
    if (!showTafsir) {
      setTafsirByAyah(null);
      return;
    }
    let cancelled = false;
    setContentNotice(null);
    loadSurahTafsir(surah.id)
      .then((data) => {
        if (!cancelled) {
          setTafsirByAyah(new Map(data.ayahs.map((item) => [item.aya, item.text])));
        }
      })
      .catch(() => {
        if (!cancelled) setContentNotice('تعذّر تحميل التفسير لهذه السورة.');
      });
    return () => {
      cancelled = true;
    };
  }, [surah.id, showTafsir]);

  useEffect(() => {
    if (!showWordByWord) {
      setWordsByAyah(null);
      return;
    }
    let cancelled = false;
    setContentNotice(null);
    loadSurahWords(surah.id)
      .then((data) => {
        if (!cancelled) {
          setWordsByAyah(new Map(data.words.map((item) => [item.aya, item.entries])));
        }
      })
      .catch(() => {
        if (!cancelled) setContentNotice('تعذّر تحميل الترجمة كلمة بكلمة لهذه السورة.');
      });
    return () => {
      cancelled = true;
    };
  }, [surah.id, showWordByWord]);

  // معرّفات فريدة تربط التسميات المرئية بحقول الاختيار (قارئ الشاشة)
  const reciterSelectId = useId();
  const fontSelectId = useId();
  const fontSizeLabelId = useId();

  // تتبع الآية قيد التلاوة والتمرير إليها تلقائياً أثناء التشغيل المتسلسل
  useEffect(() => {
    if (!isPlaying || !playingAyah || playingAyah.sura !== surah.id) return;
    const elementId =
      displayMode === 'continuous'
        ? `continuous-ayah-${surah.id}-${playingAyah.aya}`
        : `ayah-${surah.id}-${playingAyah.aya}`;
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [playingAyah, isPlaying, surah.id, displayMode]);

  // ------- تتبع أول آية ظاهرة أثناء التمرير (لحفظ تقدّم القراءة) -------
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  // آخر موضع أُبلغ عنه للوالد حتى لا نعيد النداء إلا عند تغيّر الآية فعلًا.
  const lastReportedPositionRef = useRef<{ sura: number; aya: number } | null>(null);
  const firstAyahNumber = surah.verses.length > 0 ? surah.verses[0].aya : 1;
  const [visiblePosition, setVisiblePosition] = useState<{ sura: number; aya: number }>(
    () => ({ sura: surah.id, aya: firstAyahNumber })
  );

  // نحتفظ بدالة الإبلاغ في مرجع حتى لا نعيد ربط مستمع التمرير عند كل Render
  // (قد يمرّر App دالة جديدة الهوية في كل مرة).
  const onAyahVisibleRef = useRef(onAyahVisible);
  useEffect(() => {
    onAyahVisibleRef.current = onAyahVisible;
  }, [onAyahVisible]);

  // عند تبديل السورة: أعد تمرير القارئ إلى الأعلى حتى لا يبدأ من منتصف السورة الجديدة
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) container.scrollTop = 0;
    lastReportedPositionRef.current = null;
    setVisiblePosition({
      sura: surah.id,
      aya: surah.verses.length > 0 ? surah.verses[0].aya : 1,
    });
  }, [surah.id]);

  const shouldTrackVisibleAyah = Boolean(onAyahVisible || resumeTarget);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !shouldTrackVisibleAyah) return;

    // نجمع بطاقات الآيات مرة واحدة لكل (سورة/وضع عرض) بدل الاستعلام في كل إطار.
    // يدعم الوضعين: بطاقات `ayah-x-y` ووسوم الوضع المتصل `continuous-ayah-x-y`.
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[id^="ayah-"], [id^="continuous-ayah-"]'
      )
    );
    if (cards.length === 0) return;

    const parseCardId = (element: HTMLElement): { sura: number; aya: number } | null => {
      const match = /^(?:continuous-)?ayah-(\d+)-(\d+)$/.exec(element.id);
      if (!match) return null;
      return { sura: Number(match[1]), aya: Number(match[2]) };
    };

    lastReportedPositionRef.current = null;

    let frameId = 0;
    let reportNextFrame = false;

    const measure = (report: boolean) => {
      const containerRect = container.getBoundingClientRect();
      // الحاوية مخفية (مثل فهرس السور في الجوال) — لا معنى للقياس.
      if (containerRect.height < 1 || containerRect.width < 1) return;

      // أول بطاقة يتجاوز أسفلها أعلى الحاوية = أول آية ظاهرة على الشاشة.
      const topBoundary = containerRect.top + 8;
      let next: { sura: number; aya: number } | null = null;
      for (const card of cards) {
        if (card.getBoundingClientRect().bottom > topBoundary) {
          next = parseCardId(card);
          break;
        }
      }
      // إن كان التمرير بعد آخر آية (هامش أسفل الصفحة) نعتبر آخر آية هي الظاهرة.
      if (!next) next = parseCardId(cards[cards.length - 1]);
      if (!next) return;

      const measured = next;
      setVisiblePosition((previous) =>
        previous.sura === measured.sura && previous.aya === measured.aya
          ? previous
          : measured
      );

      if (!report) return;
      const lastReported = lastReportedPositionRef.current;
      if (
        lastReported &&
        lastReported.sura === measured.sura &&
        lastReported.aya === measured.aya
      ) {
        return;
      }
      lastReportedPositionRef.current = measured;
      onAyahVisibleRef.current?.(measured.sura, measured.aya);
    };

    // إطار واحد لكل تمرير (rAF) حتى لا نعيد القياس والحساب لكل حدث بكسل.
    const scheduleMeasure = (report: boolean) => {
      reportNextFrame = reportNextFrame || report;
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        const shouldReport = reportNextFrame;
        reportNextFrame = false;
        measure(shouldReport);
      });
    };

    const handleScroll = () => scheduleMeasure(true);
    container.addEventListener('scroll', handleScroll, { passive: true });

    // تغيّر حجم الحاوية (فتح القارئ في الجوال، ظهور شريط الصوت، تغيير حجم النافذة):
    // نقيس الموضع من جديد دون تسجيل تقدّم جديد.
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => scheduleMeasure(false));
      resizeObserver.observe(container);
    }

    // قياس أولي: نضبط الموضع الداخلي فقط دون استدعاء onAyahVisible،
    // حتى لا يُسجَّل تقدّم جديد بمجرد فتح السورة قبل أن يمرّر المستخدم.
    measure(false);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver?.disconnect();
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [surah.id, displayMode, shouldTrackVisibleAyah]);

  // ------- شريط استئناف القراءة من آخر موضع محفوظ -------
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const resumeTargetSura = resumeTarget?.sura ?? null;
  const resumeTargetAya = resumeTarget?.aya ?? null;
  useEffect(() => {
    // عند اختفاء هدف الاستئناف (بعد المتابعة أو حفظ موضع القراءة) نعيد تفعيل الشريط.
    if (resumeTargetSura === null || resumeTargetAya === null) {
      setResumeDismissed(false);
    }
  }, [resumeTargetSura, resumeTargetAya]);

  // الموضع الظاهر فعليًا؛ نتجاهل حالة قديمة تعود لسورة سابقة قبل تأثير التتبع.
  const effectiveVisiblePosition =
    visiblePosition.sura === surah.id
      ? visiblePosition
      : { sura: surah.id, aya: firstAyahNumber };

  const isResumeTargetAlreadyVisible =
    !!resumeTarget &&
    effectiveVisiblePosition.sura === resumeTarget.sura &&
    effectiveVisiblePosition.aya === resumeTarget.aya;

  // إن كان هدف الاستئناف هو نفسه الآية قيد التلاوة الآن فلا معنى لعرض الشريط
  // (يمنع ظهوره/اختفاءه المزعج أثناء التمرير التلقائي للآية قيد التشغيل).
  const isResumeTargetPlaying =
    !!resumeTarget &&
    isPlaying &&
    playingAyah?.sura === resumeTarget.sura &&
    playingAyah?.aya === resumeTarget.aya;

  const showResumeBar =
    !!resumeTarget && !resumeDismissed && !isResumeTargetAlreadyVisible && !isResumeTargetPlaying;

  const resumeSurahLabel = resumeTarget
    ? resumeTarget.surahName
      ? `سورة ${resumeTarget.surahName}`
      : `سورة رقم ${formatNumber(resumeTarget.sura)}`
    : '';

  const handleResumeClick = () => {
    setResumeDismissed(true);
    onResume?.();
  };

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full"
    >
      {/* شريط العودة إلى فهرس السور (يظهر في الجوال فقط) */}
      <div className="md:hidden mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackToSurahList}
          aria-label="العودة إلى فهرس السور"
          className={`inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 ${FOCUS_RING}`}
        >
          <ChevronRight aria-hidden="true" className="w-4 h-4" />
          <span>{t('reader.backToList')}</span>
        </button>
        <span className="text-xs text-stone-500 font-sans truncate">
          سورة {surah.name}
        </span>
      </div>

      {/* شريط استئناف القراءة من آخر موضع محفوظ (يظهر فقط إن اختلف عن الموضع الحالي) */}
      {showResumeBar && resumeTarget && (
        <div
          role="region"
          aria-label="استئناف القراءة"
          className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-xs font-sans"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <BookOpen aria-hidden="true" className="w-4 h-4 shrink-0 text-emerald-700" />
            <p className="min-w-0 text-xs leading-relaxed text-stone-600">
              <span className="text-stone-500">{t('reader.resume')}: </span>
              <span className="font-semibold text-stone-900">{resumeSurahLabel}</span>
              <span aria-hidden="true" className="mx-1 text-stone-400">
                —
              </span>
              <span className="text-stone-500">{t('verse.of')} </span>
              <span className="font-semibold text-stone-900">
                {formatNumber(resumeTarget.aya)}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={handleResumeClick}
              aria-label={`متابعة القراءة من ${resumeSurahLabel} عند الآية ${formatNumber(
                resumeTarget.aya
              )}`}
              className={`inline-flex items-center gap-1 rounded-lg bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-stone-800 ${FOCUS_RING}`}
            >
              <span>{t('reader.resumeAction')}</span>
              <ChevronLeft aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setResumeDismissed(true)}
              title="إغلاق شريط الاستئناف"
              aria-label="إغلاق شريط الاستئناف"
              className={`rounded-md p-1 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 ${FOCUS_RING}`}
            >
              <X aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Surah Header Banner */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-8 text-center shadow-xs mb-4 sm:mb-6 relative overflow-hidden">
        {/* Subtle decorative background motif */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-50/80 to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-2 sm:space-y-3">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-stone-500 font-sans">
            {t('reader.surahNumber')} {formatNumber(surah.id)} · {surah.transliteration}
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold font-quran text-stone-900">
            سورة {surah.name}
          </h1>

          <div className="flex items-center justify-center gap-3 text-xs text-stone-600 font-sans">
            <span>{surah.type === 'meccan' ? t('reader.meccan') : t('reader.medinan')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('reader.verseCount', { n: formatNumber(surah.total_verses) })}</span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">الرسم العثماني برواية حفص عن عاصم</span>
          </div>

          {/* Action buttons */}
          <div className="pt-1 sm:pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onPlayEntireSurah}
              aria-label={
                isPlayingThisSurah
                  ? `إيقاف تلاوة سورة ${surah.name}`
                  : `الاستماع إلى سورة ${surah.name} كاملة`
              }
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-xs ${FOCUS_RING}`}
            >
              {isPlayingThisSurah ? (
                <>
                  <Pause aria-hidden="true" className="w-4 h-4" />
                  <span>{t('reader.stopRecitation')}</span>
                </>
              ) : (
                <>
                  <Play aria-hidden="true" className="w-4 h-4" />
                  <span>{t('reader.listenSurah')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Reader Controls Toolbar */}
      <div
        role="group"
        aria-label={t('reader.controls')}
        className="bg-[#FAF7F0] border border-stone-200/80 rounded-xl p-2 sm:p-3 mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs font-sans"
      >
        {/* في الجوال: الصف الأول قابل للتمرير أفقيًا لتوفير ارتفاع الشاشة */}
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-0.5 md:w-auto md:overflow-visible">
          {/* Display Mode Switcher */}
          <div
            role="group"
            aria-label="طريقة عرض الآيات"
            className="flex shrink-0 items-center gap-1 p-1 bg-stone-200/60 rounded-lg"
          >
          <button
            onClick={() => setDisplayMode('verses')}
            aria-pressed={displayMode === 'verses'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${FOCUS_RING} ${
              displayMode === 'verses'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ListOrdered aria-hidden="true" className="w-3.5 h-3.5" />
            <span>{t('reader.mode.verses')}</span>
          </button>
          <button
            onClick={() => setDisplayMode('continuous')}
            aria-pressed={displayMode === 'continuous'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${FOCUS_RING} ${
              displayMode === 'continuous'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <AlignLeft aria-hidden="true" className="w-3.5 h-3.5" />
            <span>{t('reader.mode.continuous')}</span>
          </button>
        </div>

        {/* محتوى إضافي: ترجمة / تفسير / كلمة بكلمة */}
        <div
          role="group"
          aria-label="عرض المحتوى الإضافي للآيات"
          className="flex shrink-0 items-center gap-1 p-1 bg-stone-200/60 rounded-lg"
        >
          <ToolbarToggle
            active={showTranslation}
            label={t('reader.translation')}
            title="إظهار ترجمة معاني الآيات بالإنجليزية"
            onClick={onToggleTranslation}
          >
            <Languages className="w-3.5 h-3.5" />
          </ToolbarToggle>
          <ToolbarToggle
            active={showTafsir}
            label={t('reader.tafsir')}
            title="إظهار التفسير الميسر لكل آية"
            onClick={onToggleTafsir}
          >
            <BookOpen className="w-3.5 h-3.5" />
          </ToolbarToggle>
          <ToolbarToggle
            active={showWordByWord}
            label={t('reader.wordByWord')}
            title="إظهار معنى كل كلمة على حدة"
            onClick={onToggleWordByWord}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </ToolbarToggle>
        </div>
        </div>

        {/* Reciter Selector & Font Selector & Size Adjuster */}
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-0.5 [&>*]:shrink-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:gap-3">
          {/* Reciter Selector */}
          <div className="flex items-center gap-1.5 text-stone-700">
            <Volume2 aria-hidden="true" className="w-4 h-4 text-stone-400" />
            <label htmlFor={reciterSelectId}>{t('reader.reciter')}</label>
            <select
              id={reciterSelectId}
              value={reciterId}
              onChange={(e) => onSelectReciter(e.target.value)}
              className={`bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-800 max-w-[11rem] ${FOCUS_RING}`}
            >
              {RECITERS.map((reciter) => (
                <option key={reciter.id} value={reciter.id}>
                  {reciter.arabicName}
                </option>
              ))}
            </select>
          </div>

          {/* Font Selector */}
          <div className="flex items-center gap-1.5 text-stone-700">
            <label htmlFor={fontSelectId}>{t('reader.font')}</label>
            <select
              id={fontSelectId}
              value={fontChoice}
              onChange={(e) => setFontChoice(e.target.value as QuranFontChoice)}
              className={`bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-800 ${FOCUS_RING}`}
            >
              <option value="uthman-taha">عثمان طه (مجمع الملك فهد - محلي TTF)</option>
              <option value="hafs-v18">حفص الإصدار ١٨ (KFGQPC TTF)</option>
              <option value="amiri">الأميري القرآني (Amiri Quran)</option>
            </select>
          </div>

          {/* Font Size Adjuster */}
          <div
            role="group"
            aria-labelledby={fontSizeLabelId}
            className="flex items-center gap-2 text-stone-700"
          >
            <Type aria-hidden="true" className="w-4 h-4 text-stone-400" />
            <span id={fontSizeLabelId} className="text-xs">
              {t('reader.size')}
            </span>
            <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg p-0.5">
              <button
                onClick={() => setFontSize((s) => Math.max(18, s - 2))}
                className={`px-2 py-0.5 hover:bg-stone-100 rounded text-stone-700 font-bold transition-colors ${FOCUS_RING}`}
                title={t('reader.fontSizeDecrease')}
                aria-label={t('reader.fontSizeDecrease')}
              >
                -
              </button>
              <span
                className="px-2 text-xs font-mono font-medium text-stone-800"
                aria-live="polite"
                aria-atomic="true"
              >
                {fontSize}px
              </span>
              <button
                onClick={() => setFontSize((s) => Math.min(42, s + 2))}
                className={`px-2 py-0.5 hover:bg-stone-100 rounded text-stone-700 font-bold transition-colors ${FOCUS_RING}`}
                title={t('reader.fontSizeIncrease')}
                aria-label={t('reader.fontSizeIncrease')}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {contentNotice && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 font-sans"
        >
          {contentNotice}
        </div>
      )}

      {/* Bismillah Header (if applicable) */}
      {showBismillah && (
        <div
          className={`my-3 sm:my-6 text-center text-xl sm:text-3xl text-stone-800 select-none py-2 border-b border-stone-200/60 pb-3 sm:pb-5 ${
            fontChoice === 'uthman-taha'
              ? 'font-uthman-taha'
              : fontChoice === 'hafs-v18'
              ? 'font-hafs-v18'
              : 'font-amiri-quran'
          }`}
        >
          بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
        </div>
      )}

      {/* Verses Content */}
      {displayMode === 'continuous' ? (
        <MushafContinuous
          verses={surah.verses}
          fontSize={fontSize}
          fontChoice={fontChoice}
          playingAyahNumber={
            isPlaying && playingAyah?.sura === surah.id ? playingAyah.aya : null
          }
          onSelectAyah={onPlayAyah}
        />
      ) : (
        <div className="space-y-4">
          {surah.verses.map((ayah) => {
            const isPlayingThisAyah =
              isPlaying &&
              playingAyah?.sura === ayah.sura &&
              playingAyah?.aya === ayah.aya;
            const isBookmarked = bookmarkedAyahs.has(`${ayah.sura}:${ayah.aya}`);
            const tafsirText = tafsirByAyah?.get(ayah.aya);
            const previousTafsirText =
              tafsirByAyah && ayah.aya > 1 ? tafsirByAyah.get(ayah.aya - 1) : undefined;
            const tafsirIsContinuation = Boolean(
              tafsirText && previousTafsirText && tafsirText === previousTafsirText
            );

            return (
              <VerseCard
                key={ayah.aya}
                ayah={ayah}
                surahName={surah.name}
                fontSize={fontSize}
                fontChoice={fontChoice}
                isPlaying={isPlayingThisAyah}
                isBookmarked={isBookmarked}
                onPlayAudio={onPlayAyah}
                onToggleBookmark={onToggleBookmark}
                translationText={translationByAyah?.get(ayah.aya)}
                tafsirText={tafsirText}
                tafsirIsContinuation={tafsirIsContinuation}
                wordEntries={wordsByAyah?.get(ayah.aya)}
              />
            );
          })}
        </div>
      )}

      {/* Prev / Next Surah Navigation */}
      <div className="mt-6 sm:mt-10 pt-5 sm:pt-6 border-t border-stone-200 flex items-center justify-between text-sm font-sans">
        {onPrevSurah ? (
          <button
            onClick={onPrevSurah}
            aria-label="الانتقال إلى السورة السابقة"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-stone-900 hover:border-stone-300 transition-colors shadow-2xs ${FOCUS_RING}`}
          >
            <ChevronRight aria-hidden="true" className="w-4 h-4" />
            <span>{t('reader.prevSurah')}</span>
          </button>
        ) : (
          <div />
        )}

        {onNextSurah && (
          <button
            onClick={onNextSurah}
            aria-label="الانتقال إلى السورة التالية"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-stone-900 hover:border-stone-300 transition-colors shadow-2xs ${FOCUS_RING}`}
          >
            <span>{t('reader.nextSurah')}</span>
            <ChevronLeft aria-hidden="true" className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
