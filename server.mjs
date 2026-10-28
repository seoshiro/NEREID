import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp4':'video/mp4','.webm':'video/webm','.woff2':'font/woff2'};
const server = http.createServer((req,res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname)); }
  catch { res.writeHead(400).end(); return; }
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (file === root) file = path.join(root,'index.html');
  let stat; try { stat = statSync(file); if (!stat.isFile()) throw Error(); }
  catch { res.writeHead(404).end('Not found'); return; }
  const headers = {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
  const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if (range) {
    const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]),stat.size-1) : stat.size-1;
    if (start > end || start >= stat.size) { res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end(); return; }
    res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});
    createReadStream(file,{start,end}).pipe(res);
  } else { res.writeHead(200,{...headers,'Content-Length':stat.size}); createReadStream(file).pipe(res); }
});
server.listen(4173,'127.0.0.1',()=>console.log('NEREID: http://127.0.0.1:4173'));
