import React, { useState } from 'react';
import { Play, Pause, Copy, Check, Bookmark, BookmarkCheck, BookOpen, ChevronDown } from 'lucide-react';
import { Ayah, QuranFontChoice, WordEntry } from '../types/quran.ts';
import { toArabicDigits, copyVerseToClipboard } from '../utils/quranHelpers.ts';
import { cleanWordText } from '../utils/contentData.ts';

// حلقة تركيز موحّدة وواضحة لمستخدمي لوحة المفاتيح
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

interface VerseCardProps {
  ayah: Ayah;
  surahName: string;
  fontSize: number;
  fontChoice?: QuranFontChoice;
  isPlaying: boolean;
  isBookmarked: boolean;
  onPlayAudio: (ayah: Ayah) => void;
  onToggleBookmark: (ayah: Ayah) => void;
  /** ترجمة معاني الآية (عند تفعيلها) */
  translationText?: string;
  /** تفسير الآية (الميسر) عند تفعيله */
  tafsirText?: string;
  /** هل هذا النص تفسير مقطع من الآيات يبدأ قبل هذه الآية (تكرار من المصدر)؟ */
  tafsirIsContinuation?: boolean;
  /** معاني الكلمات المفردة عند تفعيل كلمة-بكلمة */
  wordEntries?: WordEntry[];
}

