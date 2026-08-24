import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Target kernel-srv backend URL (default 8100 as per kernel-srv spec)
const KERNEL_SRV_URL = process.env.KERNEL_SRV_URL || 'http://localhost:8100';

// Health reflects the upstream kernel-srv (its /health route), never a
// synthetic "healthy" response. When the backend is unreachable the client
// receives an explicit 503 so live failures stay visible.
app.get(['/api/health', '/health', '/api/kernel/health'], async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const proxyRes = await fetch(`${KERNEL_SRV_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      // kernel-srv reports status "ok"; map to the UI vocabulary.
      if (data && typeof data === 'object' && data.status === 'ok') {
        return res.json({ ...data, status: 'healthy' });
      }
      return res.status(proxyRes.status).json(data);
    }
    return res.status(proxyRes.status).json({
      status: 'unhealthy',
      db: false,
      pgNotify: false,
      subscribers: 0,
      service: 'kernel-srv (PostgreSQL Semantic Kernel API)',
      error: `upstream returned HTTP ${proxyRes.status}`,
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'unhealthy',
      db: false,
      pgNotify: false,
      subscribers: 0,
      service: 'kernel-srv (PostgreSQL Semantic Kernel API)',
      error: `kernel-srv unreachable at ${KERNEL_SRV_URL}: ${err?.message || 'timeout'}`,
    });
  }
});

// Proxy /api/kernel/* to the real kernel-srv. Upstream failures are returned
// as explicit 502/forwarded-status errors — the client never receives SPA
// HTML for an API call, so it cannot mistake a failure for mock success.
app.all('/api/kernel/*', async (req, res) => {
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

    const text = await proxyRes.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    if (proxyRes.ok) {
      return res.status(proxyRes.status).json(data);
    }
    return res.status(proxyRes.status).json({
      status: 'error',
      message: `kernel-srv returned HTTP ${proxyRes.status}`,
      upstream: data,
    });
  } catch (err: any) {
    return res.status(502).json({
      status: 'error',
      message: `kernel-srv unreachable at ${KERNEL_SRV_URL}: ${err?.message || 'timeout'}`,
    });
  }
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
