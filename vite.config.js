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
    // When running `npm run dev` directly: defaults to port 3000.
    // When running `npm run dev:full` (vercel dev): vercel injects a PORT env
    // variable so Vite starts on an internal port (e.g. 3001) and vercel dev
    // itself acts as the outer server on port 3000, routing /api/* to functions.
    port: parseInt(process.env.PORT) || 3000,
    open: true,           // Auto-open browser on "npm run dev".
    // NOTE: No proxy for /api here. When running the full stack, use
    // `npm run dev:full` (vercel dev), which handles /api/* routing at
    // the outer Vercel layer before requests reach Vite.
  },
});
