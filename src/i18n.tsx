/**
 * طبقة التعريب/الترجمة البسيطة للموقع (عربي + إنجليزي).
 * - العربية هي لغة المحتوى الأساسية دائماً (نص القرآن بالرسم العثماني).
 * - الإنجليزية تُترجم واجهة الاستخدام فقط (Chrome) مع مسارات مستقلة `/en/...`.
 * - لا مكتبات خارجية: قاموس بسيط + Context + hook.
 */
import React, { createContext, useContext, useMemo } from 'react';

export type Lang = 'ar' | 'en';

export const LANG_LABELS: Record<Lang, string> = {
  ar: 'العربية',
  en: 'English',
};

const ar: Record<string, string> = {
  'app.title': 'القرآن الكريم بالرسم العثماني',
  'app.title.short': 'القرآن الكريم',
  'daily.region': 'لمسات اليوم: تدبّر وتابع القراءة',
  'daily.label': 'تدبُّر اليوم',
  'daily.reference': 'سورة {sura} • الآية {aya}',
  'daily.surah': 'سورة {sura}',
  'daily.ayahNumber': 'الآية {aya}',
  'daily.listen': 'استماع',
  'daily.listenFull': 'استماع للآية كاملة',
  'daily.viewImage': 'مشاهدة الصورة كاملة',
  'daily.imageTitle': 'بطاقة الآية كاملة',
  'daily.copy': 'نسخ',
  'daily.copied': 'تم النسخ',
  'daily.share': 'مشاركة',
  'daily.open': 'فتح',
  'continue.title': 'تابع القراءة',
  'continue.at': 'سورة {sura} — الآية {aya}',
  'continue.action': 'متابعة',
  'continue.start': 'ابدأ رحلتك من سورة الفاتحة',
  'continue.startAction': 'ابدأ الآن',
  'nav.surahs': 'فهرس السور',
  'surahs.title': 'فهرس سور القرآن الكريم',
  'surahs.subtitle': 'اختر السورة للقراءة والاستماع — ١١٤ سورة كاملة',
  'surahs.searchPlaceholder': 'ابحث باسم السورة أو رقمها...',
  'surahs.name': 'سورة {name}',
  'surahs.noResults': 'لا توجد سورة مطابقة',
  'nav.search': 'البحث في الآيات',
  'nav.bookmarks': 'العلامات المحفوظة',
  'nav.data': 'مستودع البيانات',
  'header.download': 'تنزيل quran.json',
  'header.quickSearch': 'بحث سريع (Ctrl+K)',
  'header.more': 'المزيد',
  'header.options': 'خيارات ومواقع',
  'header.language': 'اللغة',
  'install.title': 'ثبّت التطبيق للقراءة دون اتصال',
  'install.action': 'تثبيت',
  'theme.group': 'وضع العرض',
  'theme.dark': 'ليلي',
  'theme.beige': 'بيج',
  'common.close': 'إغلاق',
  'footer.desc': 'مصحف إلكتروني وقاعدة بيانات مفتوحة المصدر',
  'footer.highlights': 'تلاوات بعدة قرّاء · بحث فوري · بيانات JSON',
  'footer.about': 'عن المشروع',
  'footer.sources': 'المصادر والتراخيص',
  'footer.contact': 'تواصل معنا',
  'footer.api': 'واجهة البيانات (API)',
  'footer.data': 'مستودع البيانات',
  'footer.projects': 'مشاريع مرتبطة:',
  'footer.umbrella':
    'هذا الموقع هو المظلة الرئيسية لمشاريع القرآن الكريم المرتبطة به.',
  'reader.backToList': 'قائمة السور',
  'reader.surahNumber': 'السورة رقم',
  'reader.meccan': 'مكية',
  'reader.medinan': 'مدنية',
  'reader.verseCount': '{n} آية',
  'reader.listenSurah': 'استماع للسورة كاملة',
  'reader.stopRecitation': 'إيقاف التلاوة',
  'reader.controls': 'أدوات التحكم في القارئ',
  'reader.mode.verses': 'آية بآية',
  'reader.mode.continuous': 'قراءة متصلة',
  'reader.translation': 'الترجمة',
  'reader.tafsir': 'التفسير',
  'reader.wordByWord': 'كلمة بكلمة',
  'reader.reciter': 'القارئ:',
  'reader.font': 'الخط:',
  'reader.size': 'الحجم:',
  'reader.fontSizeIncrease': 'تكبير الخط',
  'reader.fontSizeDecrease': 'تصغير الخط',
  'reader.prevSurah': 'السورة السابقة',
  'reader.nextSurah': 'السورة التالية',
  'reader.resume': 'تابع القراءة من حيث توقفت',
  'reader.resumeAction': 'متابعة',
  'verse.of': 'الآية',
  'verse.recite': 'استماع للتلاوة',
  'verse.stop': 'إيقاف التلاوة',
  'verse.copy': 'نسخ الآية',
  'verse.copied': 'تم نسخ الآية إلى الحافظة',
  'verse.bookmark': 'حفظ الآية',
  'verse.unbookmark': 'إزالة من المحفوظات',
  'verse.actions': 'إجراءات الآية',
  'verse.showTafsir': 'عرض التفسير (الميسر)',
  'verse.hideTafsir': 'إخفاء التفسير',
  'verse.words': 'كلمة بكلمة',
  'search.title': 'البحث في آيات القرآن الكريم',
  'search.subtitle': 'ابحث في جميع آيات القرآن الكريم الـ٦٢٣٦ بالرسم العثماني مع إمكانية البحث بدون تشكيل',
  'search.placeholder': 'اكتب كلمة أو جملة من الآية (مثال: الصابرين، إياك نعبد، الحمد لله)...',
  'search.filterLabel': 'تصفية بالسورة:',
  'search.allSurahs': 'جميع السور (١١٤)',
  'search.results': 'نتائج البحث: {n} آية',
  'search.minChars': 'أدخل حرفين على الأقل للبدء في البحث المباشر',
  'search.noResults': 'لم يتم العثور على آيات تطابق',
  'search.openInReader': 'فتح في المصحف',
  'search.recite': 'تلاوة',
  'bookmarks.title': 'العلامات المحفوظة',
  'bookmarks.desc': 'الآيات الكريمة التي قمت بحفظها للرجوع إليها لاحقاً',
  'bookmarks.emptyTitle': 'لا توجد علامات محفوظة حتى الآن',
  'bookmarks.emptyDesc':
    'أثناء قراءة السور، يمكنك الضغط على أيقونة الإشارة المرجعية بجانب أي آية لإضافتها إلى قائمة المحفوظات',
  'bookmarks.open': 'فتح في المصحف',
  'bookmarks.delete': 'حذف من المحفوظات',
  'bookmarks.recite': 'استماع',
  'audio.player': 'مشغل التلاوة الصوتية',
  'audio.repeatOn': 'تكرار الآية مفعل',
  'audio.repeatOff': 'تكرار الآية معطل',
  'audio.prev': 'الآية السابقة',
  'audio.next': 'الآية التالية',
  'audio.play': 'تشغيل',
  'audio.pause': 'إيقاف مؤقت',
  'audio.close': 'إغلاق مشغل التلاوة',
  'audio.reciter': 'اختيار القارئ',
};

