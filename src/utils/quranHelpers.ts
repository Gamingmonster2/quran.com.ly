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
 * Returns audio recitation URL from EveryAyah (Mishary Alafasy 128kbps)
 */
export function getAyahAudioUrl(sura: number, aya: number): string {
  const sStr = String(sura).padStart(3, '0');
  const aStr = String(aya).padStart(3, '0');
  return `https://everyayah.com/data/Alafasy_128kbps/${sStr}${aStr}.mp3`;
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
