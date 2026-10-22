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

