export interface Ayah {
  sura: number;
  aya: number;
  text: string;
}

export interface SurahMeta {
  id: number;
  name: string;
  transliteration: string;
  type: 'meccan' | 'medinan';
  total_verses: number;
}

export interface SurahWithVerses extends SurahMeta {
  verses: Ayah[];
}

export interface Bookmark {
  sura: number;
  aya: number;
  surahName: string;
  previewText: string;
  timestamp: number;
}

export type ViewMode = 'surah' | 'search' | 'data' | 'bookmarks';
export type ReadingDisplayMode = 'verses' | 'continuous';
export type QuranFontChoice = 'uthman-taha' | 'hafs-v18' | 'amiri';

export type ThemeMode = 'dark' | 'beige';

/** ترجمة معنى آية واحدة (لغة أجنبية) */
export interface TranslatedAyah {
  aya: number;
  text: string;
}

export interface ContentEdition {
  id: number;
  name: string;
  language: string;
  direction: 'ltr' | 'rtl';
}

/** بيانات ترجمة سورة كاملة (ملف JSON لكل سورة يُحمَّل عند الحاجة) */
export interface SurahTranslationData {
  edition: ContentEdition;
  surahId: number;
  ayahs: TranslatedAyah[];
}

/** بيانات تفسير سورة كاملة */
export interface SurahTafsirData {
  edition: ContentEdition;
  surahId: number;
  ayahs: TranslatedAyah[];
}

/** كلمة واحدة مع معناها الإنجليزي والنقل الصوتي */
export interface WordEntry {
  position: number;
  text: string;
  translation: string;
  transliteration?: string;
}

export interface WordsVerse {
  aya: number;
  entries: WordEntry[];
}

/** بيانات الترجمة كلمة-بكلمة لسورة كاملة */
export interface SurahWordsData {
  surahId: number;
  language: string;
  words: WordsVerse[];
}


