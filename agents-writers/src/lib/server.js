import http from 'node:http';
import path from 'node:path';
import { URL } from 'node:url';

import { withActionLog } from './action-log.js';
import { exportBundle } from './exporter.js';
import { progressEmitter } from './progress.js';
import { applyPreset, createBook, generateBook, generateChapter, getStatus, initBook, selectBook, setBehavior, translateChapter } from './workflow.js';
import { readText, setEnvVariable } from './utils.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8'
};

// Basic security headers applied to every response.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin'
};

export async function startUiServer(rootPath, options = {}) {
  return withActionLog(rootPath, {
    source: 'server',
    action: 'serve-ui',
    input: { options }
  }, async () => {
    const port = Number(options.port || 4173);
    const publicDir = path.join(rootPath, 'public');

    const server = http.createServer(async (request, response) => {
      try {
        const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

        if (url.pathname.startsWith('/api/')) {
          await handleApi(rootPath, request, response, url);
          return;
        }

        // Prevent path traversal: resolve and confirm the target is inside publicDir.
        const target = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        const filePath = path.resolve(publicDir, target);

        if (!filePath.startsWith(publicDir + path.sep) && filePath !== publicDir) {
          response.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS });
          response.end(JSON.stringify({ error: 'Forbidden.' }));
          return;
        }

        const extension = path.extname(filePath);
        const content = await readText(filePath);

        response.writeHead(200, {
          'Content-Type': MIME_TYPES[extension] || 'text/plain; charset=utf-8',
          ...SECURITY_HEADERS
        });
        response.end(content);
      } catch (error) {
        response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS });
        response.end(JSON.stringify({ error: error.message }, null, 2));
      }
    });

    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolve);
    });

    return {
      message: 'UI server started.',
      url: `http://127.0.0.1:${port}`
    };
  });
}

async function handleApi(rootPath, request, response, url) {
  const method = request.method || 'GET';

  // SSE endpoint — no body parsing, no action log, long-lived connection.
  if (method === 'GET' && url.pathname === '/api/events') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...SECURITY_HEADERS
    });

    const heartbeat = setInterval(() => {
      response.write(': heartbeat\n\n');
    }, 20_000);

    const onProgress = (payload) => {
      response.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    progressEmitter.on('progress', onProgress);

    request.on('close', () => {
      clearInterval(heartbeat);
      progressEmitter.off('progress', onProgress);
    });

    return;
  }

  const body = method === 'GET' ? {} : await readBody(request);

  try {
    const payload = await withActionLog(rootPath, {
      source: 'api',
      action: `${method.toLowerCase()} ${url.pathname}`,
      input: {
        method,
        path: url.pathname,
        body
      }
    }, async () => {
      if (method === 'GET' && url.pathname === '/api/status') {
        return getStatus(rootPath);
      }

      if (method === 'POST' && url.pathname === '/api/preset') {
        return applyPreset(rootPath, body.presetName);
      }

      if (method === 'POST' && url.pathname === '/api/set') {
        return setBehavior(rootPath, body.agentName, body.key, body.value);
      }

      if (method === 'POST' && url.pathname === '/api/generate') {
        return generateChapter(rootPath, body);
      }

      if (method === 'POST' && url.pathname === '/api/generate-book') {
        return generateBook(rootPath, body);
      }

      if (method === 'POST' && url.pathname === '/api/translate') {
        return translateChapter(rootPath, body);
      }

      if (method === 'POST' && url.pathname === '/api/export') {
        return exportBundle(rootPath, body);
      }

      if (method === 'POST' && url.pathname === '/api/books') {
        return createBook(rootPath, body);
      }

      if (method === 'POST' && url.pathname === '/api/book-metadata') {
        return initBook(rootPath, body);
      }

      if (method === 'POST' && url.pathname === '/api/select-book') {
        return selectBook(rootPath, body.bookId);
      }

      if (method === 'POST' && url.pathname === '/api/openrouter-key') {
        const apiKey = String(body.apiKey || '').trim();

        if (!apiKey) {
          throw new Error('Provide an API key.');
        }

        // Validate basic OpenRouter key format.
        if (!apiKey.startsWith('sk-or-')) {
          throw new Error('API key must start with sk-or-');
        }

        await setEnvVariable(rootPath, 'OPENROUTER_API_KEY', apiKey);
        return {
          message: 'OpenRouter API key saved to .env.',
          configured: true
        };
      }

      return { error: 'Not found.', _status: 404 };
    });

    return sendJson(response, payload._status || 200, payload.error && payload._status ? { error: payload.error } : payload);
  } catch (error) {
    return sendJson(response, 500, { error: error.message });
  }
}

async function readBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS });
  response.end(JSON.stringify(payload, null, 2));
}
