/**
 * فهرس بحث عربي خفيف يُبنى داخل المتصفح من قائمة الآيات (بلا أي مكتبات خارجية).
 *
 * الفكرة:
 * - تُطبَّع الآيات مرة واحدة عند البناء بتطبيع بحث يتجاوز اختلافات الرسم العثماني
 *   (انظر `normalizeArabicForSearch` في `quranHelpers.ts`).
 * - يُبنى فهرس مقلوب: كل كلمة مطبَّعة -> أرقام الآيات التي وردت فيها.
 * - عند البحث تُجمع مرشّحات كل كلمة من الاستعلام عبر الفهرس المقلوب (تقاطع بين
 *   الكلمات) ثم يُتحقق من تطابق العبارة كاملة، وتُرتَّب النتائج بحيث تتقدّم
 *   المطابقات التي تبدأ عند بداية كلمة/آية ثم المطابقات الحرفية.
 * - الحجم صغير بالكامل: 6236 آية فقط، فيكفي بناء الفهرس في أجزاء من الثانية.
 */

import type { Ayah } from '../types/quran.ts';
import {
  normalizeArabicForSearch,
  normalizeArabicText,
  stripAlifAndHamza,
} from './quranHelpers.ts';

/** الحد الافتراضي لعدد النتائج المعروضة (يحافظ على أداء الواجهة). */
export const DEFAULT_SEARCH_LIMIT = 100;

/** أقصى عدد نتائج يمكن طلبه في استدعاء واحد. */
export const MAX_SEARCH_LIMIT = 1000;

/** فهرس بحث مقلوب جاهز للاستعلام. */
export interface SearchIndex {
  /** الآيات الأصلية بترتيب المصحف (مرجع فقط، لا تُنسخ النصوص الأصلية). */
  verses: Ayah[];
  /** النص المطبَّع للبحث (بدون ألف/همزة) لكل آية، بنفس ترتيب `verses`. */
  searchTexts: string[];
  /** النص المطبَّع تطبيعًا طبيعيًا (يحفظ الألف) لكل آية، لترجيح المطابقة الحرفية. */
  naturalTexts: string[];
  /** كلمات كل آية بعد تطبيع البحث، لتقدير عدد الكلمات المطابقة تمامًا. */
  searchTokens: string[][];
  /** فهرس مقلوب: الكلمة المطبَّعة -> أرقام الآيات التي وردت فيها (بترتيب المصحف، بلا تكرار). */
  postings: Map<string, number[]>;
  /** جميع الكلمات المفتاحية مرتبة، للبحث بالبادئة/التضمين. */
  vocabulary: string[];
}

/** خيارات استعلام البحث. */
export interface SearchOptions {
  /** أقصى عدد نتائج (افتراضي 100). */
  limit?: number;
  /** فلترة على سورة واحدة، أو 'all' لكل السور (الافتراضي). */
  surahId?: number | 'all';
}

/** نتيجة بحث واحدة. */
export interface SearchResult {
  ayah: Ayah;
  surahId: number;
  /** موضع بداية المطابقة داخل النص المطبَّع (معلوماتي للترتيب فقط، وليس موضعًا خامًا). */
  matchIndex: number;
  /** درجة الترتيب (الأعلى أولًا). */
  score: number;
}

/**
 * يبني فهرس البحث المقلوب من قائمة الآيات. يُستدعى مرة واحدة عند تحميل البيانات
 * (أو عند تغيّر قائمة الآيات)، ثم يعاد استخدامه لكل استعلام.
 */