export const VerseCard: React.FC<VerseCardProps> = ({
  ayah,
  surahName,
  fontSize,
  fontChoice = 'uthman-taha',
  isPlaying,
  isBookmarked,
  onPlayAudio,
  onToggleBookmark,
  translationText,
  tafsirText,
  tafsirIsContinuation = false,
  wordEntries,
}) => {
  const [copied, setCopied] = useState(false);
  const [tafsirOpen, setTafsirOpen] = useState(false);

  const handleCopy = async () => {
    const success = await copyVerseToClipboard(ayah.text, surahName, ayah.aya);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <article
      id={`ayah-${ayah.sura}-${ayah.aya}`}
      aria-label={`الآية ${toArabicDigits(ayah.aya)} من سورة ${surahName}`}
      className={`p-5 sm:p-6 rounded-xl border transition-all ${
        isPlaying
          ? 'bg-amber-50/60 border-amber-300 shadow-sm'
          : 'bg-white border-stone-200/80 hover:border-stone-300 shadow-xs'
      }`}
    >
      {/* Top verse metadata & action strip */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100 text-xs text-stone-500 font-sans">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-800">
            سورة {surahName}
          </span>
          <span aria-hidden="true">·</span>
          <span>الآية {toArabicDigits(ayah.aya)}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-stone-400">
            {ayah.sura}:{ayah.aya}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1" role="group" aria-label="إجراءات الآية">
          <button
            onClick={() => onPlayAudio(ayah)}
            title={isPlaying ? 'إيقاف التلاوة' : 'استماع للتلاوة'}
            aria-label={isPlaying ? 'إيقاف تلاوة الآية' : 'تشغيل تلاوة الآية'}
            className={`p-1.5 rounded-lg transition-colors ${FOCUS_RING} ${
              isPlaying
                ? 'bg-amber-600 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            {isPlaying ? (
              <Pause aria-hidden="true" className="w-4 h-4" />
            ) : (
              <Play aria-hidden="true" className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleCopy}
            title="نسخ الآية الكريمة"
            aria-label="نسخ الآية إلى الحافظة"
            className={`p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors ${FOCUS_RING}`}
          >
            {copied ? (
              <Check aria-hidden="true" className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy aria-hidden="true" className="w-4 h-4" />
            )}
          </button>
          <span className="sr-only" role="status" aria-live="polite">
            {copied ? 'تم نسخ الآية إلى الحافظة' : ''}
          </span>

          <button
            onClick={() => onToggleBookmark(ayah)}
            title={isBookmarked ? 'إزالة من المحفوظات' : 'حفظ الآية'}
            aria-label="حفظ الآية في المحفوظات"
            aria-pressed={isBookmarked}
            className={`p-1.5 rounded-lg transition-colors ${FOCUS_RING} ${
              isBookmarked
                ? 'text-amber-600 bg-amber-50'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            {isBookmarked ? (
              <BookmarkCheck
                aria-hidden="true"
                className="w-4 h-4 fill-amber-600 text-amber-600"
              />
            ) : (
              <Bookmark aria-hidden="true" className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Quranic Uthmani Text */}
      <div
        className={`${
          fontChoice === 'uthman-taha'
            ? 'font-uthman-taha'
            : fontChoice === 'hafs-v18'
            ? 'font-hafs-v18'
            : 'font-amiri-quran'
        } leading-loose text-stone-900 text-right text-balance`}
        style={{ fontSize: `${fontSize}px`, lineHeight: 2.2 }}
      >
        {ayah.text}
        <span className="inline-flex items-center justify-center font-amiri text-stone-500 mx-2 text-sm select-none border border-stone-300 rounded-full w-7 h-7 align-middle bg-stone-50">
          {toArabicDigits(ayah.aya)}
        </span>
      </div>

      {/* ترجمة معاني الآية */}
      {translationText && (
        <div className="mt-4 pt-3 border-t border-stone-100" dir="ltr">
          <div className="text-[10px] uppercase tracking-wider text-stone-400 font-sans mb-1">
            Saheeh International
          </div>
          <p className="text-sm leading-relaxed text-stone-600 font-sans text-left">
            {translationText}
          </p>
        </div>
      )}

      {/* معاني الكلمات كلمة-بكلمة */}
      {wordEntries && wordEntries.length > 0 && (
        <div className="mt-4 pt-3 border-t border-stone-100">
          <div className="text-[10px] uppercase tracking-wider text-stone-400 font-sans mb-1.5 text-right">
            كلمة بكلمة
          </div>
          <div dir="rtl" className="flex flex-wrap gap-1.5">
            {wordEntries.map((word) => (
              <div
                key={word.position}
                className="flex min-w-[3.25rem] flex-col items-center rounded-lg border border-stone-200/80 bg-stone-50 px-2 py-1.5"
              >
                <span className="font-quran text-lg leading-tight text-stone-900">
                  {cleanWordText(word.text)}
                </span>
                <span dir="ltr" className="mt-1 text-center text-[10px] leading-tight text-stone-500 font-sans">
                  {word.translation}
                </span>
                {word.transliteration && (
                  <span dir="ltr" className="text-[9px] italic leading-tight text-stone-400 font-sans">
                    {word.transliteration}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* التفسير (الميسر) */}
      {tafsirText && (
        <div className="mt-4 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setTafsirOpen((open) => !open)}
            aria-expanded={tafsirOpen}
            aria-controls={`tafsir-${ayah.sura}-${ayah.aya}`}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 ${FOCUS_RING}`}
          >
            <BookOpen aria-hidden="true" className="w-3.5 h-3.5 text-emerald-700" />
            <span>{tafsirOpen ? 'إخفاء التفسير' : 'عرض التفسير (الميسر)'}</span>
            <ChevronDown
              aria-hidden="true"
              className={`w-3.5 h-3.5 transition-transform ${tafsirOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {tafsirOpen && (
            <div
              id={`tafsir-${ayah.sura}-${ayah.aya}`}
              className="mt-2 whitespace-pre-line rounded-xl border border-stone-200/70 bg-[#FAF7F0] p-3.5 text-sm leading-loose text-stone-700 font-sans"
            >
              {tafsirIsContinuation && (
                <div className="mb-1.5 text-[11px] text-stone-400">
                  (يتابع هذا التفسير مقطعًا من الآيات يبدأ قبل هذه الآية)
                </div>
              )}
              {tafsirText}
            </div>
          )}
        </div>
      )}
    </article>
  );
};
