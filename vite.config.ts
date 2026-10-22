import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '', '.'),
      },
    },
    server: {
      // يمكن تعطيل التحديث الفوري (HMR) عبر: DISABLE_HMR=1 npm run dev
      hmr: process.env.DISABLE_HMR !== 'true',
      // تعطيل مراقبة الملفات عند تعطيل HMR لتوفير موارد الجهاز
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
