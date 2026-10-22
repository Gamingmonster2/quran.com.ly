import React from 'react';
import { Download, Languages, Moon, Search, Sun } from 'lucide-react';
import { ThemeMode, ViewMode } from '../types/quran.ts';
import { LANG_LABELS, useI18n } from '../i18n.tsx';
import type { Lang } from '../i18n.tsx';

/** حلقة تركيز موحّدة وواضحة لمستخدمي لوحة المفاتيح */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

/** أضلاع مبدّل اللغة: العربية (AR) والإنجليزية (EN) */
const LANGUAGE_CHOICES: readonly Lang[] = ['ar', 'en'];

interface HeaderProps {
  currentView: ViewMode | null;
  onSelectView: (view: ViewMode) => void;
  onOpenDataModal: () => void;
  theme: ThemeMode;
  onSelectTheme: (theme: ThemeMode) => void;
  onNavigateHome: () => void;
  /** يُمرَّر من App لفتح لوحة الأوامر (Ctrl/Cmd+K)؛ إن لم يُمرَّر لا يظهر الزر */
  onOpenCommandPalette?: () => void;
  /** لغة واجهة الاستخدام الحالية (من طبقة i18n) */
  lang: Lang;
  /** تبديل لغة الواجهة بين العربية والإنجليزية؛ App يتولى حفظها وتغيير اتجاه الصفحة */
  onSwitchLang: (lang: Lang) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  onOpenDataModal,
  theme,
  onSelectTheme,
  onNavigateHome,
  onOpenCommandPalette,
  lang,
  onSwitchLang,
}) => {
  const { t } = useI18n();
  const isArabic = lang === 'ar';
  // النص القصير المرئي لزر البحث السريع (المفتاح يحتوي على الاختصار بين قوسين، نعرضه في kbd منفصل)
  const quickSearchShortLabel = t('header.quickSearch').replace(/\s*\(Ctrl\+K\)\s*$/u, '');

  return (
    <header lang={lang} className="sticky top-0 z-30 bg-[#FBF9F5]/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-8 h-16">
        {/* Zone 1: wordmark مترجم؛ يتمدّد ويُقتطع عند الحاجة بدل دفع بقية الأزرار خارج الشاشة */}
        <button
          onClick={onNavigateHome}
          title={t('app.title')}
          className={`min-w-0 max-w-full truncate text-start font-bold text-stone-900 whitespace-nowrap hover:text-emerald-900 transition-colors ${
            isArabic ? 'font-quran text-xl sm:text-2xl' : 'font-sans text-base sm:text-xl'
          }`}
        >
          {t('app.title')}
        </button>

        {/* Zone 2: روابط التنقل */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-700">
          <button
            onClick={() => onSelectView('surah')}
            aria-current={currentView === 'surah' ? 'page' : undefined}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              currentView === 'surah'
                ? 'text-emerald-900 font-bold border-b-2 border-emerald-800 pb-0.5'
                : 'hover:text-stone-950'
            }`}
          >
            {t('nav.surahs')}
          </button>
          <button
            onClick={() => onSelectView('search')}
            aria-current={currentView === 'search' ? 'page' : undefined}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              currentView === 'search'
                ? 'text-emerald-900 font-bold border-b-2 border-emerald-800 pb-0.5'
                : 'hover:text-stone-950'
            }`}
          >
            {t('nav.search')}
          </button>
          <button
            onClick={() => onSelectView('bookmarks')}
            aria-current={currentView === 'bookmarks' ? 'page' : undefined}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              currentView === 'bookmarks'
                ? 'text-emerald-900 font-bold border-b-2 border-emerald-800 pb-0.5'
                : 'hover:text-stone-950'
            }`}
          >
            {t('nav.bookmarks')}
          </button>
          <button
            onClick={() => onSelectView('data')}
            aria-current={currentView === 'data' ? 'page' : undefined}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              currentView === 'data'
                ? 'text-emerald-900 font-bold border-b-2 border-emerald-800 pb-0.5'
                : 'hover:text-stone-950'
            }`}
          >
            {t('nav.data')}
          </button>
        </nav>

        {/* Zone 3: مبدّل السمة + مبدّل اللغة + بحث سريع + الإجراء الأساسي */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Desktop theme switcher */}
          <div
            className="hidden md:flex items-center gap-0.5 p-0.5 bg-stone-200/60 rounded-lg"
            role="group"
            aria-label={t('theme.group')}
          >
            <button
              type="button"
              onClick={() => onSelectTheme('dark')}
              aria-pressed={theme === 'dark'}
              title={t('theme.dark')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${FOCUS_RING} ${
                theme === 'dark'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Moon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('theme.dark')}</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTheme('beige')}
              aria-pressed={theme === 'beige'}
              title={t('theme.beige')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${FOCUS_RING} ${
                theme === 'beige'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('theme.beige')}</span>
            </button>
          </div>

          {/* مبدّل لغة الواجهة (عربي / English) — يظهر على سطح المكتب والجوال */}
          <div
            className="flex items-center gap-0.5 p-0.5 bg-stone-200/60 rounded-lg"
            role="group"
            aria-label={t('header.language')}
          >
            <Languages
              aria-hidden="true"
              className="hidden sm:block w-3.5 h-3.5 ms-1 text-stone-500"
            />
            {LANGUAGE_CHOICES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onSwitchLang(code)}
                aria-pressed={lang === code}
                aria-label={`${t('header.language')}: ${LANG_LABELS[code]}`}
                title={LANG_LABELS[code]}
                lang={code}
                className={`rounded-md px-1.5 py-1 text-[10px] font-bold font-sans transition-colors ${FOCUS_RING} ${
                  lang === code
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {code === 'ar' ? 'AR' : 'EN'}
              </button>
            ))}
          </div>

          {/* فتح لوحة الأوامر والتنقل السريع (Ctrl/Cmd+K) — يظهر فقط إن مرّر App الدالة */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              aria-label={t('header.quickSearch')}
              aria-keyshortcuts="Control+K Meta+K"
              title={t('header.quickSearch')}
              className={`inline-flex items-center gap-1.5 rounded-lg bg-stone-200/60 px-2 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900 shrink-0 sm:px-2.5 ${FOCUS_RING}`}
            >
              <Search aria-hidden="true" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline whitespace-nowrap">{quickSearchShortLabel}</span>
              <kbd className="hidden items-center rounded border border-stone-300/70 bg-white/70 px-1 py-0.5 font-mono text-[9px] text-stone-500 lg:inline-flex">
                Ctrl+K
              </kbd>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenDataModal}
            title={t('header.download')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-sm whitespace-nowrap shrink-0 ${FOCUS_RING}`}
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('header.download')}</span>
          </button>
        </div>
      </div>

      {/* Mobile nav sub-bar */}
      <div className="md:hidden flex items-center justify-around border-t border-stone-200/70 bg-[#F6F2EA] px-2 py-2 text-[11px] font-medium text-stone-700">
        <button
          onClick={() => onSelectView('surah')}
          aria-current={currentView === 'surah' ? 'page' : undefined}
          className={`whitespace-nowrap px-1.5 py-1 rounded ${currentView === 'surah' ? 'text-emerald-900 font-bold bg-stone-200/60' : ''}`}
        >
          {t('nav.surahs')}
        </button>
        <button
          onClick={() => onSelectView('search')}
          aria-current={currentView === 'search' ? 'page' : undefined}
          className={`whitespace-nowrap px-1.5 py-1 rounded ${currentView === 'search' ? 'text-emerald-900 font-bold bg-stone-200/60' : ''}`}
        >
          {t('nav.search')}
        </button>
        <button
          onClick={() => onSelectView('bookmarks')}
          aria-current={currentView === 'bookmarks' ? 'page' : undefined}
          className={`whitespace-nowrap px-1.5 py-1 rounded ${currentView === 'bookmarks' ? 'text-emerald-900 font-bold bg-stone-200/60' : ''}`}
        >
          {t('nav.bookmarks')}
        </button>
        <button
          onClick={() => onSelectView('data')}
          aria-current={currentView === 'data' ? 'page' : undefined}
          className={`whitespace-nowrap px-1.5 py-1 rounded ${currentView === 'data' ? 'text-emerald-900 font-bold bg-stone-200/60' : ''}`}
        >
          {t('nav.data')}
        </button>

        {/* Mobile theme toggle */}
        <div className="flex items-center gap-1 ps-1 border-s border-stone-300/60 ms-1">
          <button
            type="button"
            onClick={() => onSelectTheme('dark')}
            aria-pressed={theme === 'dark'}
            aria-label={t('theme.dark')}
            title={t('theme.dark')}
            className={`p-1.5 rounded-md transition-colors ${FOCUS_RING} ${
              theme === 'dark'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Moon className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTheme('beige')}
            aria-pressed={theme === 'beige'}
            aria-label={t('theme.beige')}
            title={t('theme.beige')}
            className={`p-1.5 rounded-md transition-colors ${FOCUS_RING} ${
              theme === 'beige'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sun className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};
