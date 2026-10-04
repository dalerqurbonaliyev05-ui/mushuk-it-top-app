import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Capacitor WebView fayllarni nisbiy yo'ldan yuklaydi, shuning uchun base: './'.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5181 },
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
});
