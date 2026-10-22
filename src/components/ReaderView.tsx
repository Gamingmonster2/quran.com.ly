import React, { useEffect, useId, useState } from 'react';
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
}) => {
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

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Surah Header Banner */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 text-center shadow-xs mb-6 relative overflow-hidden">
        {/* Subtle decorative background motif */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-50/80 to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="text-xs uppercase tracking-widest text-stone-500 font-sans">
            السورة رقم {toArabicDigits(surah.id)} · {surah.transliteration}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-quran text-stone-900">
            سورة {surah.name}
          </h1>

          <div className="flex items-center justify-center gap-3 text-xs text-stone-600 font-sans">
            <span>{surah.type === 'meccan' ? 'مكية' : 'مدنية'}</span>
            <span aria-hidden="true">·</span>
            <span>{toArabicDigits(surah.total_verses)} آية</span>
            <span aria-hidden="true">·</span>
            <span>الرسم العثماني برواية حفص عن عاصم</span>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
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
                  <span>إيقاف التلاوة</span>
                </>
              ) : (
                <>
                  <Play aria-hidden="true" className="w-4 h-4" />
                  <span>استماع للسورة كاملة</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Reader Controls Toolbar */}
      <div
        role="group"
        aria-label="أدوات التحكم في القارئ"
        className="bg-[#FAF7F0] border border-stone-200/80 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs font-sans"
      >
        {/* Display Mode Switcher */}
        <div
          role="group"
          aria-label="طريقة عرض الآيات"
          className="flex items-center gap-1 p-1 bg-stone-200/60 rounded-lg"
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
            <span>آية بآية</span>
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
            <span>قراءة متصلة</span>
          </button>
        </div>

        {/* محتوى إضافي: ترجمة / تفسير / كلمة بكلمة */}
        <div
          role="group"
          aria-label="عرض المحتوى الإضافي للآيات"
          className="flex items-center gap-1 p-1 bg-stone-200/60 rounded-lg"
        >
          <ToolbarToggle
            active={showTranslation}
            label="الترجمة"
            title="إظهار ترجمة معاني الآيات بالإنجليزية"
            onClick={onToggleTranslation}
          >
            <Languages className="w-3.5 h-3.5" />
          </ToolbarToggle>
          <ToolbarToggle
            active={showTafsir}
            label="التفسير"
            title="إظهار التفسير الميسر لكل آية"
            onClick={onToggleTafsir}
          >
            <BookOpen className="w-3.5 h-3.5" />
          </ToolbarToggle>
          <ToolbarToggle
            active={showWordByWord}
            label="كلمة بكلمة"
            title="إظهار معنى كل كلمة على حدة"
            onClick={onToggleWordByWord}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </ToolbarToggle>
        </div>

        {/* Reciter Selector & Font Selector & Size Adjuster */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Reciter Selector */}
          <div className="flex items-center gap-1.5 text-stone-700">
            <Volume2 aria-hidden="true" className="w-4 h-4 text-stone-400" />
            <label htmlFor={reciterSelectId}>القارئ:</label>
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
            <label htmlFor={fontSelectId}>الخط:</label>
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
              الحجم:
            </span>
            <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg p-0.5">
              <button
                onClick={() => setFontSize((s) => Math.max(18, s - 2))}
                className={`px-2 py-0.5 hover:bg-stone-100 rounded text-stone-700 font-bold transition-colors ${FOCUS_RING}`}
                title="تصغير الخط"
                aria-label="تصغير حجم الخط"
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
                title="تكبير الخط"
                aria-label="تكبير حجم الخط"
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
          className={`my-6 text-center text-2xl sm:text-3xl text-stone-800 select-none py-2 border-b border-stone-200/60 pb-5 ${
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
      <div className="mt-10 pt-6 border-t border-stone-200 flex items-center justify-between text-sm font-sans">
        {onPrevSurah ? (
          <button
            onClick={onPrevSurah}
            aria-label="الانتقال إلى السورة السابقة"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-stone-900 hover:border-stone-300 transition-colors shadow-2xs ${FOCUS_RING}`}
          >
            <ChevronRight aria-hidden="true" className="w-4 h-4" />
            <span>السورة السابقة</span>
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
            <span>السورة التالية</span>
            <ChevronLeft aria-hidden="true" className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