export function buildSearchIndex(verses: Ayah[]): SearchIndex {
  const searchTexts: string[] = new Array(verses.length);
  const naturalTexts: string[] = new Array(verses.length);
  const searchTokens: string[][] = new Array(verses.length);
  const postings = new Map<string, number[]>();
  const vocabularySet = new Set<string>();

  for (let i = 0; i < verses.length; i += 1) {
    const text = verses[i].text;
    // التطبيع الطبيعي مرة واحدة، ثم اشتقاق صيغة البحث منه (أسرع من تطبيعين كاملين)
    const naturalText = normalizeArabicText(text);
    const searchText = stripAlifAndHamza(naturalText);
    const tokens = searchText.split(' ').filter((token) => token.length > 0);

    searchTexts[i] = searchText;
    naturalTexts[i] = naturalText;
    searchTokens[i] = tokens;

    for (const token of tokens) {
      vocabularySet.add(token);
      const list = postings.get(token);
      if (!list) {
        postings.set(token, [i]);
      } else if (list[list.length - 1] !== i) {
        // الآية نفسها قد تتكرر فيها الكلمة نفسها، فنخزّن رقم الآية مرة واحدة
        list.push(i);
      }
    }
  }

  return {
    verses,
    searchTexts,
    naturalTexts,
    searchTokens,
    postings,
    vocabulary: Array.from(vocabularySet).sort(),
  };
}

/**
 * يجمع أرقام الآيات التي تحتوي إحدى كلماتها المطبَّعة على `word` (تضمين)،
 * أي أن البحث يطابق بداية الكلمة ووسطها (مثل «الصاب» -> «لصبرين»).
 */
function collectWordCandidates(index: SearchIndex, word: string): Set<number> {
  const found = new Set<number>();

  // مسار سريع: الكلمة موجودة كمفتاح فهرس تمامًا
  const exact = index.postings.get(word);
  if (exact) {
    for (const verseIndex of exact) found.add(verseIndex);
  }

  // مطابقة التضمين: كل كلمة مفهرسة أطول/متساوية وتحتوي الكلمة المطلوبة
  const vocabulary = index.vocabulary;
  for (let i = 0; i < vocabulary.length; i += 1) {
    const token = vocabulary[i];
    if (token.length <= word.length) continue; // المطابقة التامة عولجت أعلاه
    if (!token.includes(word)) continue;
    const list = index.postings.get(token);
    if (!list) continue;
    for (const verseIndex of list) found.add(verseIndex);
  }

  return found;
}

/** تقاطع مجموعتي مرشّحين (يبدأ بالمجموعة الأصغر للأداء). */
function intersectIndices(a: Set<number>, b: Set<number>): Set<number> {
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  const result = new Set<number>();
  for (const value of smaller) {
    if (larger.has(value)) result.add(value);
  }
  return result;
}

/** يحسب درجة ترتيب نتيجة بحث؛ الأعلى أفضل. */
function scoreMatch(
  index: SearchIndex,
  verseIndex: number,
  matchIndex: number,
  searchQuery: string,
  naturalQuery: string,
  queryWords: string[]
): number {
  const searchText = index.searchTexts[verseIndex];
  const beforeChar = matchIndex === 0 ? ' ' : searchText.charAt(matchIndex - 1);
  const afterIndex = matchIndex + searchQuery.length;
  const afterChar = afterIndex >= searchText.length ? ' ' : searchText.charAt(afterIndex);
  const startsAtWord = beforeChar === ' ';
  const endsAtWord = afterChar === ' ';

  let score = 0;

  // المطابقة الحرفية (بعد التطبيع الطبيعي الذي يحفظ الألف) تتقدّم دائمًا على
  // مجرد المطابقة المتسامحة مع اختلاف رسم الألف (مثل «كتاب» المكتوبة كاملة
  // على «كتب» من الجذر نفسه). الفارق كبير لضمان فصل الطبقتين عند الترتيب.
  const naturalMatchIndex = naturalQuery
    ? index.naturalTexts[verseIndex].indexOf(naturalQuery)
    : -1;
  if (naturalMatchIndex !== -1) {
    score += 2000;
    score += Math.max(0, 30 - Math.floor(naturalMatchIndex / 6));
  }

  // مطابقة الآية كاملة للاستعلام
  if (searchText === searchQuery) score += 500;

  // أولوية بداية الكلمة ثم نهايتها (عبارة كاملة بين مسافتين هي الأفضل)
  if (startsAtWord && endsAtWord) score += 240;
  else if (startsAtWord) score += 160;
  else if (endsAtWord) score += 70;

  // عدد كلمات الاستعلام التي وردت في الآية ككلمة مستقلة تمامًا
  const tokens = index.searchTokens[verseIndex];
  let exactWords = 0;
  for (const word of queryWords) {
    if (tokens.includes(word)) exactWords += 1;
  }
  score += exactWords * 50;

  // كلما كانت المطابقة أبكر في الآية كان أفضل (فارق صغير للترتيب فقط)
  score += Math.max(0, 25 - Math.floor(matchIndex / 8));

  return score;
}

