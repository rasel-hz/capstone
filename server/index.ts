// Production server: serves the built app and the API. In development, vite.config.ts mounts the same API.
import { existsSync, createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { createApi, depsFromEnv } from './api.ts';

if (existsSync('.env')) process.loadEnvFile('.env');

const DIST = join(process.cwd(), 'dist');
const PORT = Number(process.env.PORT) || 8765;
const HOST = process.env.HOST || '127.0.0.1';
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webm': 'video/webm', '.svg': 'image/svg+xml',
};

const api = createApi(depsFromEnv(process.env));

createServer((req, res) => {
  void api(req, res, () => {
    let path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (path === '/') path = '/index.html';
    const file = normalize(join(DIST, path));
    if (!file.startsWith(DIST + sep) || !existsSync(file) || !statSync(file).isFile()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
    createReadStream(file).pipe(res);
  });
}).listen(PORT, HOST, () => console.log(`Khowayk running at http://${HOST}:${PORT}`));
