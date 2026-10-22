/**
 * تحميل بيانات المحتوى الإضافي (الترجمة / التفسير / كلمة بكلمة) لكل سورة عند الحاجة.
 * الملفات ثابتة داخل `public/assets/data/...` وتُجلب مرة واحدة لكل سورة ثم تُخزَّن في الذاكرة.
 */
import {
  SurahTafsirData,
  SurahTranslationData,
  SurahWordsData,
} from '../types/quran.ts';

export const TRANSLATION_EDITION = {
  slug: 'en-sahih-international',
  name: 'Saheeh International',
  language: 'en',
  direction: 'ltr' as const,
};

export const TAFSIR_EDITION = {
  slug: 'muyassar',
  name: 'التفسير الميسر',
  language: 'ar',
  direction: 'rtl' as const,
};

export const WORDS_EDITION = {
  slug: 'words',
  name: 'كلمة بكلمة (إنجليزي)',
  language: 'en',
};

const jsonCache = new Map<string, Promise<unknown>>();

async function fetchJson<T>(url: string): Promise<T> {
  const cached = jsonCache.get(url);
  if (cached) return cached as Promise<T>;

  const request = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`تعذّر تحميل البيانات (${response.status}): ${url}`);
    }
    return (await response.json()) as T;
  });

  jsonCache.set(url, request);
  request.catch(() => {
    // لا نُخزّن الفشل حتى تُعاد المحاولة عند الطلب التالي
    jsonCache.delete(url);
  });

  return request;
}

function contentUrl(folder: string, editionSlug: string, surahId: number): string {
  return `/assets/data/${folder}/${editionSlug}/${surahId}.json`;
}

export function loadSurahTranslation(surahId: number): Promise<SurahTranslationData> {
  return fetchJson<SurahTranslationData>(
    contentUrl('translations', TRANSLATION_EDITION.slug, surahId)
  );
}

export function loadSurahTafsir(surahId: number): Promise<SurahTafsirData> {
  return fetchJson<SurahTafsirData>(contentUrl('tafsir', TAFSIR_EDITION.slug, surahId));
}

export function loadSurahWords(surahId: number): Promise<SurahWordsData> {
  return fetchJson<SurahWordsData>(`/assets/data/words/${surahId}.json`);
}

/**
 * تنظيف نص الكلمة للعرض: إزالة التطويل وعلامات الوقف/الزخرفة التي قد تأتي
 * ملتصقة بالكلمة من مصدر بيانات الكلمة-بكلمة.
 */
export function cleanWordText(text: string): string {
  return text
    .replace(/\u0640/g, '')
    .replace(/[\u06D6-\u06ED]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
