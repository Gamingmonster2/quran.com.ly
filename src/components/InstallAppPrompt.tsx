import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useI18n } from '../i18n.tsx';

const DISMISS_KEY = 'quran_install_prompt_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** زر تثبيت التطبيق (PWA) — يظهر مرة واحدة كبطاقة صغيرة قابلة للإغلاق. */
export const InstallAppPrompt: React.FC = () => {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      /* ignore */
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => null);
    dismiss();
  };

  if (!visible || !deferredPrompt) return null;

  return (
    <aside
      aria-label={t('install.title')}
      className="fixed bottom-3 left-3 z-40 flex max-w-[290px] items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-md"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-900/10 text-emerald-900">
        <Download aria-hidden="true" className="h-4 w-4" />
      </span>
      <p className="min-w-0 flex-1 text-[10px] font-medium leading-snug text-stone-700">
        {t('install.title')}
      </p>
      <button
        type="button"
        onClick={install}
        className="shrink-0 rounded-lg bg-emerald-900 px-2 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-800"
      >
        {t('install.action')}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('common.close')}
        className="shrink-0 rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </aside>
  );
};
