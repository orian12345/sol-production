import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  build: isSsrBuild
    ? {}
    : {
        rollupOptions: {
          input: {
            main: r('./index.html'),
            barmitzvah: r('./bar-mitzvah.html'),
            accessibility: r('./accessibility.html'),
            quote: r('./quote.html'),
          },
        },
      },
}));
