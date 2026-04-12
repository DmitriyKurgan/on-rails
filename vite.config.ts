import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // base is set to '/on-rails/' only for production builds (gh-pages).
  // In dev mode it stays '/' so local asset paths like /assets/models/*.glb work.
  base: process.env.NODE_ENV === 'production' ? '/on-rails/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: false,
    open: false,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  publicDir: 'public',
});
