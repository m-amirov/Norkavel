import { createServer as httpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const allowed = Object.freeze({
  '/': ['web/index.html','text/html; charset=utf-8'],
  '/index.html': ['web/index.html','text/html; charset=utf-8'],
  '/style.css': ['web/style.css','text/css; charset=utf-8'],
  '/main.mjs': ['web/main.mjs','text/javascript; charset=utf-8'],
  '/src/combat.mjs': ['src/combat.mjs','text/javascript; charset=utf-8'],
  '/assets/art/warrior-concept-01.png': ['assets/art/warrior-concept-01.png','image/png'],
  '/assets/art/arena-ruins-01.png': ['assets/art/arena-ruins-01.png','image/png'],
  '/ludory.project.json': ['ludory.project.json','application/json; charset=utf-8'],
  '/vendor/ludory/packages/core/src/browser.mjs': ['vendor/ludory/packages/core/src/browser.mjs','text/javascript; charset=utf-8'],
  '/vendor/ludory/packages/core/src/definition.mjs': ['vendor/ludory/packages/core/src/definition.mjs','text/javascript; charset=utf-8'],
  '/vendor/ludory/packages/core/src/state.mjs': ['vendor/ludory/packages/core/src/state.mjs','text/javascript; charset=utf-8'],
  '/vendor/ludory/packages/core/src/session.mjs': ['vendor/ludory/packages/core/src/session.mjs','text/javascript; charset=utf-8']
});
export function createStaticServer() {
  return httpServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const entry = Object.hasOwn(allowed, url.pathname) ? allowed[url.pathname] : null;
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    res.setHeader('Cache-Control','no-store');
    if ((req.method !== 'GET' && req.method !== 'HEAD') || !entry) {
      res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});res.end('Not Found');return;
    }
    try {
      const data = await readFile(path.join(root,entry[0]));
      res.writeHead(200, {'Content-Type':entry[1]});
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
      res.writeHead(500, {'Content-Type':'text/plain; charset=utf-8'});res.end('Requested project file unavailable');
    }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  const pick=(flag,fallback)=>{const i=args.indexOf(flag);return i<0?fallback:args[i+1];};
  const port=Number(pick('--port',process.env.PORT||4173));
  const host=pick('--host','127.0.0.1');
  if (!Number.isInteger(port) || port<0 || port>65535 || !['127.0.0.1','0.0.0.0','::1'].includes(host)) {
    console.error('Invalid host/port'); process.exitCode=2;
  } else createStaticServer().listen(port,host,()=>console.log('Norkavel G2 preview: http://'+host+':'+port));
}
