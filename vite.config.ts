import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Mount the Vercel serverless handler directly inside Vite dev server so
 * `npm run dev` serves both the frontend and `/api/claude` on the same origin.
 */
function localClaudeApiPlugin(): Plugin {
  return {
    name: 'verbatim-local-claude-api',
    configureServer(server) {
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

export default defineConfig({
  plugins: [react(), localClaudeApiPlugin()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
