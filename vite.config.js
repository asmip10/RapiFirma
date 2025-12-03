import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  css: {
    postcss: './postcss.config.cjs',  // Apunta explícitamente para forzar procesamiento
  },
  server: {
    proxy: { '/api': process.env.VITE_API_BASE_URL } || 'https://localhost:7245'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/views': resolve(__dirname, 'src/views'),
      '@/stores': resolve(__dirname, 'src/stores'),
      '@/services': resolve(__dirname, 'src/services'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/config': resolve(__dirname, 'src/config'),
      '@/guards': resolve(__dirname, 'src/guards'),
      '@/composables': resolve(__dirname, 'src/composables'),
      '@/assets': resolve(__dirname, 'src/assets'),
      '@/styles': resolve(__dirname, 'src/styles')
    }
  }
});