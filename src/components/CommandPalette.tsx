import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  BookOpen,
  Command,
  Database,
  Info,
  Mail,
  Moon,
  ScrollText,
  Search,
  Sun,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SurahMeta, ThemeMode } from '../types/quran.ts';
import { normalizeArabicText, toArabicDigits } from '../utils/quranHelpers.ts';

/** الأوامر السريعة التي يمكن تنفيذها من لوحة الأوامر (تُمرَّر إلى onAction) */
export type PaletteAction =
  | 'search'
  | 'bookmarks'
  | 'data'
  | 'about'
  | 'sources'
  | 'contact'
  | 'toggle-theme';

interface CommandPaletteProps {
  /** يتحكم الأب في فتح/إغلاق اللوحة (Ctrl/Cmd+K ينادي onRequestOpen) */
  open: boolean;
  /** يُنادى عند ضغط Ctrl/Cmd+K في أي وقت داخل الموقع */
  onRequestOpen: () => void;
  /** يُنادى عند طلب الإغلاق: Escape، زر الإغلاق، النقر على الخلفية، أو بعد تنفيذ عنصر */
  onClose: () => void;
  surahs: SurahMeta[];
  onSelectSurah: (surahId: number) => void;
  onAction: (action: PaletteAction) => void;
}

/** حلقة تركيز موحّدة وواضحة لمستخدمي لوحة المفاتيح (مطابقة لبقية المكونات) */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

interface ActionDefinition {
  action: PaletteAction;
  label: string;
  description: string;
  icon: LucideIcon;
  /** كلمات مفتاحية عربية/إنجليزية تساعد على الوصول للأمر بالكتابة */
  keywords: string[];
}

type PaletteItem =
  | { kind: 'action'; id: string; definition: ActionDefinition }
  | { kind: 'surah'; id: string; surah: SurahMeta };

const ARABIC_INDIC_DIGITS = /[٠-٩]/g;
const ARABIC_DIGIT_CHARS = '٠١٢٣٤٥٦٧٨٩';

/** يحوّل الأرقام العربية الشرقية (٠..٩) إلى أرقام لاتينية لتمكين الفلترة بالرقم */
function toWesternDigits(value: string): string {
  return value.replace(ARABIC_INDIC_DIGITS, (digit) =>
    String(ARABIC_DIGIT_CHARS.indexOf(digit))
  );
}

/** يقرأ السمة الحالية من <html data-theme> لعرض حالة الوضع في أمر التبديل */
function readCurrentTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'beige' ? 'beige' : 'dark';
}

/** صياغة عدد النتائج بصيغة عربية سليمة (نتيجة واحدة / نتيجتان / ٣ نتائج / ١٥ نتيجة) */
function formatResultCount(count: number): string {
  if (count === 0) return 'لا توجد نتائج';
  const word =
    count === 1
      ? 'نتيجة واحدة'
      : count === 2
        ? 'نتيجتان'
        : count >= 3 && count <= 10
          ? 'نتائج'
          : 'نتيجة';
  return `${toArabicDigits(count)} ${word}`;
}

