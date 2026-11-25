import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import autoTranslate from './scripts/i18n/auto-translate.mjs';

export default defineConfig({
  plugins: [react({ babel: { plugins: [autoTranslate] } })],
  server: {
    port: 5174,
    strictPort: false,
  },
});
