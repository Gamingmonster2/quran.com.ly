import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// تسجيل عامل الخدمة (PWA) في بناء الإنتاج فقط حتى يعمل الموقع دون اتصال.
// في وضع التطوير لا نسجّل شيئًا حتى لا يتداخل الكاش مع HMR.
// الملف /sw.js يُولَّد آليًا بعد البناء عبر scripts/generate-pwa.mjs.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* التسجيل تحسين اختياري: فشله لا يجب أن يكسر التطبيق */
    });
  });
}
