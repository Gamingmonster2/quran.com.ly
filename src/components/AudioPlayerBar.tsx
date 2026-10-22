import React from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Volume2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Ayah, SurahMeta } from '../types/quran.ts';
import { toArabicDigits } from '../utils/quranHelpers.ts';
import { RECITERS } from '../utils/reciters.ts';

// حلقة تركيز موحّدة وواضحة لمستخدمي لوحة المفاتيح
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

interface AudioPlayerBarProps {
  currentAyah: Ayah | null;
  currentSurah: SurahMeta | null;
  isPlaying: boolean;
  repeatMode: boolean;
  reciterId: string;
  audioError: string | null;
  onTogglePlay: () => void;
  onNextAyah: () => void;
  onPrevAyah: () => void;
  onToggleRepeat: () => void;
  onSelectReciter: (reciterId: string) => void;
  onClose: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  currentAyah,
  currentSurah,
  isPlaying,
  repeatMode,
  reciterId,
  audioError,
  onTogglePlay,
  onNextAyah,
  onPrevAyah,
  onToggleRepeat,
  onSelectReciter,
  onClose,
}) => {
  if (!currentAyah || !currentSurah) return null;

  const reciter = RECITERS.find((item) => item.id === reciterId) ?? RECITERS[0];

  return (
    <div
      role="region"
      aria-label="مشغل التلاوة الصوتية"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-lg px-4 py-3 sm:px-6"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
        {/* Ayah & Surah details */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
            <Volume2 aria-hidden="true" className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0 text-right">
            <div
              className="text-sm font-bold font-quran text-stone-900 truncate"
              aria-live="polite"
              aria-atomic="true"
            >
              سورة {currentSurah.name} · الآية {toArabicDigits(currentAyah.aya)}
            </div>
            {audioError ? (
              <div
                role="alert"
                className="flex items-center gap-1 text-xs text-red-700 truncate"
              >
                <AlertTriangle aria-hidden="true" className="w-3 h-3 shrink-0" />
                <span className="truncate">{audioError}</span>
              </div>
            ) : (
              <div className="text-xs text-stone-500 font-sans truncate flex items-center gap-2">
                <span className="truncate">{reciter.arabicName}</span>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">رواية حفص عن عاصم</span>
              </div>
            )}
          </div>
        </div>

        {/* Audio controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Reciter quick switch */}
          <select
            value={reciterId}
            onChange={(e) => onSelectReciter(e.target.value)}
            title="اختيار القارئ"
            aria-label="اختيار القارئ"
            className={`hidden lg:block bg-white border border-stone-300 rounded-lg px-2 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-800 max-w-[10rem] ${FOCUS_RING}`}
          >
            {RECITERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.arabicName}
              </option>
            ))}
          </select>

          {/* Repeat */}
          <button
            onClick={onToggleRepeat}
            title={repeatMode ? 'تكرار الآية مفعل' : 'تكرار الآية معطل'}
            aria-label="تكرار الآية"
            aria-pressed={repeatMode}
            className={`p-2 rounded-lg transition-colors ${FOCUS_RING} ${
              repeatMode
                ? 'bg-amber-100 text-amber-800'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
            }`}
          >
            <RotateCcw aria-hidden="true" className="w-4 h-4" />
          </button>

          {/* Previous Ayah */}
          <button
            onClick={onPrevAyah}
            title="الآية السابقة"
            aria-label="الآية السابقة"
            className={`p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors ${FOCUS_RING}`}
          >
            <SkipForward aria-hidden="true" className="w-4 h-4" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className={`w-10 h-10 rounded-full bg-stone-900 hover:bg-stone-800 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 ${FOCUS_RING}`}
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            aria-label={isPlaying ? 'إيقاف التلاوة مؤقتاً' : 'تشغيل التلاوة'}
          >
            {isPlaying ? (
              <Pause aria-hidden="true" className="w-5 h-5" />
            ) : (
              <Play aria-hidden="true" className="w-5 h-5 mr-0.5" />
            )}
          </button>

          {/* Next Ayah */}
          <button
            onClick={onNextAyah}
            title="الآية التالية"
            aria-label="الآية التالية"
            className={`p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors ${FOCUS_RING}`}
          >
            <SkipBack aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        {/* Close Button */}
        <div className="flex items-center shrink-0">
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors ${FOCUS_RING}`}
            title="إغلاق المشغل"
            aria-label="إغلاق مشغل التلاوة"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
