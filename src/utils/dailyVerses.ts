/**
 * قائمة منسّقة من الآيات القصيرة لبطاقة «تدبُّر اليوم» (تدوير يومي).
 * اختيرت يدويًا: آيات قصيرة واضحة المعنى، مناسبة للبطاقة والمشاركة.
 */
export interface DailyVerseRef {
  sura: number;
  aya: number;
}

export const DAILY_VERSES: DailyVerseRef[] = [
  { sura: 2, aya: 152 },
  { sura: 2, aya: 153 },
  { sura: 2, aya: 45 },
  { sura: 3, aya: 139 },
  { sura: 9, aya: 51 },
  { sura: 1, aya: 1 },
  { sura: 36, aya: 58 },
  { sura: 40, aya: 60 },
  { sura: 47, aya: 7 },
  { sura: 55, aya: 13 },
  { sura: 94, aya: 5 },
  { sura: 94, aya: 6 },
  { sura: 103, aya: 3 },
  { sura: 33, aya: 41 },
  { sura: 33, aya: 42 },
  { sura: 68, aya: 4 },
  { sura: 57, aya: 3 },
  { sura: 29, aya: 69 },
  { sura: 112, aya: 1 },
  { sura: 112, aya: 2 },
  { sura: 112, aya: 3 },
  { sura: 112, aya: 4 },
  { sura: 113, aya: 1 },
  { sura: 114, aya: 1 },
];

/** رقم يومي ثابت لكل يوم ميلادي (بالتوقيت المحلي) لاختيار آية اليوم. */
export function getDailyVerseIndex(now: Date = new Date()): number {
  const startOfDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dayNumber = Math.floor(startOfDay / 86_400_000);
  return ((dayNumber % DAILY_VERSES.length) + DAILY_VERSES.length) % DAILY_VERSES.length;
}

export function getDailyVerse(now: Date = new Date()): DailyVerseRef {
  return DAILY_VERSES[getDailyVerseIndex(now)];
}
