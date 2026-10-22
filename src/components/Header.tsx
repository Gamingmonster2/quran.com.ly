import React from 'react';
import { Download, Moon, Search, Sun } from 'lucide-react';
import { ThemeMode, ViewMode } from '../types/quran.ts';

/** حلقة تركيز موحّدة وواضحة لمستخدمي لوحة المفاتيح */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

interface HeaderProps {
  currentView: ViewMode | null;
  onSelectView: (view: ViewMode) => void;
  onOpenDataModal: () => void;
  theme: ThemeMode;
  onSelectTheme: (theme: ThemeMode) => void;
  onNavigateHome: () => void;
  /** يُمرَّر من App لفتح لوحة الأوامر (Ctrl/Cmd+K)؛ إن لم يُمرَّر لا يظهر الزر */
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  onOpenDataModal,
  theme,
  onSelectTheme,
  onNavigateHome,
  onOpenCommandPalette,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FBF9F5]/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-8 h-16">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={onNavigateHome}
          className="text-xl sm:text-2xl font-bold font-quran text-stone-900 whitespace-nowrap shrink-0 hover:text-emerald-900 transition-colors text-right"
        >
          القرآن الكريم بالرسم العثماني
        </button>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-700">
          <button
            onClick={() => onSelectView('surah')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              currentView === 'surah'
                ? 'text-emerald-900 font-bold border-b-2 border-emerald-800 pb-0.5'
                : 'hover:text-stone-950'
            }`}
          >
            فهرس السور
          </button>
          <button
            onClick={() => onSelectView('search')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              currentView === 'search'
                ? 'text-emerald-900 font-bold border-b-2 border-emerald-800 pb-0.5'
                : 'hover:text-stone-950'
            }`}
          >
            البحث في الآيات
          </button>
          <button
            onClick={() => onSelectView('bookmarks')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              currentView === 'bookmarks'
                ? 'text-emerald-900 font-bold border-b-2 border-emerald-800 pb-0.5'
                : 'hover:text-stone-950'
            }`}
          >
            العلامات المحفوظة
          </button>
          <button
            onClick={() => onSelectView('data')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              currentView === 'data'
                ? 'text-emerald-900 font-bold border-b-2 border-emerald-800 pb-0.5'
                : 'hover:text-stone-950'
            }`}
          >
            مستودع البيانات
          </button>
        </nav>

        {/* Zone 3: theme switcher + primary action */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Desktop theme switcher */}
          <div
            className="hidden md:flex items-center gap-0.5 p-0.5 bg-stone-200/60 rounded-lg"
            role="group"
            aria-label="وضع العرض"
          >
            <button
              onClick={() => onSelectTheme('dark')}
              aria-pressed={theme === 'dark'}
              title="الوضع الليلي (افتراضي)"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>ليلي</span>
            </button>
            <button
              onClick={() => onSelectTheme('beige')}
              aria-pressed={theme === 'beige'}
              title="الوضع البيج المريح للعين"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                theme === 'beige'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>بيج</span>
            </button>
          </div>

          {/* فتح لوحة الأوامر والتنقل السريع (Ctrl/Cmd+K) — يظهر فقط إن مرّر App الدالة */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              aria-label="بحث سريع (Ctrl+K)"
              aria-keyshortcuts="Control+K Meta+K"
              title="بحث سريع (Ctrl+K)"
              className={`inline-flex items-center gap-1.5 rounded-lg bg-stone-200/60 px-2 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900 shrink-0 sm:px-2.5 ${FOCUS_RING}`}
            >
              <Search aria-hidden="true" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">بحث سريع</span>
              <kbd className="hidden items-center rounded border border-stone-300/70 bg-white/70 px-1 py-0.5 font-mono text-[9px] text-stone-500 lg:inline-flex">
                Ctrl+K
              </kbd>
            </button>
          )}

          <button
            onClick={onOpenDataModal}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-sm whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تنزيل quran.json</span>
          </button>
        </div>
      </div>

      {/* Mobile nav sub-bar */}
      <div className="md:hidden flex items-center justify-around border-t border-stone-200/70 bg-[#F6F2EA] px-2 py-2 text-xs font-medium text-stone-700">
        <button
          onClick={() => onSelectView('surah')}
          className={`px-2 py-1 rounded ${currentView === 'surah' ? 'text-emerald-900 font-bold bg-stone-200/60' : ''}`}
        >
          فهرس السور
        </button>
        <button
          onClick={() => onSelectView('search')}
          className={`px-2 py-1 rounded ${currentView === 'search' ? 'text-emerald-900 font-bold bg-stone-200/60' : ''}`}
        >
          البحث
        </button>
        <button
          onClick={() => onSelectView('bookmarks')}
          className={`px-2 py-1 rounded ${currentView === 'bookmarks' ? 'text-emerald-900 font-bold bg-stone-200/60' : ''}`}
        >
          المحفوظات
        </button>
        <button
          onClick={() => onSelectView('data')}
          className={`px-2 py-1 rounded ${currentView === 'data' ? 'text-emerald-900 font-bold bg-stone-200/60' : ''}`}
        >
          البيانات
        </button>

        {/* Mobile theme toggle */}
        <div className="flex items-center gap-1 pr-1 border-r border-stone-300/60 mr-1">
          <button
            onClick={() => onSelectTheme('dark')}
            aria-pressed={theme === 'dark'}
            title="الوضع الليلي"
            className={`p-1.5 rounded-md transition-colors ${
              theme === 'dark'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSelectTheme('beige')}
            aria-pressed={theme === 'beige'}
            title="الوضع البيج"
            className={`p-1.5 rounded-md transition-colors ${
              theme === 'beige'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