/**
 * لوحة أوامر وتنقل سريع (Ctrl/Cmd + K).
 *
 * - يبقى المكوّن مركّبًا دائمًا ويستمع لاختصار Ctrl/Cmd+K ثم ينادي onRequestOpen.
 * - عند الفتح: أوامر سريعة أولًا ثم فهرس السور مع فلترة ذكية بالاسم/الترجمة/الرقم.
 * - تنقل كامل بلوحة المفاتيح: ArrowUp/ArrowDown + Enter، وEscape للإغلاق،
 *   مع حصر التركيز داخل النافذة (Tab) وإعادة التركيز للعنصر السابق عند الإغلاق.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onRequestOpen,
  onClose,
  surahs,
  onSelectSurah,
  onAction,
}) => {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => readCurrentTheme());

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // مراجع حيّة للدوال المتغيّرة الهوية حتى لا يُعاد ربط مستمعات لوحة المفاتيح
  const onRequestOpenRef = useRef(onRequestOpen);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onRequestOpenRef.current = onRequestOpen;
  }, [onRequestOpen]);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // ----- اختصار الفتح العام Ctrl/Cmd + K (المكوّن مركّب دائمًا) -----
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onRequestOpenRef.current();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // ----- الأوامر السريعة (تعتمد صياغة أمر السمة على الوضع الحالي) -----
  const actionDefinitions = useMemo<ActionDefinition[]>(() => {
    const isDark = currentTheme === 'dark';
    return [
      {
        action: 'search',
        label: 'بحث الآيات',
        description: 'بحث فوري في ٦٢٣٦ آية بالرسم العثماني',
        icon: Search,
        keywords: ['بحث', 'ابحث', 'آيات', 'ايات', 'آية', 'ايه', 'search', 'find'],
      },
      {
        action: 'bookmarks',
        label: 'العلامات المحفوظة',
        description: 'الآيات التي حفظتها في متصفحك',
        icon: Bookmark,
        keywords: ['علامات', 'محفوظات', 'حفظ', 'bookmarks', 'saved'],
      },
      {
        action: 'data',
        label: 'مستودع البيانات',
        description: 'تنزيل quran.json وبيانات الخطوط',
        icon: Database,
        keywords: ['بيانات', 'مستودع', 'تنزيل', 'تحميل', 'json', 'data', 'download'],
      },
      {
        action: 'about',
        label: 'عن المشروع',
        description: 'قصة المشروع والتقنيات المستخدمة',
        icon: Info,
        keywords: ['عن', 'مشروع', 'حول', 'about', 'info'],
      },
      {
        action: 'sources',
        label: 'المصادر والتراخيص',
        description: 'مصادر النص والتلاوات والخطوط',
        icon: ScrollText,
        keywords: ['مصادر', 'تراخيص', 'تلاوات', 'خطوط', 'sources', 'license'],
      },
      {
        action: 'contact',
        label: 'تواصل معنا',
        description: 'رابط مستودع GitHub وقسم المسائل',
        icon: Mail,
        keywords: ['تواصل', 'اتصال', 'github', 'contact', 'mail', 'مسائل'],
      },
      {
        action: 'toggle-theme',
        label: isDark ? 'التبديل إلى الوضع البيج' : 'التبديل إلى الوضع الليلي',
        description: isDark ? 'الوضع الحالي: ليلي (افتراضي)' : 'الوضع الحالي: بيج',
        icon: isDark ? Sun : Moon,
        keywords: ['وضع', 'سمة', 'ليلي', 'بيج', 'تبديل', 'theme', 'dark', 'beige'],
      },
    ];
  }, [currentTheme]);

  // ----- فلترة الأوامر -----
  const actionFilter = useMemo(() => normalizeArabicText(query), [query]);

  // ----- فلترة السور: بالرقم (مع دعم الأرقام العربية) أو بالاسم/الترجمة -----
  const surahFilter = useMemo(() => {
    const trimmed = query
      .trim()
      .replace(/^(?:سورة|سوره|سورت)\s+/u, '')
      .trim();
    if (!trimmed) return { numeric: null as number | null, text: '' };
    const western = toWesternDigits(trimmed);
    if (/^[0-9]+$/.test(western)) {
      return { numeric: Number(western), text: '' };
    }
    return { numeric: null, text: normalizeArabicText(trimmed) };
  }, [query]);

  const filteredActions = useMemo(() => {
    if (!actionFilter) return actionDefinitions;
    return actionDefinitions.filter((definition) => {
      const haystack = normalizeArabicText(
        [definition.label, definition.description, ...definition.keywords].join(' ')
      );
      return haystack.includes(actionFilter);
    });
  }, [actionDefinitions, actionFilter]);

  const filteredSurahs = useMemo(() => {
    const { numeric, text } = surahFilter;
    if (!query.trim()) return surahs;
    return surahs.filter((surah) => {
      if (numeric !== null) return surah.id === numeric;
      if (!text) return false;
      const haystack = normalizeArabicText(`${surah.name} ${surah.transliteration}`);
      return haystack.includes(text);
    });
  }, [surahs, surahFilter, query]);

  const items = useMemo<PaletteItem[]>(
    () => [
      ...filteredActions.map((definition) => ({
        kind: 'action' as const,
        id: `action-${definition.action}`,
        definition,
      })),
      ...filteredSurahs.map((surah) => ({
        kind: 'surah' as const,
        id: `surah-${surah.id}`,
        surah,
      })),
    ],
    [filteredActions, filteredSurahs]
  );

  const totalCount = items.length;
  const actionCount = filteredActions.length;

  // إعادة المؤشر إلى أول نتيجة عند تغيير نص البحث
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // ضبط المؤشر إن تقلّصت النتائج (مثل تغيّر قائمة السور)
  useEffect(() => {
    setActiveIndex((index) => (index >= totalCount ? 0 : index));
  }, [totalCount]);

  // ----- فتح اللوحة: التقاط التركيز السابق، تركيز الحقل، حصر Tab، Escape، ثم استعادة التركيز -----
  useEffect(() => {
    if (!open) return;

    setCurrentTheme(readCurrentTheme());
    setQuery('');
    setActiveIndex(0);

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialogNode = dialogRef.current;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

    const getFocusableElements = (): HTMLElement[] => {
      if (!dialogNode) return [];
      return Array.from(
        dialogNode.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null);
    };

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogNode) return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogNode.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      // إذا خرج التركيز من النافذة لأي سبب، أعده إلى داخلها
      if (!(activeElement instanceof Node) || !dialogNode.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      if (event.shiftKey && (activeElement === firstElement || activeElement === dialogNode)) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleDialogKeyDown);
      const previouslyFocused = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  // إبقاء العنصر النشط ظاهرًا داخل قائمة النتائج
  useEffect(() => {
    if (!open) return;
    const listNode = listRef.current;
    if (!listNode) return;
    const activeOption = listNode.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`
    );
    activeOption?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open, totalCount]);

  const executeItem = (item: PaletteItem | undefined) => {
    if (!item) return;
    if (item.kind === 'action') {
      onAction(item.definition.action);
    } else {
      onSelectSurah(item.surah.id);
    }
    onClose();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // لا تنفّذ أثناء تركيب النص بمدخلات IME
    if (event.nativeEvent.isComposing) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (totalCount > 0) setActiveIndex((index) => (index + 1) % totalCount);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (totalCount > 0) setActiveIndex((index) => (index - 1 + totalCount) % totalCount);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      executeItem(items[activeIndex] ?? items[0]);
    }
  };

  if (!open) return null;

  const renderedItems = items.map((item, index) => {
    const isActive = index === activeIndex;
    const activeOptionId = optionId(index);
    const optionClassName = `flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-colors ${
      isActive
        ? 'bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-700/30'
        : 'text-stone-700 hover:bg-stone-100'
    }`;

    const handleClick = () => executeItem(item);
    const handleMouseMove = () => {
      if (!isActive) setActiveIndex(index);
    };

    if (item.kind === 'action') {
      const Icon = item.definition.icon;
      return (
        <div
          key={item.id}
          id={activeOptionId}
          role="option"
          aria-selected={isActive}
          data-option-index={index}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          className={optionClassName}
        >
          <span
            aria-hidden="true"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isActive ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold font-sans">
              {item.definition.label}
            </span>
            <span className="block truncate text-[11px] text-stone-500 font-sans">
              {item.definition.description}
            </span>
          </span>
          {item.definition.action === 'toggle-theme' && (
            <span className="shrink-0 rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600 font-sans">
              {currentTheme === 'dark' ? 'ليلي' : 'بيج'}
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        key={item.id}
        id={activeOptionId}
        role="option"
        aria-selected={isActive}
        data-option-index={index}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        className={optionClassName}
      >
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold transition-colors ${
            isActive ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-stone-600'
          }`}
        >
          {toArabicDigits(item.surah.id)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-base font-bold font-quran text-stone-900">
              {item.surah.name}
            </span>
            <span
              className="truncate text-[11px] text-stone-400 font-sans"
              dir="ltr"
            >
              {item.surah.transliteration}
            </span>
          </span>
          <span className="block truncate text-[11px] text-stone-500 font-sans">
            سورة {item.surah.type === 'meccan' ? 'مكية' : 'مدنية'} ·{' '}
            {toArabicDigits(item.surah.total_verses)} آية
          </span>
        </span>
      </div>
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="لوحة الأوامر والتنقل السريع"
        tabIndex={-1}
        dir="rtl"
        className={`flex h-full w-full flex-col overflow-hidden bg-white font-sans shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl border border-stone-200 ${FOCUS_RING}`}
      >
        {/* رأس اللوحة */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-[#FAF7F0] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-white"
            >
              <Command className="h-4 w-4" />
            </span>
            <h2 id={titleId} className="truncate text-sm font-bold text-stone-900">
              لوحة الأوامر والتنقل السريع
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <kbd className="hidden items-center gap-1 rounded-md border border-stone-300/70 bg-white/70 px-1.5 py-0.5 font-mono text-[10px] text-stone-500 sm:inline-flex">
              Ctrl+K
            </kbd>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق لوحة الأوامر"
              className={`rounded-lg px-2 py-1 text-[11px] font-sans text-stone-500 transition-colors hover:bg-stone-200/70 hover:text-stone-900 ${FOCUS_RING}`}
            >
              إغلاق ✕
            </button>
          </div>
        </div>

        {/* حقل البحث السريع */}
        <div className="flex shrink-0 items-center gap-2 border-b border-stone-200 px-4 py-3 sm:px-5">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-stone-400" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={true}
            aria-controls={listboxId}
            aria-activedescendant={
              totalCount > 0 ? optionId(Math.min(activeIndex, totalCount - 1)) : undefined
            }
            aria-autocomplete="list"
            aria-label="بحث سريع في أوامر الموقع وسور القرآن الكريم"
            placeholder="بحث سريع… Ctrl+K"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            dir="rtl"
            className="w-full bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none font-sans"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="مسح نص البحث السريع"
              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 ${FOCUS_RING}`}
            >
              مسح ✕
            </button>
          )}
        </div>

        {/* قائمة النتائج */}
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="نتائج البحث السريع في الأوامر والسور"
          className="min-h-0 flex-1 overflow-y-auto px-2 pb-3"
        >
          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <Search aria-hidden="true" className="h-6 w-6 text-stone-300" />
              <p className="text-sm font-semibold text-stone-700 font-sans">
                لا توجد نتائج مطابقة
              </p>
              <p className="max-w-sm text-xs leading-relaxed text-stone-500 font-sans">
                جرّب اسم سورة آخر مثل «الكهف»، أو رقم سورة مثل «٣٦»، أو ابحث عن أمر
                مثل «الوضع» أو «البيانات».
              </p>
            </div>
          ) : (
            <>
              {actionCount > 0 && (
                <div role="group" aria-label="أوامر سريعة">
                  <div className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wide text-stone-400 font-sans">
                    أوامر سريعة
                  </div>
                  {renderedItems.slice(0, actionCount)}
                </div>
              )}

              {totalCount - actionCount > 0 && (
                <div role="group" aria-label="سور القرآن الكريم">
                  <div className="flex items-center gap-1.5 px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wide text-stone-400 font-sans">
                    <BookOpen aria-hidden="true" className="h-3 w-3" />
                    <span>السور</span>
                  </div>
                  {renderedItems.slice(actionCount)}
                </div>
              )}
            </>
          )}
        </div>

        {/* تذييل: تلميحات لوحة المفاتيح وعدد النتائج */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-stone-200 bg-[#FAF7F0] px-4 py-2 text-[11px] text-stone-500 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <ArrowUp aria-hidden="true" className="h-3 w-3" />
              <ArrowDown aria-hidden="true" className="h-3 w-3" />
              <span>للتنقل</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-stone-300/70 bg-white/70 px-1 py-0.5 font-mono text-[9px] text-stone-500">
                Enter
              </kbd>
              <span>للفتح</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-stone-300/70 bg-white/70 px-1 py-0.5 font-mono text-[9px] text-stone-500">
                Esc
              </kbd>
              <span className="hidden sm:inline">للإغلاق</span>
            </span>
          </div>
          <span role="status" aria-live="polite" className="shrink-0 font-sans">
            {formatResultCount(totalCount)}
          </span>
        </div>
      </div>
    </div>
  );
};
