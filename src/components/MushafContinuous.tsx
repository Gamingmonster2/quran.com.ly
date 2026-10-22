import React from 'react';
import { Ayah, QuranFontChoice } from '../types/quran.ts';
import { toArabicDigits } from '../utils/quranHelpers.ts';

interface MushafContinuousProps {
  verses: Ayah[];
  fontSize: number;
  fontChoice?: QuranFontChoice;
  playingAyahNumber: number | null;
  onSelectAyah: (ayah: Ayah) => void;
}

export const MushafContinuous: React.FC<MushafContinuousProps> = ({
  verses,
  fontSize,
  fontChoice = 'uthman-taha',
  playingAyahNumber,
  onSelectAyah,
}) => {
  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-10 shadow-xs max-w-4xl mx-auto">
      <div
        className={`${
          fontChoice === 'uthman-taha'
            ? 'font-uthman-taha'
            : fontChoice === 'hafs-v18'
            ? 'font-hafs-v18'
            : 'font-amiri-quran'
        } text-stone-900 text-justify text-balance`}
        style={{ fontSize: `${fontSize + 2}px`, lineHeight: 2.6 }}
        dir="rtl"
      >
        {verses.map((ayah) => {
          const isPlaying = playingAyahNumber === ayah.aya;
          return (
            <React.Fragment key={ayah.aya}>
              <span
                id={`continuous-ayah-${ayah.sura}-${ayah.aya}`}
                onClick={() => onSelectAyah(ayah)}
                title={`الآية ${ayah.aya} - انقر للاستماع`}
                className={`cursor-pointer transition-colors rounded px-1 inline ${
                  isPlaying
                    ? 'bg-amber-100 text-amber-950 font-bold'
                    : 'hover:bg-emerald-50 hover:text-emerald-950'
                }`}
              >
                {ayah.text}
              </span>
              <span
                onClick={() => onSelectAyah(ayah)}
                className="inline-flex items-center justify-center font-amiri text-stone-600 mx-1.5 text-sm select-none border border-stone-300 rounded-full w-7 h-7 align-middle bg-stone-50 hover:bg-stone-200 cursor-pointer transition-colors shadow-2xs"
                title={`رقم الآية ${toArabicDigits(ayah.aya)}`}
              >
                {toArabicDigits(ayah.aya)}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
