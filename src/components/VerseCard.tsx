import React, { useState } from 'react';
import { Play, Pause, Copy, Check, Bookmark, BookmarkCheck } from 'lucide-react';
import { Ayah, QuranFontChoice } from '../types/quran.ts';
import { toArabicDigits, copyVerseToClipboard } from '../utils/quranHelpers.ts';

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
}) => {
  const [copied, setCopied] = useState(false);

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
    </article>
  );
};
