/**
 * Converts a standard integer to Eastern Arabic digits (e.g. 1 -> ١)
 */
export function toArabicDigits(num: number | string): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => digits[+w]);
}

/** علامات التشكيل والحركات والرموز القرآنية + التطويل (كشيدة) */
const ARABIC_MARKS_AND_TATWEEL = /[\u0640\u064B-\u065F\u06D6-\u06ED]/g;
/** صور الألف + الألف المقصورة + التاء المربوطة */
const ALIF_YA_TA = /[إأآٱىة]/g;
/** نواقل الهمزة التي تُوحَّد في تطبيع البحث */
const HAMZA_CARRIERS = /[ؤئء]/g;
/** كل صور الألف بعد التوحيد */
const ALIF_FORMS = /[اأإآٱ]/g;

/**
 * Normalizes Arabic text for display / flexible matching:
 * - Converts the superscript (dagger) alif U+0670 to a regular alif BEFORE
 *   removing diacritics, so Uthmani spellings keep their long vowel
 *   (e.g. «كِتَٰبٌ» -> «كتاب», «ٱلصَّـٰبِرِينَ» -> «الصابرين»)
 * - Removes tashkeel (fatha, kasra, damma, sukun, shadda, tanween) and the
 *   Quranic annotation marks (small high marks, pause marks, etc.)
 * - Normalizes Alif variants (أ, إ, آ, ٱ -> ا)
 * - Normalizes Ya and Alif Maqsura (ى -> ي)
 * - Normalizes Ta Marbuta (ة -> ه)
 * - Removes tatweel (ـ) and collapses whitespace
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    // Superscript (dagger) alif => regular alif, then it is NOT removed below
    .replace(/\u0670/g, 'ا')
    // Remove diacritics / harakat / Quranic marks / tatweel in one pass
    .replace(ARABIC_MARKS_AND_TATWEEL, '')
    // Alif variants / Alif Maqsura / Ta Marbuta in one pass
    .replace(ALIF_YA_TA, (ch) => (ch === 'ى' ? 'ي' : ch === 'ة' ? 'ه' : 'ا'))
    // Collapse whitespace (Quran text includes U+2009 thin spaces too)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * تطبيع خاص بالبحث يتجاوز اختلافات الرسم العثماني مع الإملاء القياسي.
 *
 * يعتمد على `normalizeArabicText` ثم:
 * - يوحّد نواقل الهمزة (ؤ -> و، ئ -> ي) ويحذف الهمزة المفردة (ء)
 * - يحذف **كل صور الألف** من الطرفين (الاستعلام والنص) بعد تحويل الألف
 *   الخنجرية إلى ألف عادية، فتتطابق:
 *   «الصابرين» مع «ٱلصَّـٰبِرِينَ»، و«الرحمن» مع «ٱلرَّحۡمَٰنِ»،
 *   و«كتاب» مع «كِتَٰبٌ»، و«إياك نعبد» مع «إِيَّاكَ نَعۡبُدُ».
 *
 * محاذير مقصودة: الحذف الكامل للألف قد يخلط كلمات متشابهة الهيكل
 * (مثل «كتب» و«كتاب»)، لذا يُرجَّح في `searchIndex` المطابق الحرفي
 * (بعد `normalizeArabicText` فقط) عند ترتيب النتائج.
 */
export function normalizeArabicForSearch(text: string): string {
  if (!text) return '';
  return stripAlifAndHamza(normalizeArabicText(text));
}

/**
 * المرحلة الثانية من تطبيع البحث: تُطبَّق على نص مطبَّع مسبقًا بـ
 * `normalizeArabicText` (توحّد الهمزات وتحذف كل صور الألف).
 * تُصدَّر لتُعيد `searchIndex` استخدام التطبيع الطبيعي دون تكرار العمل.
 */
export function stripAlifAndHamza(normalizedArabicText: string): string {
  if (!normalizedArabicText) return '';
  return normalizedArabicText
    // Hamza carriers unified, bare hamza dropped (spelling-insensitive)
    .replace(HAMZA_CARRIERS, (ch) => (ch === 'ء' ? '' : ch === 'ؤ' ? 'و' : 'ي'))
    // Drop every alif form from both sides of the comparison
    .replace(ALIF_FORMS, '')
    // قد يترك حذف كلمة قصيرة مسافتين متجاورتين
    .replace(/\s+/g, ' ')
    .trim();
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
