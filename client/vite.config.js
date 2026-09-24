import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * إعداد Vite.
 *  • الاسم المستعار @ يشير إلى src لتجنّب مسارات ../../../
 *  • البروكسي يوجّه /api و/uploads إلى الخادم في بيئة التطوير، فلا
 *    نحتاج CORS ولا عنوانًا مطلقًا في الكود.
 */
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      // الصور المرفوعة يقدّمها الخادم من مجلّد uploads
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
