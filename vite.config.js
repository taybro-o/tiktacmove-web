import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Simple in-memory API for LAN testing
const matchmakingPlugin = () => {
  let queueData = null;
  return {
    name: 'matchmaking-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/api/matchmaking')) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            return res.end();
          }

          if (req.method === 'GET') {
            return res.end(JSON.stringify({ data: { queue: queueData } }));
          }

          if (req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                queueData = parsed.data?.queue || null;
                res.end(JSON.stringify({ success: true }));
              } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
              }
            });
            return;
          }
        }
        next();
      });
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), matchmakingPlugin()],
  server: {
    host: true
  }
})
