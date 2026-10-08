// node render.mjs contact            -> out/contact_*.jpg (one frame per beat)
// node render.mjs frames 1.2 5.0     -> out/still_<t>.jpg
// node render.mjs full               -> out/frames/*.jpg + audio + out/jl-ausbildung.mp4
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf' };

const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const URL_ = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--force-color-profile=srgb', '--disable-gpu-vsync'] });
async function newPage() {
  const p = await browser.newPage();
  await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.error('PAGE ERROR', e.message));
  p.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await p.goto(URL_, { waitUntil: 'load' });
  await p.evaluate(() => window.ready);
  return p;
}
async function grab(p, t, file, q = 0.95) {
  const b64 = await p.evaluate((t, q) => { window.seek(t); return document.getElementById('c').toDataURL('image/jpeg', q).split(',')[1]; }, t, q);
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
}

const mode = process.argv[2] || 'contact';
const page = await newPage();
const FILM = await page.evaluate(() => window.FILM);
fs.writeFileSync(path.join(OUT, 'beats.json'), JSON.stringify(FILM.beats));
fs.writeFileSync(path.join(OUT, 'events.json'), JSON.stringify({ duration: FILM.DURATION, bpm: FILM.BPM, sections: FILM.sections, events: FILM.events }, null, 1));

if (mode === 'contact') {
  const dir = path.join(OUT, 'contact'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const B = 60 / FILM.BPM, n = Math.floor(FILM.DURATION / B);
  for (let k = 0; k < n; k++) await grab(page, k * B + B * 0.5, path.join(dir, `b${String(k).padStart(3, '0')}.jpg`), 0.85);
  // sheets of 24 (4x6), each thumb 480x270
  const per = 24;
  for (let s = 0; s * per < n; s++) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-start_number', String(s * per), '-i', path.join(dir, 'b%03d.jpg'), '-frames:v', '1',
      '-vf', `scale=480:270,drawtext=text='%{frame_num}':start_number=${s * per}:x=8:y=8:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.6,tile=4x6:padding=6:color=black`,
      path.join(OUT, `contact_${s}.jpg`)]);
  }
  console.log('contact sheets written', Math.ceil(n / per));
} else if (mode === 'frames') {
  for (const t of process.argv.slice(3).map(Number)) await grab(page, t, path.join(OUT, `still_${t.toFixed(2)}.jpg`), 0.92);
  console.log('stills written');
} else if (mode === 'full') {
  const dir = path.join(OUT, 'frames'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const N = Math.round(FILM.DURATION * FILM.FPS), WORKERS = 6;
  const pages = [page, ...await Promise.all(Array.from({ length: WORKERS - 1 }, newPage))];
  let next = 0, done = 0; const t0 = Date.now();
  await Promise.all(pages.map(async p => {
    while (true) {
      const f = next++; if (f >= N) break;
      await grab(p, f / FILM.FPS, path.join(dir, `f${String(f).padStart(5, '0')}.jpg`), 0.96);
      if (++done % 150 === 0) console.log(`${done}/${N} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }));
  console.log('frames done');
}
await browser.close();
server.close();
