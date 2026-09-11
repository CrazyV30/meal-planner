const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const routes = require('./routes/routes');

const PORT = 3009;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJSON(res, statusCode, data) {
  setCorsHeaders(res);
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

async function readJSONBody(req) {
  const raw = await readBody(req);
  return raw ? JSON.parse(raw) : {};
}

function notFound(res, error) {
  sendJSON(res, 404, { error });
}

async function parseBody(req, res) {
  try {
    return { body: await readJSONBody(req) };
  } catch {
    sendJSON(res, 400, { error: 'Некоректний JSON у тілі запиту (400 Bad Request)' });
    return null;
  }
}

async function serve404(res) {
  try {
    const data = await fs.readFile(path.join(PUBLIC_DIR, '404.html'));
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found (404)');
  }
}

async function serveStatic(res, pathname) {
  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, relativePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    await serve404(res);
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    });
    res.end(data);
  } catch {
    await serve404(res);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const { pathname } = url;

    console.log(`${req.method} ${pathname}`);

    if (!pathname.startsWith('/api/')) {
      if (req.method === 'GET') await serveStatic(res, pathname);
      else await serve404(res);
      return;
    }

    let route, match;
    for (const r of routes) {
      if (r.method !== req.method) continue;
      match = pathname.match(r.pattern);
      if (match) {
        route = r;
        break;
      }
    }

    if (!route) {
      return notFound(res, `Маршрут '${pathname}' не знайдено (404 Not Found)`);
    }

    await route.handler(
      req,
      res,
      url,
      match.slice(1).map(decodeURIComponent),
      { sendJSON, parseBody }
    );
  } catch (error) {
    console.error('500 Internal Server Error:', error);
    sendJSON(res, 500, {
      error: 'Внутрішня помилка сервера (500 Internal Server Error)',
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