/**
 * يبحث في الفهرس عن الآيات المطابقة للاستعلام ويعيد أفضل النتائج مرتبة.
 *
 * - التطبيع يتجاوز رسم الألف العثماني (ألف خنجرية/ألف مقصورة/همزات)،
 *   ويعوّض الغياب الكامل لصور الألف من الطرفين.
 * - يدعم فلترة السورة عبر `opts.surahId`، والحد الأقصى عبر `opts.limit`.
 * - المدخلات القصيرة (أقل من حرفين) تُعيد مصفوفة فارغة.
 */
export function searchAyahs(
  index: SearchIndex,
  query: string,
  opts: SearchOptions = {}
): SearchResult[] {
  const limit = Math.min(
    Math.max(1, Math.floor(opts.limit ?? DEFAULT_SEARCH_LIMIT)),
    MAX_SEARCH_LIMIT
  );
  const surahId = opts.surahId ?? 'all';
  const trimmed = query.trim();

  if (!trimmed || trimmed.length < 2 || index.verses.length === 0) return [];

  const searchQuery = normalizeArabicForSearch(trimmed);
  const naturalQuery = normalizeArabicText(trimmed);
  const queryWords = searchQuery.split(' ').filter((word) => word.length > 0);

  if (!searchQuery || queryWords.length === 0) return [];

  // 1) جمع مرشّحي الكلمات وتقاطعهم: الآية يجب أن تحتوي كل كلمات الاستعلام
  const wordCandidateSets = queryWords.map((word) => collectWordCandidates(index, word));
  if (wordCandidateSets.some((set) => set.size === 0)) return [];

  let candidateSet = wordCandidateSets[0];
  for (let i = 1; i < wordCandidateSets.length; i += 1) {
    candidateSet = intersectIndices(candidateSet, wordCandidateSets[i]);
    if (candidateSet.size === 0) return [];
  }

  // 2) التحقق من تطابق العبارة كاملة داخل النص المطبَّع وترتيب النتائج
  const results: SearchResult[] = [];
  // ترتيب أرقام الآيات تصاعديًا يقابل ترتيب المصحف (يُستخدم للفصل عند تساوي الدرجات)
  const candidateIndices = Array.from(candidateSet).sort((a, b) => a - b);

  for (const verseIndex of candidateIndices) {
    const ayah = index.verses[verseIndex];
    if (surahId !== 'all' && ayah.sura !== surahId) continue;

    const matchIndex = index.searchTexts[verseIndex].indexOf(searchQuery);
    if (matchIndex === -1) continue;

    results.push({
      ayah,
      surahId: ayah.sura,
      matchIndex,
      score: scoreMatch(index, verseIndex, matchIndex, searchQuery, naturalQuery, queryWords),
    });
  }

  // 3) الأعلى درجة أولًا، وعند تساوي الدرجات يبقى ترتيب المصحف (فرز مستقر)
  results.sort((a, b) => b.score - a.score || a.matchIndex - b.matchIndex);
  return results.slice(0, limit);
}
