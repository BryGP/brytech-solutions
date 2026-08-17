/* ============================================================
   vite.config.js -- BryTech Solutions
   ------------------------------------------------------------
   Vite bundler configuration. Defines the project root, build
   output directory, and local development server settings.

   ── Development Modes ────────────────────────────────────────
   Frontend only (no API):
     npm run dev         → http://localhost:3000
                           API calls to /api/* will be proxied
                           to the Vercel dev server if running.

   Full-stack (frontend + API functions):
     npm run dev:full    → http://localhost:3000
                           Uses `vercel dev` to run both the
                           Vite frontend and Serverless Functions
                           simultaneously. Requires Vercel CLI.

   Install Vercel CLI once:
     npm i -g vercel

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

    // Proxy /api/* to Vercel dev server (port 3000 when using vercel dev).
    // This allows frontend-only `npm run dev` to still reach API functions
    // if `vercel dev` is running in a separate terminal on the same port.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Note: When using `npm run dev:full` (vercel dev), this proxy
        // is not needed because Vercel dev handles both frontend and API.
      },
    },
  },
});
