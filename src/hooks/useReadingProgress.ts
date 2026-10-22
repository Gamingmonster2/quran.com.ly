import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * مفتاح localStorage الذي يُحفظ فيه آخر موضع قراءة.
 * القيمة المحفوظة: `{ sura: number; aya: number; updatedAt: number }`
 */
const STORAGE_KEY = 'quran_reading_progress';

const MIN_SURA = 1;
const MAX_SURA = 114;
const MIN_AYA = 1;

/** آخر موضع قراءة محفوظ في المتصفح. */
export interface ReadingProgress {
  sura: number;
  aya: number;
  updatedAt: number;
}

function isValidPosition(sura: unknown, aya: unknown): boolean {
  return (
    typeof sura === 'number' &&
    Number.isInteger(sura) &&
    sura >= MIN_SURA &&
    sura <= MAX_SURA &&
    typeof aya === 'number' &&
    Number.isInteger(aya) &&
    aya >= MIN_AYA
  );
}

/** يقرأ الموضع المحفوظ ويتحقق من صحته، ويعيد null عند أي خطأ. */
function readStoredProgress(): ReadingProgress | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const { sura, aya, updatedAt } = parsed as {
      sura?: unknown;
      aya?: unknown;
      updatedAt?: unknown;
    };
    if (!isValidPosition(sura, aya)) return null;

    return {
      sura: sura as number,
      aya: aya as number,
      updatedAt:
        typeof updatedAt === 'number' && Number.isFinite(updatedAt)
          ? updatedAt
          : Date.now(),
    };
  } catch {
    // localStorage محظور أو القيمة تالفة — نتابع دون تقدم محفوظ
    return null;
  }
}

/** يكتب الموضع المحفوظ، أو يحذف المفتاح عند تمرير null. */
function writeStoredProgress(progress: ReadingProgress | null): void {
  try {
    if (progress === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  } catch {
    /* التخزين غير متاح — تتجاهل الخاصية بهدوء */
  }
}

/**
 * يحفظ آخر آية قرأها المستخدم في localStorage ويوفرها للاستئناف لاحقًا.
 * تُستخدم عادةً في App وتُربط بـ ReaderView عبر onAyahVisible/resumeTarget.
 */
export function useReadingProgress(): {
  progress: ReadingProgress | null;
  saveProgress: (sura: number, aya: number) => void;
  clearProgress: () => void;
} {
  const [progress, setProgress] = useState<ReadingProgress | null>(readStoredProgress);
  // مرجع يُحدَّث فورًا داخل saveProgress حتى لا تعتمد إزالة التكرار
  // على توقيت إعادة الرسم (قد تُنادى saveProgress مرات متعددة في نفس الدورة).
  const progressRef = useRef<ReadingProgress | null>(progress);

  const saveProgress = useCallback((sura: number, aya: number) => {
    // تحقق من الصحة: سورة 1..114 وآية ≥ 1
    if (!isValidPosition(sura, aya)) return;

    const current = progressRef.current;
    // نفس الموضع محفوظ سلفًا: لا نحدّث الحالة ولا التخزين (تجنب Renders زائدة)
    if (current && current.sura === sura && current.aya === aya) return;

    const next: ReadingProgress = { sura, aya, updatedAt: Date.now() };
    progressRef.current = next;
    writeStoredProgress(next);
    setProgress(next);
  }, []);

  const clearProgress = useCallback(() => {
    progressRef.current = null;
    writeStoredProgress(null);
    setProgress((current) => (current === null ? current : null));
  }, []);

  // مزامنة التغييرات القادمة من تبويب/نافذة أخرى (حدث storage لا يُطلق في نفس التبويب).
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      const next = readStoredProgress();
      progressRef.current = next;
      setProgress(next);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return { progress, saveProgress, clearProgress };
}
