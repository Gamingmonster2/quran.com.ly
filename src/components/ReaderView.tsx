import React from 'react';
import { Play, Pause, ChevronRight, ChevronLeft, Type, AlignLeft, ListOrdered } from 'lucide-react';
import { SurahWithVerses, Ayah, ReadingDisplayMode, QuranFontChoice } from '../types/quran.ts';
import { toArabicDigits } from '../utils/quranHelpers.ts';
import { VerseCard } from './VerseCard.tsx';
import { MushafContinuous } from './MushafContinuous.tsx';

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
}) => {
  const isPlayingThisSurah = isPlaying && playingAyah?.sura === surah.id;
  const showBismillah = surah.id !== 9 && surah.id !== 1; // Surah 1 includes Bismillah as verse 1; Surah 9 doesn't have Bismillah

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
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-xs"
            >
              {isPlayingThisSurah ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>إيقاف التلاوة</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>استماع للسورة كاملة</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Reader Controls Toolbar */}
      <div className="bg-[#FAF7F0] border border-stone-200/80 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
        {/* Display Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-stone-200/60 rounded-lg">
          <button
            onClick={() => setDisplayMode('verses')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              displayMode === 'verses'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>آية بآية</span>
          </button>
          <button
            onClick={() => setDisplayMode('continuous')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              displayMode === 'continuous'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>قراءة متصلة</span>
          </button>
        </div>

        {/* Font Selector & Size Adjuster */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Font Selector */}
          <div className="flex items-center gap-1.5 text-stone-700">
            <span>الخط:</span>
            <select
              value={fontChoice}
              onChange={(e) => setFontChoice(e.target.value as QuranFontChoice)}
              className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-800"
            >
              <option value="uthman-taha">عثمان طه (مجمع الملك فهد - محلي TTF)</option>
              <option value="hafs-v18">حفص الإصدار ١٨ (KFGQPC TTF)</option>
              <option value="amiri">الأميري القرآني (Amiri Quran)</option>
            </select>
          </div>

          {/* Font Size Adjuster */}
          <div className="flex items-center gap-2 text-stone-700">
            <Type className="w-4 h-4 text-stone-400" />
            <span className="text-xs">الحجم:</span>
            <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg p-0.5">
              <button
                onClick={() => setFontSize((s) => Math.max(18, s - 2))}
                className="px-2 py-0.5 hover:bg-stone-100 rounded text-stone-700 font-bold transition-colors"
                title="تصغير الخط"
              >
                -
              </button>
              <span className="px-2 text-xs font-mono font-medium text-stone-800">
                {fontSize}px
              </span>
              <button
                onClick={() => setFontSize((s) => Math.min(42, s + 2))}
                className="px-2 py-0.5 hover:bg-stone-100 rounded text-stone-700 font-bold transition-colors"
                title="تكبير الخط"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-stone-900 hover:border-stone-300 transition-colors shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
            <span>السورة السابقة</span>
          </button>
        ) : (
          <div />
        )}

        {onNextSurah && (
          <button
            onClick={onNextSurah}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-stone-900 hover:border-stone-300 transition-colors shadow-2xs"
          >
            <span>السورة التالية</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
