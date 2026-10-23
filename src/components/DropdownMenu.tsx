import React, { useEffect, useRef, useState } from 'react';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

export interface DropdownItem {
  key: string;
  label: string;
  onSelect: () => void;
}

interface DropdownMenuProps {
  /** نص الزر (يُخفى على الجوال إن كان showLabel='sm') */
  label: string;
  ariaLabel?: string;
  items: DropdownItem[];
  icon?: React.ReactNode;
  align?: 'start' | 'end';
  className?: string;
  /** always: النص دائمًا، sm: النص على الشاشات المتوسطة+ (أيقونة فقط على الجوال) */
  showLabel?: 'always' | 'sm';
}

/**
 * قائمة منسدلة موحّدة (زر + لوحة) — تُفتح بالنقر، وتُغلق بالخارج أو Escape.
 * تُستخدم للأشياء الثانوية بدل عرضها بشكل دائم (مبدأ «منصة هادئة»).
 */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  label,
  ariaLabel,
  items,
  icon,
  align = 'end',
  className = '',
  showLabel = 'sm',
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel ?? label}
        title={ariaLabel ?? label}
        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200/70 hover:text-stone-900 ${FOCUS_RING}`}
      >
        {icon}
        {showLabel === 'always' ? (
          <span className="whitespace-nowrap">{label}</span>
        ) : (
          <span className="hidden whitespace-nowrap sm:inline">{label}</span>
        )}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={ariaLabel ?? label}
          className={`absolute z-50 mt-1 min-w-44 overflow-hidden rounded-xl border border-stone-200 bg-white/95 p-1 text-start shadow-lg backdrop-blur-md ${
            align === 'end' ? 'end-0' : 'start-0'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`block w-full rounded-lg px-3 py-2 text-start text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 ${FOCUS_RING}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
