import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Mount the Vercel serverless handler directly inside the Vite dev server and
 * hydrate process.env from .env.local so `npm run dev` serves both the SPA and
 * `/api/claude` on the same origin.
 */
function localClaudeApiPlugin(mode: string): Plugin {
  return {
    name: 'verbatim-local-claude-api',
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), '');
      for (const key of [
        'ANTHROPIC_API_KEY',
        'VERBATIM_QUICK_MODEL',
        'VERBATIM_ANALYSIS_MODEL',
        'MAX_LIVE_CALLS_PER_DAY',
      ]) {
        if (!process.env[key] && env[key]) {
          process.env[key] = env[key];
        }
      }
      server.middlewares.use('/api/claude', async (req, res, next) => {
        try {
          const mod = await import('./api/claude.js');
          await mod.default(req, res);
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), localClaudeApiPlugin(mode)],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
}));
