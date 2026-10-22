/**
 * Converts a standard integer to Eastern Arabic digits (e.g. 1 -> ١)
 */
export function toArabicDigits(num: number | string): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => digits[+w]);
}

/**
 * Normalizes Arabic text for flexible search:
 * - Removes tashkeel (fatha, kasra, damma, sukun, shadda, tanween)
 * - Normalizes Alif variants (أ, إ, آ, ٱ -> ا)
 * - Normalizes Ya and Alif Maqsura (ى -> ي)
 * - Normalizes Ta Marbuta (ة -> ه)
 * - Removes tatweel (ـ)
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    // Remove diacritics / harakat
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // Tatweel
    .replace(/\u0640/g, '')
    // Alif variants
    .replace(/[إأآٱ]/g, 'ا')
    // Alif Maqsura & Ya
    .replace(/ى/g, 'ي')
    // Ta Marbuta & Ha
    .replace(/ة/g, 'ه')
    .trim()
    .toLowerCase();
}

/**
 * يحسب عدد الآيات التي تسبق كل سورة (0 لسورة الفاتحة) لتسهيل التحويل
 * بين الترقيم المحلي (سورة:آية) والترقيم العام 1..6236 المستخدم في ملفات الصوت.
 */
export function computeAyahOffsets(surahs: { id: number; total_verses: number }[]): number[] {
  const offsets: number[] = [0, 0];
  let accumulated = 0;
  for (const surah of [...surahs].sort((a, b) => a.id - b.id)) {
    offsets[surah.id] = accumulated;
    accumulated += surah.total_verses;
  }
  return offsets;
}

/** يحوّل رقم الآية داخل سورتها إلى رقمها العام في المصحف (1..6236) */
export function getGlobalAyahNumber(sura: number, aya: number, offsets: number[]): number {
  return (offsets[sura] ?? 0) + aya;
}

/**
 * يُنشئ روابط التلاوة الصوتية للآية حسب القارئ المختار، مرتبة حسب الجودة.
 * المصدر: شبكة islamic.network (تلاوات آية بآية للقرّاء المعتمدين).
 */
export function getAyahAudioUrls(
  reciter: { id: string; bitrates: number[] },
  globalAyahNumber: number
): string[] {
  return reciter.bitrates.map(
    (bitrate) =>
      `https://cdn.islamic.network/quran/audio/${bitrate}/${reciter.id}/${globalAyahNumber}.mp3`
  );
}

/**
 * Copies verse to clipboard formatted with Surah name and Ayah number
 */
export async function copyVerseToClipboard(text: string, surahName: string, aya: number): Promise<boolean> {
  const formatted = `﴿ ${text} ﴾ [سورة ${surahName}: الآية ${aya}]`;
  try {
    await navigator.clipboard.writeText(formatted);
    return true;
  } catch {
    // Fallback if clipboard API is restricted
    const el = document.createElement('textarea');
    el.value = formatted;
    document.body.appendChild(el);
    el.select();
    const success = document.execCommand('copy');
    document.body.removeChild(el);
    return success;
  }
}
