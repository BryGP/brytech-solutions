/* ============================================================
   vite.config.js -- BryTech Solutions
   ------------------------------------------------------------
   Vite bundler configuration. Defines the project root, build
   output directory, and local development server settings.

   (c) 2026 BryTech Solutions -- bryanalejandroprog17@gmail.com
   ============================================================ */

import { defineConfig } from 'vite';

export default defineConfig({
  // Project root directory (current directory).
  root: '.',

  // Production build settings.
  build: {
    outDir: 'dist',       // Output folder for "npm run build".
    emptyOutDir: true,    // Clears dist/ before each build.
  },

  // Development server settings.
  server: {
    port: 3000,           // Local dev server port.
    open: true,           // Auto-open browser on "npm run dev".
  },
});
