import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Target kernel-srv backend URL (default 8100 as per kernel-srv spec)
const KERNEL_SRV_URL = process.env.KERNEL_SRV_URL || 'http://localhost:8100';

// Proxy middleware or direct mock endpoint handler
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'healthy',
    db: true,
    pgNotify: true,
    subscribers: 1,
    port: 8100,
    service: 'kernel-srv (PostgreSQL Semantic Kernel API)',
    timestamp: new Date().toISOString(),
  });
});

// Proxy routes for /api/kernel/* if real backend is running or fallback
app.all('/api/kernel/*', async (req, res, next) => {
  // If target kernel-srv is available, attempt proxy
  const targetPath = req.path.replace(/^\/api\/kernel/, '');
  const targetUrl = `${KERNEL_SRV_URL}/api/kernel${targetPath}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      signal: controller.signal,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && Object.keys(req.body || {}).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const proxyRes = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeout);

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return res.status(proxyRes.status).json(data);
    }
  } catch (err) {
    // If backend is not running locally on 8100, allow frontend client to use mock engine directly
  }

  next();
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Semantic Kernel IDE Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
