import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [vue(),tailwindcss()],
  css: {
    postcss: './postcss.config.cjs',  // Apunta explícitamente para forzar procesamiento
  },
  server: { proxy: { '/api': process.env.VITE_API_BASE_URL }  || 'https://localhost:7245'}
});