const en: Record<string, string> = {
  'app.title': 'The Holy Quran — Uthmani Script',
  'app.title.short': 'The Holy Quran',
  'daily.region': "Today's touches: reflect and continue reading",
  'daily.label': 'Verse of the day',
  'daily.reference': 'Surah {sura} • Ayah {aya}',
  'daily.surah': 'Surah {sura}',
  'daily.ayahNumber': 'Ayah {aya}',
  'daily.listen': 'Listen',
  'daily.listenFull': 'Listen to full ayah',
  'daily.viewImage': 'View full card',
  'daily.imageTitle': 'Full ayah card',
  'daily.copy': 'Copy',
  'daily.copied': 'Copied',
  'daily.share': 'Share',
  'daily.open': 'Open',
  'continue.title': 'Continue reading',
  'continue.at': 'Surah {sura} — Ayah {aya}',
  'continue.action': 'Resume',
  'continue.start': 'Start your journey with Al-Fatihah',
  'continue.startAction': 'Start now',
  'nav.surahs': 'Surahs',
  'surahs.title': 'Surah Index',
  'surahs.subtitle': 'Choose a surah to read and listen — all 114 surahs',
  'surahs.searchPlaceholder': 'Search by surah name or number...',
  'surahs.name': 'Surah {name}',
  'surahs.noResults': 'No matching surah',
  'nav.search': 'Search Ayahs',
  'nav.bookmarks': 'Bookmarks',
  'nav.data': 'Data Repository',
  'header.download': 'Download quran.json',
  'header.quickSearch': 'Quick search (Ctrl+K)',
  'header.more': 'More',
  'header.options': 'Options & sites',
  'header.language': 'Language',
  'install.title': 'Install the app for offline reading',
  'install.action': 'Install',
  'theme.group': 'Display mode',
  'theme.dark': 'Dark',
  'theme.beige': 'Beige',
  'common.close': 'Close',
  'footer.desc': 'An open-source Quran app and dataset',
  'footer.highlights': 'Recitations by several reciters · instant search · JSON data',
  'footer.about': 'About',
  'footer.sources': 'Sources & Licenses',
  'footer.contact': 'Contact',
  'footer.api': 'Content API',
  'footer.data': 'Data Repository',
  'footer.projects': 'Related projects:',
  'footer.umbrella': 'This site is the main umbrella for its related Quran projects.',
  'reader.backToList': 'Surah list',
  'reader.surahNumber': 'Surah no.',
  'reader.meccan': 'Meccan',
  'reader.medinan': 'Medinan',
  'reader.verseCount': '{n} verses',
  'reader.listenSurah': 'Listen to full surah',
  'reader.stopRecitation': 'Stop recitation',
  'reader.controls': 'Reader controls',
  'reader.mode.verses': 'Verse by verse',
  'reader.mode.continuous': 'Continuous',
  'reader.translation': 'Translation',
  'reader.tafsir': 'Tafsir',
  'reader.wordByWord': 'Word by word',
  'reader.reciter': 'Reciter:',
  'reader.font': 'Font:',
  'reader.size': 'Size:',
  'reader.fontSizeIncrease': 'Increase font size',
  'reader.fontSizeDecrease': 'Decrease font size',
  'reader.prevSurah': 'Previous surah',
  'reader.nextSurah': 'Next surah',
  'reader.resume': 'Continue reading from where you stopped',
  'reader.resumeAction': 'Resume',
  'verse.of': 'Ayah',
  'verse.recite': 'Play recitation',
  'verse.stop': 'Stop recitation',
  'verse.copy': 'Copy ayah',
  'verse.copied': 'Ayah copied to clipboard',
  'verse.bookmark': 'Bookmark ayah',
  'verse.unbookmark': 'Remove bookmark',
  'verse.actions': 'Ayah actions',
  'verse.showTafsir': 'Show tafsir (Muyassar)',
  'verse.hideTafsir': 'Hide tafsir',
  'verse.words': 'Word by word',
  'search.title': 'Search the Holy Quran',
  'search.subtitle': 'Search all 6,236 ayahs in Uthmani script, with diacritics-insensitive matching',
  'search.placeholder': 'Type a word or phrase (e.g. Al-Sabirin, Iyyaka nabudu, Alhamdulillah)...',
  'search.filterLabel': 'Filter by surah:',
  'search.allSurahs': 'All surahs (114)',
  'search.results': 'Results: {n} ayahs',
  'search.minChars': 'Type at least two characters to start searching',
  'search.noResults': 'No ayahs found matching',
  'search.openInReader': 'Open in reader',
  'search.recite': 'Recite',
  'bookmarks.title': 'Bookmarks',
  'bookmarks.desc': 'Ayahs you saved to revisit later',
  'bookmarks.emptyTitle': 'No bookmarks yet',
  'bookmarks.emptyDesc': 'Tap the bookmark icon next to any ayah while reading to add it here',
  'bookmarks.open': 'Open in reader',
  'bookmarks.delete': 'Delete bookmark',
  'bookmarks.recite': 'Recite',
  'audio.player': 'Audio recitation player',
  'audio.repeatOn': 'Repeat ayah enabled',
  'audio.repeatOff': 'Repeat ayah disabled',
  'audio.prev': 'Previous ayah',
  'audio.next': 'Next ayah',
  'audio.play': 'Play',
  'audio.pause': 'Pause',
  'audio.close': 'Close player',
  'audio.reciter': 'Choose reciter',
};

const dictionaries: Record<Lang, Record<string, string>> = { ar, en };

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export function makeTranslate(lang: Lang): TranslateFn {
  return (key, vars) => {
    const text = dictionaries[lang][key] ?? dictionaries.ar[key] ?? key;
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (_match, name: string) =>
      String(vars[name] ?? `{${name}}`)
    );
  };
}

export interface I18nValue {
  lang: Lang;
  t: TranslateFn;
}

const I18nContext = createContext<I18nValue>({ lang: 'ar', t: makeTranslate('ar') });

interface I18nProviderProps {
  lang: Lang;
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ lang, children }) => {
  const value = useMemo<I18nValue>(() => ({ lang, t: makeTranslate(lang) }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
