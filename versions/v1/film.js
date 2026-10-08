'use strict';
// Jugendleiter*innen-Ausbildung – Erklärfilm (Entwurf 1)
// Pure function of time: window.seek(t) paints frame t. No state between frames.

const W = 1080, H = 1920, FPS = 30, BPM = 100, B = 60 / BPM;
const C = {
  paper: '#EFE7D6', card: '#FCF9F2', kraft: '#D9C29B',
  ink: '#25222A', ink2: '#6A6370', red: '#C63A2C',
};

// ---------- seeded randomness ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(...n) { let h = 2166136261; for (const x of n) { h ^= (Math.floor(x) | 0); h = Math.imul(h, 16777619); h ^= h >>> 13; } return h >>> 0; }
function rnd(...n) { return mulberry32(hash(...n))(); }
function vnoise(x, seed) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (rnd(seed, i) * (1 - u) + rnd(seed, i + 1) * u) * 2 - 1; }

// ---------- easing / time ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eout = t => 1 - Math.pow(1 - t, 3);
const eback = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const twos = t => Math.floor(t * 15 + 1e-6) / 15;       // stop-motion on twos
const boilK = t => Math.floor(t * 8 + 1e-6);            // line boil at 8 fps

let NOW = 0;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let g = ctx;

// ---------- paper texture (static, seeded) ----------
const TEX = document.createElement('canvas'); TEX.width = TEX.height = 420;
(function () {
  const t = TEX.getContext('2d'), r = mulberry32(42);
  t.fillStyle = '#fff'; t.fillRect(0, 0, 420, 420);
  for (let i = 0; i < 16000; i++) { t.fillStyle = `rgba(110,85,55,${0.03 + r() * 0.1})`; t.fillRect(r() * 420, r() * 420, 1 + r() * 1.4, 1 + r() * 1.4); }
  t.lineWidth = 1;
  for (let i = 0; i < 320; i++) {
    t.strokeStyle = `rgba(130,100,65,${0.05 + r() * 0.08})`;
    const x = r() * 420, y = r() * 420, a = r() * 6.28, l = 6 + r() * 22;
    t.beginPath(); t.moveTo(x, y); t.quadraticCurveTo(x + Math.cos(a + .5) * l * .5, y + Math.sin(a + .5) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); t.stroke();
  }
})();
const TEXP = ctx.createPattern(TEX, 'repeat');

// ---------- stroke engine ----------
function densify(pts, step = 12) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 0; k < n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
  }
  out.push(pts[pts.length - 1]); return out;
}
function wobble(pts, amp, seed) {
  let s = 0; const out = [];
  for (let i = 0; i < pts.length; i++) {
    if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    out.push([pts[i][0] + amp * vnoise(s / 80, seed), pts[i][1] + amp * vnoise(s / 80, seed + 77)]);
  }
  return out;
}
function strokePts(pts, p) {
  if (p <= 0 || pts.length < 2) return;
  const cum = [0]; let L = 0;
  for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(L); }
  const tgt = L * clamp(p);
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (cum[i] <= tgt) g.lineTo(pts[i][0], pts[i][1]);
    else { const u = (tgt - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); g.lineTo(lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)); break; }
  }
  g.stroke();
}
function sketch(pts, o = {}) {
  const { p = 1, w = 6, color = C.ink, amp = 2.6, seed = 1, double = true, boil = true, dash = null } = o;
  if (p <= 0) return;
  const k = boil ? boilK(NOW) : 0, d = densify(pts);
  g.save(); g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
  if (dash) g.setLineDash(dash);
  g.lineWidth = w; strokePts(wobble(d, amp, seed * 31 + k), p);
  if (double) { g.lineWidth = w * 0.42; g.globalAlpha = 0.5; strokePts(wobble(d, amp * 1.7, seed * 31 + k + 500), p); }
  g.restore();
}
function fillPoly(pts, color, seed = 1, amp = 2) {
  const w = wobble(densify([...pts, pts[0]], 18), amp, seed * 13 + boilK(NOW));
  g.beginPath(); w.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath();
  g.fillStyle = color; g.fill();
}
function ellPts(cx, cy, rx, ry, seed, turns = 1.1, a0 = -2.2) {
  const pts = [], n = 56;
  for (let i = 0; i <= n * turns; i++) {
    const a = a0 + i / n * Math.PI * 2, k = 1 + 0.05 * vnoise(i / 9, seed) + (i / n) * 0.035;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return pts;
}
function curvePts(p0, c, p1, n = 28) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push([(1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p1[0], (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p1[1]]); }
  return pts;
}
function rectPts(x, y, w, h, seed) {
  const j = i => (rnd(seed, i) - .5) * 7;
  return [[x - 5 + j(1), y + j(2)], [x + w + j(3), y + j(4)], [x + w + j(5), y + h + j(6)], [x + j(7), y + h + j(8)], [x + j(9), y - 3 + j(10)], [x + w * .2, y + j(11)]];
}
function arrow(p0, c, p1, o = {}) {
  const { p = 1, w = 6, color = C.ink, seed = 1, head = 34 } = o;
  sketch(curvePts(p0, c, p1), { p: clamp(p / 0.78), w, color, seed });
  const ph = clamp((p - 0.78) / 0.22);
  if (ph > 0) {
    const a = Math.atan2(p1[1] - c[1], p1[0] - c[0]);
    sketch([[p1[0] - head * Math.cos(a - .5), p1[1] - head * Math.sin(a - .5)], p1, [p1[0] - head * Math.cos(a + .5), p1[1] - head * Math.sin(a + .5)]], { p: ph, w, color, seed: seed + 9 });
  }
}

// ---------- text ----------
function font(px, fam = 'Marker', wt = '') { g.font = `${wt} ${px}px ${fam === 'Marker' ? 'Marker' : 'RubikF'}`.trim(); }
function wrap(str, maxW) {
  const words = str.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function fitFont(lines, size, maxW, fam, wt) {
  font(size, fam, wt); const mw = Math.max(...lines.map(l => g.measureText(l).width));
  if (mw > maxW) { size *= maxW / mw; font(size, fam, wt); }
  return size;
}

// ---------- registry ----------
const ELS = [], EVENTS = [], PUNCH = [];
function el(panel, draw) { ELS.push({ panel, draw }); }
function ev(t, type, extra = {}) { EVENTS.push({ t: +t.toFixed(4), type, ...extra }); }

// Panels (in beats). Camera travels 2 beats, centred on each panel start.
const PB = [0, 8, 16, 24, 34, 51, 66, 73, 90];
const END_BEAT = 100, DURATION = END_BEAT * B;
const PY = i => i * H;
const at = (i, b) => (PB[i] + b) * B;

// write-on (handwritten letters popping in)
function writeOn(panel, t0, str, x, y, o = {}) {
  const { size = 100, color = C.ink, per = 0.042, maxW = 0, align = 'left' } = o;
  el(panel, () => {
    if (NOW < t0) return;
    font(size); let tw = g.measureText(str).width, sc = 1;
    if (maxW && tw > maxW) sc = maxW / tw;
    g.save(); g.translate(x, y); g.scale(sc, sc);
    if (align === 'right') g.translate(-tw, 0);
    g.fillStyle = color; g.textBaseline = 'alphabetic';
    let cx = 0;
    for (let i = 0; i < str.length; i++) {
      const wch = g.measureText(str.slice(0, i + 1)).width - g.measureText(str.slice(0, i)).width;
      const ti = t0 + i * per;
      if (NOW >= ti && str[i] !== ' ') {
        const age = NOW - ti, s = age < 0.067 ? 1.35 : 1;
        g.save(); g.translate(cx + wch / 2, -size * 0.35);
        g.rotate((rnd(str.length * 7 + i, 3) - .5) * 0.07); g.scale(s, s);
        g.fillText(str[i], -wch / 2, size * 0.35 + (rnd(i, str.length) - .5) * 4);
        g.restore();
      }
      cx += wch;
    }
    g.restore();
  });
  ev(t0, 'write', { dur: str.length * per });
}
// slam: big word stamped in with frame-stepped overshoot
function slam(panel, t0, str, x, y, o = {}) {
  const { size = 180, color = C.red, maxW = 900, rot = -0.03 } = o;
  el(panel, () => {
    const age = NOW - t0; if (age < 0) return;
    const s = age < 1 / 30 ? 1.55 : age < 2 / 30 ? 1.18 : age < 3 / 30 ? 0.97 : 1;
    font(size); const tw = g.measureText(str).width, sc = Math.min(1, maxW / tw);
    g.save(); g.translate(x + tw * sc / 2, y - size * 0.35); g.rotate(rot); g.scale(s * sc, s * sc);
    g.fillStyle = color; g.fillText(str, -tw / 2, size * 0.35); g.restore();
  });
  ev(t0, 'hit'); PUNCH.push(t0);
}
// body lines (Rubik), each line steps in from below on twos
function lines(panel, t0, arr, x, y, o = {}) {
  const { size = 40, color = C.ink, lh = 1.3, wt = 500, step = 0.12, maxW = 920 } = o;
  el(panel, () => {
    arr.forEach((ln, i) => {
      const age = twos(NOW) - (t0 + i * step); if (age < 0) return;
      const dy = age < 1 / 15 ? 22 : age < 2 / 15 ? 7 : 0;
      fitFont([ln], size, maxW, 'R', wt);
      g.fillStyle = color; g.fillText(ln, x, y + i * size * lh + dy);
    });
  });
}

// ---------- paper pieces ----------
function paper(x, y, w, h, fill, seed, o = {}) {
  const { shadow = true, outline = true } = o;
  const j = i => (rnd(seed, i) - .5) * 5;
  const pts = [[x + j(1), y + j(2)], [x + w + j(3), y + j(4)], [x + w + j(5), y + h + j(6)], [x + j(7), y + h + j(8)]];
  g.save(); g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
  if (shadow) { g.shadowColor = 'rgba(80,55,25,0.30)'; g.shadowBlur = 16; g.shadowOffsetX = 4; g.shadowOffsetY = 10; }
  g.fillStyle = fill; g.fill(); g.shadowColor = 'transparent';
  g.clip(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.6; g.fillStyle = TEXP; g.fillRect(x - 10, y - 10, w + 20, h + 20);
  g.restore();
  if (outline) sketch([...pts, pts[0]], { w: 2.6, amp: 1.4, seed, double: false, color: 'rgba(37,34,42,0.55)' });
}
function dropT(a) {
  const age = twos(NOW) - a; if (age < 0) return null;
  const u = clamp(age / 0.34);
  return { dy: (1 - eback(u)) * -240, drot: (1 - u) * 0.22, s: 1 + (1 - u) * 0.07 };
}
// card that drops in; pos may be a function of NOW for later moves
function card(panel, a, pos, w, h, rot, seed, content, o = {}) {
  const { fill = C.card, sfx = true } = o;
  el(panel, () => {
    const d = dropT(a - 0.117); if (!d) return;
    const [cx, cy, er = 0] = typeof pos === 'function' ? pos() : pos;
    g.save(); g.translate(cx, cy + d.dy); g.rotate(rot + d.drot + er); g.scale(d.s, d.s);
    paper(-w / 2, -h / 2, w, h, fill, seed);
    if (content) content(w, h);
    g.restore();
  });
  if (sfx) ev(a, 'drop');
}
function cardLabel(lns, w, size = 38) {
  const s = fitFont(lns, size, w - 40, 'R', 500), lh = s * 1.16;
  g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  lns.forEach((l, i) => g.fillText(l, 0, (i - (lns.length - 1) / 2) * lh - 4));
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
}

// stamp (rendered offscreen so the ink speckle only eats the stamp)
const SC = document.createElement('canvas'); SC.width = 640; SC.height = 220;
const sctx = SC.getContext('2d');
function stamp(panel, t0, x, y, rot, text, o = {}) {
  const { size = 30, color = C.red } = o;
  el(panel, () => {
    const age = NOW - t0; if (age < 0) return;
    const s = age < 1 / 30 ? 2.1 : age < 2 / 30 ? 1.4 : age < 3 / 30 ? 0.94 : 1;
    const prev = g; g = sctx;
    sctx.clearRect(0, 0, 640, 220);
    font(size, 'R', 700); const tw = sctx.measureText(text).width;
    const bw = tw + 34, bh = size + 24, ox = 320 - bw / 2, oy = 110 - bh / 2;
    sketch(rectPts(ox, oy, bw, bh, hash(text.length, 5)), { w: 4.5, color, amp: 1.2, seed: 4, double: false, boil: false });
    sctx.fillStyle = color; sctx.textBaseline = 'middle'; sctx.fillText(text, 320 - tw / 2, 111);
    sctx.globalCompositeOperation = 'destination-out';
    const r = mulberry32(hash(text.length, 99));
    for (let i = 0; i < 80; i++) { sctx.beginPath(); sctx.arc(ox + r() * bw, oy + r() * bh, 0.5 + r() * 1.5, 0, 7); sctx.fill(); }
    sctx.globalCompositeOperation = 'source-over'; sctx.textBaseline = 'alphabetic';
    g = prev;
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.globalAlpha = 0.93;
    g.drawImage(SC, -320, -110); g.restore();
  });
  ev(t0, 'stamp');
}

// speech bubble that pops from its tail
function bubble(panel, t0, x, y, w, h, tip, text, o = {}) {
  const { size = 44, tailX = x + w * 0.6 } = o;
  el(panel, () => {
    const age = twos(NOW) - t0; if (age < 0) return;
    const s = age < 1 / 15 ? 0.55 : age < 2 / 15 ? 1.08 : 1;
    g.save(); g.translate(tip[0], tip[1]); g.scale(s, s); g.translate(-tip[0], -tip[1]);
    const r = 34, rr = [];
    const corner = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; rr.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
    const b1 = [tailX - 30, y + h - 2], b2 = [tailX + 30, y + h - 2];
    g.save(); g.shadowColor = 'rgba(80,55,25,0.25)'; g.shadowBlur = 12; g.shadowOffsetY = 8;
    fillPoly(rr, C.card, 7, 1.5); fillPoly([b1, b2, tip], C.card, 8, 1); g.restore();
    sketch([...rr, rr[0]], { w: 4.5, seed: 11, double: false });
    fillPoly([[b1[0] + 4, b1[1] - 6], [b2[0] - 4, b2[1] - 6], [tip[0], tip[1] - 8]], C.card, 9, 0.5);
    sketch([b1, tip, b2], { w: 4.5, seed: 12, double: false });
    font(size, 'R', 700); const ls = wrap(text, w - 60);
    g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    ls.forEach((l, i) => g.fillText(l, x + w / 2, y + h / 2 + (i - (ls.length - 1) / 2) * size * 1.18));
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.restore();
  });
  ev(t0, 'pop');
}

// stick figure (feet at x,y)
function stickFig(x, y, s, o = {}) {
  const { p = 1, wave = null, hat = true, scarf = true, clip = false, seed = 3 } = o;
  const n = 6, P = k => clamp(p * n - k);
  const hx = x, hy = y - 300 * s, hr = 44 * s;
  sketch(ellPts(hx, hy, hr, hr * 1.06, seed, 1.08), { p: P(0), w: 6, seed });
  sketch([[x, y - 254 * s], [x + 2, y - 122 * s]], { p: P(1), w: 6, seed: seed + 1 });
  sketch([[x - 50 * s, y], [x, y - 122 * s], [x + 50 * s, y]], { p: P(2), w: 6, seed: seed + 2 });
  const sh = [x, y - 228 * s];
  sketch([[x - 78 * s, y - 150 * s], sh], { p: P(3), w: 6, seed: seed + 3 });
  if (wave === null) sketch([sh, [x + 78 * s, y - 150 * s]], { p: P(4), w: 6, seed: seed + 4 });
  else {
    const a = -0.95 + 0.4 * Math.sin(wave);
    const el1 = [sh[0] + 58 * s * Math.cos(a + .35), sh[1] + 58 * s * Math.sin(a + .35)];
    const hand = [el1[0] + 52 * s * Math.cos(a - .35), el1[1] + 52 * s * Math.sin(a - .35)];
    sketch([sh, el1, hand], { p: P(4), w: 6, seed: seed + 4 });
  }
  if (P(1) > 0) {
    g.fillStyle = C.ink;
    g.beginPath(); g.arc(hx - 15 * s, hy - 6 * s, 5 * s, 0, 7); g.arc(hx + 15 * s, hy - 6 * s, 5 * s, 0, 7); g.fill();
    sketch(curvePts([hx - 17 * s, hy + 13 * s], [hx, hy + 30 * s], [hx + 17 * s, hy + 13 * s], 10), { w: 4, seed: seed + 5, double: false });
  }
  if (P(5) > 0) {
    const q = P(5);
    if (scarf) { fillPoly([[x - 34 * s, y - 252 * s], [x + 34 * s, y - 252 * s], [x + 4 * s, y - 192 * s]], C.red, seed + 6, 1.5); }
    if (hat) {
      const crown = [[hx - 42 * s, hy - 37 * s], [hx - 27 * s, hy - 94 * s], [hx, hy - 80 * s], [hx + 27 * s, hy - 94 * s], [hx + 42 * s, hy - 38 * s]];
      fillPoly(crown, C.kraft, seed + 7, 1.5);
      sketch(crown, { p: q, w: 5, seed: seed + 8 });
      sketch([[hx - 74 * s, hy - 33 * s], [hx + 74 * s, hy - 39 * s]], { p: q, w: 7, seed: seed + 9 });
    }
    if (clip) {
      g.save(); g.translate(x - 108 * s, y - 196 * s); g.rotate(-0.12);
      paper(0, 0, 62 * s, 84 * s, C.kraft, 21, { shadow: false });
      sketch([[12 * s, 24 * s], [50 * s, 24 * s]], { w: 3, seed: 22, double: false });
      sketch([[12 * s, 42 * s], [50 * s, 42 * s]], { w: 3, seed: 23, double: false });
      sketch([[12 * s, 60 * s], [40 * s, 60 * s]], { w: 3, seed: 24, double: false });
      g.restore();
    }
  }
}
function fig(panel, t0, x, y, s, o = {}) {
  const { dur = 0.7, waveFrom = null, jumpFrom = null } = o;
  el(panel, () => {
    if (NOW < t0) return;
    const p = clamp((NOW - t0) / dur);
    const wave = waveFrom !== null && NOW > waveFrom ? (twos(NOW) - waveFrom) * 9 : (waveFrom !== null ? 0 : null);
    let jy = 0;
    if (jumpFrom !== null && NOW > jumpFrom) jy = Math.abs(Math.sin((twos(NOW) - jumpFrom) * Math.PI / (B * 2))) * 70;
    stickFig(x, y - jy, s, { ...o, p, wave });
  });
  ev(t0, 'write', { dur });
}

function numeral(panel, t0, n, cx, cy) {
  el(panel, () => {
    if (NOW < t0) return;
    sketch(ellPts(cx, cy, 92, 88, n * 3), { p: clamp((NOW - t0) / 0.35), w: 8, color: C.red, seed: n });
  });
  slam(panel, t0 + B / 2, String(n), cx - 38, cy + 52, { size: 150, color: C.ink, rot: 0.04 });
}

function paperclip(x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s); g.lineCap = 'round';
  const path = () => {
    g.beginPath(); g.moveTo(0, 20); g.lineTo(0, 130); g.arc(20, 130, 20, Math.PI, 0, true);
    g.lineTo(40, 10); g.arc(25, 10, 15, 0, Math.PI, true); g.lineTo(10, 110); g.arc(20, 110, 10, Math.PI, 0, true); g.lineTo(30, 40);
  };
  g.strokeStyle = '#7E7984'; g.lineWidth = 7; path(); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.translate(-1.5, -1.5); path(); g.stroke();
  g.restore();
}

// ===================================================================
// SCENES
// ===================================================================

// ---- P0 Hook ----
(() => {
  const Y = PY(0);
  writeOn(0, 0.05, 'Du willst', 90, Y + 470, { size: 130 });
  writeOn(0, 0.42, 'Jugend-', 90, Y + 690, { size: 190, per: 0.04 });
  slam(0, at(0, 2), 'leiter*in', 90, Y + 890, { size: 190 });
  el(0, () => {
    const p = clamp((NOW - at(0, 2.4)) / 0.4);
    sketch([[100, Y + 935], [420, Y + 925], [760, Y + 940], [940, Y + 928]], { p, w: 11, color: C.red, seed: 5 });
    sketch([[160, Y + 968], [520, Y + 958], [860, Y + 966]], { p: clamp((NOW - at(0, 2.9)) / 0.3), w: 7, color: C.red, seed: 6 });
  });
  ev(at(0, 2.4), 'write', { dur: 0.7 });
  writeOn(0, at(0, 3), 'werden?', 90, Y + 1100, { size: 130 });
  fig(0, at(0, 3.6), 820, Y + 1700, 1.0, { dur: 0.8, waveFrom: at(0, 4.8) });
  bubble(0, at(0, 5), 110, Y + 1300, 520, 140, [690, Y + 1395], 'Hier ist dein Weg!', { size: 46, tailX: 560 });
  el(0, () => arrow([300, Y + 1450], [250, Y + 1640], [330, Y + 1790], { p: clamp((NOW - at(0, 6)) / 0.45), w: 7, color: C.red, seed: 14 }));
  ev(at(0, 6), 'write', { dur: 0.45 });
})();

// ---- P1 Überblick: 3 Phasen ----
(() => {
  const Y = PY(1);
  writeOn(1, at(1, 0.2), 'Dein Weg:', 90, Y + 300, { size: 120 });
  slam(1, at(1, 1), '3 Phasen', 90, Y + 480, { size: 170 });
  const st = [[200, Y + 700], [200, Y + 950], [200, Y + 1200], [200, Y + 1450]];
  const labels = [['Einstieg', 310, Y + 732, 'left'], ['Erfahrung', 310, Y + 982, 'left'], ['Vertiefung', 310, Y + 1232, 'left'], ['Zertifikat!', 310, Y + 1482, 'left']];
  // trail between stations
  for (let k = 0; k < 3; k++) {
    const a = at(1, 2.1 + k);
    const c = [k % 2 ? 140 : 260, (st[k][1] + st[k + 1][1]) / 2];
    el(1, () => sketch(curvePts([200, st[k][1] + 62], c, [200, st[k + 1][1] - 62]), { p: clamp((NOW - a) / 0.55), w: 6, seed: 40 + k, dash: [20, 16], double: false }));
    ev(a, 'write', { dur: 0.55 });
  }
  for (let k = 0; k < 4; k++) {
    const a = at(1, 2 + k);
    el(1, () => {
      const age = twos(NOW) - a; if (age < 0) return;
      const s = age < 1 / 15 ? 0.5 : age < 2 / 15 ? 1.15 : 1;
      const [x, y] = st[k];
      g.save(); g.translate(x, y); g.scale(s, s);
      if (k < 3) {
        fillPoly(ellPts(0, 0, 62, 62, k, 1, 0), C.card, k + 30, 1.5);
        sketch(ellPts(0, 0, 62, 62, k + 5), { w: 7, color: C.red, seed: k + 50 });
        font(84); g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(String(k + 1), 0, 30); g.textAlign = 'left';
      } else {
        const sp = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 34 : 80, an = -Math.PI / 2 + i * Math.PI / 5; sp.push([Math.cos(an) * r, Math.sin(an) * r]); }
        fillPoly(sp, C.red, 61, 1.5); sketch([...sp, sp[0]], { w: 5, seed: 62, double: false });
      }
      g.restore();
    });
    ev(a, 'pop');
    const [txt, lx, ly, al] = labels[k];
    writeOn(1, a + 0.12, txt, lx, ly, { size: 96, color: k === 3 ? C.red : C.ink, align: al, per: 0.035 });
  }
  lines(1, at(1, 6.3), ['Jede Phase besteht aus', 'mehreren Modulen.'], 90, Y + 1640, { size: 48, color: C.ink2 });
})();

// ---- P2 GAB ----
(() => {
  const Y = PY(2);
  writeOn(2, at(2, 0.2), 'Immer an deiner Seite:', 90, Y + 300, { size: 84, maxW: 900 });
  slam(2, at(2, 1), 'dein*e GAB', 90, Y + 480, { size: 160 });
  lines(2, at(2, 1.6), ['= Gruppenausbildungsbegleiter*in'], 96, Y + 565, { size: 42, color: C.ink2 });
  fig(2, at(2, 0.6), 290, Y + 1640, 0.92, { dur: 0.6, seed: 71 });
  fig(2, at(2, 1.0), 800, Y + 1640, 1.0, { dur: 0.6, hat: false, scarf: true, clip: true, seed: 81 });
  writeOn(2, at(2, 1.4), 'du', 250, Y + 1760, { size: 64 });
  writeOn(2, at(2, 1.6), 'GAB', 735, Y + 1760, { size: 64, color: C.red });
  bubble(2, at(2, 2), 470, Y + 830, 540, 200, [770, Y + 1250], 'Was kannst du schon?', { size: 50, tailX: 760 });
  bubble(2, at(2, 3.5), 60, Y + 1040, 520, 200, [300, Y + 1262], 'Was will ich lernen?', { size: 50, tailX: 290 });
  card(2, at(2, 5.0), [540, Y + 700], 920, 150, 0.012, 205, (w, h) => {
    font(40, 'R', 700); g.fillStyle = C.ink; g.fillText('Ausbildungsgespräche:', -w / 2 + 36, -h / 2 + 62);
    font(40, 'R', 500); g.fillStyle = C.red; g.fillText('Einstieg · Fortschritt · Abschluss', -w / 2 + 36, -h / 2 + 116);
  }, { fill: C.kraft });
})();

// ---- P3 Einstiegsphase ----
(() => {
  const Y = PY(3);
  numeral(3, at(3, 0), 1, 180, Y + 330);
  writeOn(3, at(3, 0.5), 'Einstiegs-', 310, Y + 310, { size: 110, maxW: 690 });
  writeOn(3, at(3, 0.9), 'phase', 310, Y + 430, { size: 110 });
  card(3, at(3, 2), [540, Y + 790], 920, 350, -0.02, 301, (w, h) => {
    font(76); g.fillStyle = C.ink; g.fillText('Einstiegsgespräch', -w / 2 + 44, -h / 2 + 110);
    font(46, 'R', 400); g.fillStyle = C.ink;
    g.fillText('Mit deiner*deinem GAB:', -w / 2 + 46, -h / 2 + 192);
    g.fillText('Was kannst du schon?', -w / 2 + 46, -h / 2 + 252);
    g.fillText('Womit startest du?', -w / 2 + 46, -h / 2 + 312);
  });
  card(3, at(3, 4), [540, Y + 1250], 920, 380, 0.025, 302, (w, h) => {
    font(76); g.fillStyle = C.ink; g.fillText('Startveranstaltung', -w / 2 + 44, -h / 2 + 110);
    font(46, 'R', 400);
    g.fillText('Auftrag & Werte der PPÖ,', -w / 2 + 46, -h / 2 + 192);
    g.fillText('Pfadfinder*innen-Methode', -w / 2 + 46, -h / 2 + 252);
    font(46, 'R', 700); g.fillText('ab 17 Jahren', -w / 2 + 46, -h / 2 + 324);
  });
  stamp(3, at(3, 5), 800, Y + 1420, -0.14, 'SEMINAR', { size: 44 });
  writeOn(3, at(3, 6.5), '+ neue Leute kennenlernen!', 90, Y + 1600, { size: 72, color: C.red, maxW: 900, per: 0.03 });
})();

// ---- P4 Erfahrungsphase ----
const MOD2 = [
  ['Erste Hilfe', 'S'], ['Partizipation 1', 'S'], ['Führungs-\nverhalten'], ['Sicherheits-\nhalber', 'S'],
  ['Freiwilliges\nEngagement'], ['Methoden der\nAltersstufen', 'SS'], ['Lebensraum\nNatur'], ['Gesetzlicher\nRahmen', 'S'],
  ['Arbeiten mit\nGruppen'], ['Geschlechter-\nbezogenes\nArbeiten'], ['Ziel-\norientierte\nPlanung', 'S'], ['Kommunikation', 'S'], ['Pädagogisches\nKonzept 1', 'S'],
];
(() => {
  const Y = PY(4);
  numeral(4, at(4, 0), 2, 180, Y + 330);
  writeOn(4, at(4, 0.5), 'Erfahrungs-', 310, Y + 310, { size: 110, maxW: 690 });
  writeOn(4, at(4, 0.9), 'phase', 310, Y + 430, { size: 110 });
  const cols = [222, 540, 858], row0 = Y + 570, rowH = 200;
  const slot = k => k === 12 ? [540, row0 + 4 * rowH] : [cols[k % 3], row0 + Math.floor(k / 3) * rowH];
  const swapA = 2, swapB = 6, tSwap = at(4, 13), dSwap = 0.6;
  const posOf = k => () => {
    let [x, y] = slot(k);
    if (k === swapA || k === swapB) {
      const other = slot(k === swapA ? swapB : swapA);
      const u = eio(clamp((twos(NOW) - tSwap) / dSwap));
      const lift = Math.sin(u * Math.PI) * (k === swapA ? -120 : 120);
      return [lerp(x, other[0], u) + lift * 0.3, lerp(y, other[1], u) + lift, Math.sin(u * Math.PI) * 0.25];
    }
    return [x, y];
  };
  MOD2.forEach(([label], k) => {
    card(4, at(4, 1.5 + k * 0.5), posOf(k), 300, 182, (rnd(k, 17) - .5) * 0.08, 400 + k, (w) => cardLabel(label.split('\n'), w, 42));
  });
  ev(tSwap, 'whoosh', { dur: dSwap });
  let j = 0;
  MOD2.forEach(([, s], k) => {
    if (!s) return;
    const [x, y] = slot(k);
    stamp(4, at(4, 8 + j * 0.5), x + 40, y + 86, -0.08 + (rnd(k, 3) - .5) * 0.08, s === 'SS' ? 'SEMINAR·STUFE' : 'SEMINAR', { size: s === 'SS' ? 26 : 30 });
    j++;
  });
  el(4, () => {
    const age = twos(NOW) - at(4, 12); if (age < 0) return;
    const dy = age < 1 / 15 ? 22 : age < 2 / 15 ? 7 : 0;
    font(44, 'R', 700); g.fillStyle = C.red; g.fillText('SEMINAR', 90, Y + 1520 + dy);
    const w = g.measureText('SEMINAR ').width;
    font(44, 'R', 500); g.fillStyle = C.ink; g.fillText('= Seminar besuchen', 90 + w, Y + 1520 + dy);
    g.fillStyle = C.ink2; g.fillText('ohne Stempel = in deiner Gruppe', 90, Y + 1578 + dy);
  });
  writeOn(4, tSwap, 'Reihenfolge? Du entscheidest!', 90, Y + 1690, { size: 70, color: C.red, maxW: 900, per: 0.03 });
})();

// ---- P5 Vertiefungsphase ----
const MOD3 = [['Partizipation 2'], ['Elternarbeit'], ['Gruppen-\nentwicklung', 'S'], ['Gefahren &\nRisiken'], ['Pädagogisches\nKonzept 2', 'SS'], ['Spiritualität', 'S']];
(() => {
  const Y = PY(5);
  numeral(5, at(5, 0), 3, 180, Y + 330);
  writeOn(5, at(5, 0.5), 'Vertiefungs-', 310, Y + 310, { size: 110, maxW: 690 });
  writeOn(5, at(5, 0.9), 'phase', 310, Y + 430, { size: 110 });
  const cols = [222, 540, 858];
  const slot = k => [cols[k % 3], Y + 580 + Math.floor(k / 3) * 215];
  MOD3.forEach(([label], k) => card(5, at(5, 1.5 + k * 0.5), slot(k), 300, 190, (rnd(k, 27) - .5) * 0.08, 500 + k, w => cardLabel(label.split('\n'), w, 42)));
  let j = 0;
  MOD3.forEach(([, s], k) => {
    if (!s) return; const [x, y] = slot(k);
    stamp(5, at(5, 4.5 + j * 0.5), x + 40, y + 90, -0.08 + (rnd(k, 5) - .5) * 0.08, s === 'SS' ? 'SEMINAR·STUFE' : 'SEMINAR', { size: s === 'SS' ? 26 : 30 }); j++;
  });
  card(5, at(5, 6.5), [540, Y + 1080], 920, 290, -0.015, 520, (w, h) => {
    font(72); g.fillStyle = C.ink; g.fillText('Praxisaufgabe', -w / 2 + 44, -h / 2 + 96);
    font(44, 'R', 400);
    g.fillText('Programm planen, durchführen,', -w / 2 + 46, -h / 2 + 170);
    g.fillText('reflektieren & anderen JL vorstellen', -w / 2 + 46, -h / 2 + 230);
  });
  // Abschlussgespräch – red paper arrow band
  el(5, () => {
    const age = twos(NOW) - at(5, 9); if (age < 0) return;
    const u = eout(clamp(age / 0.3));
    g.save(); g.translate(lerp(-1000, 0, u), 0);
    const pts = [[80, Y + 1300], [900, Y + 1300], [1000, Y + 1375], [900, Y + 1450], [80, Y + 1450]];
    g.save(); g.shadowColor = 'rgba(80,55,25,0.3)'; g.shadowBlur = 14; g.shadowOffsetY = 9; fillPoly(pts, C.red, 91, 1.5); g.restore();
    font(74); g.fillStyle = C.card; g.fillText('Abschlussgespräch', 120, Y + 1402);
    g.restore();
  });
  ev(at(5, 9), 'whoosh', { dur: 0.3 });
  lines(5, at(5, 10.2), ['mit deiner*deinem GAB:', 'Rückblick & Feedback'], 90, Y + 1550, { size: 48, color: C.ink });
  el(5, () => {
    const p = clamp((NOW - at(5, 11.5)) / 0.3);
    sketch([[640, Y + 1580], [672, Y + 1614], [740, Y + 1530]], { p, w: 11, color: C.red, seed: 95 });
  });
  ev(at(5, 11.5), 'tick');
})();

// ---- P6 Kompetenzcheck ----
(() => {
  const Y = PY(6);
  writeOn(6, at(6, 0.2), 'Kannst du', 90, Y + 330, { size: 120 });
  slam(6, at(6, 1), 'schon was?', 90, Y + 500, { size: 150 });
  const items = ['aus Schule oder Studium', 'aus Job oder Hobby', 'aus anderen Pfadi-Kursen'];
  const tk = i => at(6, 2.5 + i);
  card(6, at(6, 1.5), [540, Y + 1010], 900, 620, -0.015, 601, (w, h) => {
    g.save(); g.strokeStyle = 'rgba(37,34,42,0.12)'; g.lineWidth = 2;
    for (let yy = -h / 2 + 130; yy < h / 2 - 20; yy += 80) { g.beginPath(); g.moveTo(-w / 2 + 20, yy); g.lineTo(w / 2 - 20, yy); g.stroke(); }
    g.restore();
    font(62); g.fillStyle = C.ink; g.fillText('Das kann ich schon:', -w / 2 + 50, -h / 2 + 100);
    items.forEach((it, i) => {
      const yy = -h / 2 + 230 + i * 140;
      sketch(rectPts(-w / 2 + 56, yy - 44, 64, 64, 610 + i), { w: 5, seed: 610 + i, double: false });
      font(46, 'R', 500); g.fillStyle = C.ink; g.fillText(it, -w / 2 + 160, yy + 4);
      const p = clamp((NOW - tk(i)) / 0.22);
      sketch([[-w / 2 + 62, yy - 16], [-w / 2 + 88, yy + 18], [-w / 2 + 140, yy - 66]], { p, w: 10, color: C.red, seed: 620 + i });
    });
  });
  items.forEach((_, i) => ev(tk(i), 'tick'));
  lines(6, at(6, 5.5), ['Was du kannst, wird angerechnet.'], 90, Y + 1440, { size: 48, wt: 700 });
})();

// ---- P7 Vorarlberg: gebündelte Seminare ----
const VBG = [[9.73, 47.54], [9.68, 47.50], [9.62, 47.46], [9.66, 47.40], [9.62, 47.35], [9.60, 47.30], [9.53, 47.27], [9.57, 47.20], [9.61, 47.06], [9.70, 47.04], [9.87, 46.99], [9.98, 46.92], [10.10, 46.85], [10.16, 46.85], [10.23, 46.88], [10.17, 47.00], [10.22, 47.13], [10.13, 47.21], [10.20, 47.28], [10.10, 47.37], [10.03, 47.39], [9.97, 47.54], [9.85, 47.52], [9.80, 47.58], [9.73, 47.54]];
const BUNDLES = [
  { fmt: ['Modultag'], sub: ['Phase 2'], chips: ['Sicherheitshalber', 'Gesetzlicher Rahmen', 'Kommunikation'] },
  { fmt: ['Modul-', 'wochenende'], sub: ['Phase 2'], chips: ['Pädagogisches Konzept 1', 'Partizipation 1', 'Zielorientierte Planung'] },
  { fmt: ['Wochenende', 'je Stufe'], sub: ['Phase 2 · WiWö, GuSp'], chips: ['Methoden der Altersstufen'] },
  { fmt: ['Vertiefungs-', 'wochenende'], sub: ['Phase 3 · je Stufe'], chips: ['Pädagogisches Konzept 2', 'Gruppenentwicklung', 'Spiritualität'] },
];
(() => {
  const Y = PY(7);
  writeOn(7, at(7, 0.2), 'Seminare in', 90, Y + 300, { size: 100 });
  slam(7, at(7, 1), 'Vorarlberg', 90, Y + 470, { size: 150, maxW: 690 });
  el(7, () => {
    const p = clamp((NOW - at(7, 0.4)) / 0.9);
    const pts = VBG.map(([lo, la]) => [800 + (lo - 9.5) * 0.68 * 380, Y + 92 + (47.6 - la) * 380]);
    if (p >= 1) fillPoly(pts.slice(0, -1), 'rgba(198,58,44,0.16)', 701, 1);
    sketch(pts, { p, w: 5, seed: 702 });
  });
  ev(at(7, 0.4), 'write', { dur: 0.9 });
  lines(7, at(7, 1.8), ['So sind die Module gebündelt:'], 90, Y + 575, { size: 46, color: C.ink2 });
  BUNDLES.forEach((b, r) => {
    const t0 = at(7, 2.5 + r * 3), ry = Y + 650 + r * 272;
    b.chips.forEach((c, i) => {
      const a = t0 + i * B / 4;
      el(7, () => {
        const age = twos(NOW) - (a - 0.1); if (age < 0) return;
        const u = clamp(age / 0.3), dx = (1 - eback(u)) * -760;
        g.save(); g.translate(66 + i * 14 + dx + 265, ry + i * 62 + 38); g.rotate((i % 2 ? 0.02 : -0.016) + (1 - u) * -0.2);
        paper(-265, -38, 530, 76, C.card, 710 + r * 5 + i);
        fitFont([c], 39, 460, 'R', 500); g.fillStyle = C.ink; g.textBaseline = 'middle'; g.fillText(c, -214, 2); g.textBaseline = 'alphabetic';
        g.restore();
      });
      ev(a, 'drop');
    });
    const tc = t0 + B * 1.5;
    el(7, () => {
      const age = twos(NOW) - tc; if (age < 0) return;
      const dy = (1 - eout(clamp(age / 0.2))) * -90;
      paperclip(84, ry - 36 + dy, 0.66);
    });
    ev(tc, 'clip');
    b.fmt.forEach((f, i) => writeOn(7, t0 + 0.95 + i * 0.25, f, 636, ry + 52 + i * 62, { size: 58, color: C.red, maxW: 380, per: 0.028 }));
    lines(7, t0 + 1.45, b.sub, 638, ry + 70 + b.fmt.length * 62, { size: 36, color: C.ink2, maxW: 380, step: 0.15 });
  });
})();

// ---- P8 Ziel & Anmeldung ----
(() => {
  const Y = PY(8);
  card(8, at(8, 0.5), [540, Y + 620], 880, 560, -0.03, 801, (w, h) => {
    sketch(rectPts(-w / 2 + 30, -h / 2 + 30, w - 60, h - 60, 802), { w: 3, seed: 803, double: false, color: C.ink2 });
    font(40, 'R', 700); g.fillStyle = C.ink2; g.textAlign = 'center';
    g.fillText('Z E R T I F I K A T', 0, -h / 2 + 130);
    fitFont(['Jugendleiter*in'], 108, w - 140, 'Marker'); g.fillStyle = C.red; g.fillText('Jugendleiter*in', 0, -h / 2 + 290);
    font(72); g.fillStyle = C.ink; g.fillText('der PPÖ', 0, -h / 2 + 400);
    g.textAlign = 'left';
  });
  stamp(8, at(8, 1.5), 800, Y + 860, -0.18, 'GESCHAFFT!', { size: 40 });
  writeOn(8, at(8, 2.6), '+ Instruktorabzeichen', 110, Y + 1040, { size: 64, per: 0.03 });
  writeOn(8, at(8, 4), "Los geht's:", 90, Y + 1210, { size: 100 });
  el(8, () => {
    const age = twos(NOW) - at(8, 4.5); if (age < 0) return;
    const s = age < 1 / 15 ? 0.6 : age < 2 / 15 ? 1.06 : 1;
    g.save(); g.translate(540, Y + 1330); g.scale(s, s); g.rotate(0.012);
    paper(-460, -62, 920, 124, C.kraft, 811);
    fitFont(['ppoe.at/seminar-anmeldung'], 56, 860, 'R', 700); g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText('ppoe.at/seminar-anmeldung', 0, 20); g.textAlign = 'left';
    g.restore();
    sketch([[120, Y + 1416], [500, Y + 1408], [960, Y + 1420]], { p: clamp((NOW - at(8, 5.1)) / 0.35), w: 9, color: C.red, seed: 812 });
  });
  ev(at(8, 4.5), 'pop'); ev(at(8, 5.1), 'write', { dur: 0.35 });
  fig(8, at(8, 5.4), 850, Y + 1850, 0.8, { dur: 0.5, waveFrom: at(8, 6), jumpFrom: at(8, 6.4), seed: 91 });
  slam(8, at(8, 6.5), 'Gut Pfad!', 90, Y + 1700, { size: 110, maxW: 560 });
})();

// ---- trail connectors between panels (drawn during camera travel) ----
for (let i = 1; i < PB.length; i++) {
  const a = (PB[i] - 1) * B, d = 2 * B;
  const yA = PY(i - 1), yB = PY(i);
  const pts = i === 1
    ? curvePts([330, yA + 1800], [-230, yB + 330], [138, yB + 700], 40)
    : curvePts([1036, yA + 1650], [1010 + (i % 2 ? 30 : -30), yA + 2200], [1036, yB + 240], 40);
  el(i, () => sketch(pts, { p: clamp((NOW - a) / d), w: 6, seed: 900 + i, dash: [22, 18], double: false, color: i === 1 ? C.ink : 'rgba(37,34,42,0.55)' }));
  ev(a, 'whoosh', { dur: d });
}

// ===================================================================
// CAMERA + FRAME
// ===================================================================
function camera(t) {
  let y = 0, z = 1;
  for (let i = 1; i < PB.length; i++) {
    const a = (PB[i] - 1) * B, d = 2 * B, u = clamp((t - a) / d);
    if (t >= a) { y = lerp(PY(i - 1), PY(i), eio(u)); z = 1 - 0.07 * Math.sin(Math.PI * u); }
  }
  for (const p of PUNCH) { const a = t - p; if (a >= 0 && a < 0.5) z += 0.035 * Math.exp(-a * 9); }
  const dx = 5 * vnoise(t * 0.5, 5), dy = 5 * vnoise(t * 0.5, 9), r = 0.004 * vnoise(t * 0.35, 3);
  return { x: dx, y: y + dy, z, r };
}

function seek(t) {
  NOW = t; g = ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
  const cam = camera(t);
  ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.rotate(cam.r); ctx.translate(-W / 2 - cam.x, -H / 2 - cam.y);
  // paper grain + dot grid, locked to the world
  const y0 = cam.y - 300, y1 = cam.y + H + 300;
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = TEXP; ctx.fillRect(-200, y0, W + 400, y1 - y0); ctx.restore();
  ctx.fillStyle = 'rgba(37,34,42,0.10)';
  for (let yy = Math.floor(y0 / 60) * 60; yy < y1; yy += 60) for (let xx = -120; xx < W + 120; xx += 60) { ctx.fillRect(xx - 2, yy - 2, 4, 4); }
  for (const e of ELS) {
    const py = PY(e.panel);
    if (py > cam.y + H * 1.4 || py + H < cam.y - H * 0.4) continue;
    ctx.save(); e.draw(); ctx.restore();
  }
  // soft paper vignette (screen space)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.78);
  vg.addColorStop(0, 'rgba(90,60,25,0)'); vg.addColorStop(1, 'rgba(90,60,25,0.16)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

window.seek = seek;
window.FILM = { W, H, FPS, BPM, DURATION, beats: Array.from({ length: END_BEAT + 1 }, (_, i) => +(i * B).toFixed(4)), events: EVENTS.slice().sort((a, b) => a.t - b.t) };
window.ready = Promise.all([document.fonts.load('100px Marker'), document.fonts.load('500 40px RubikF'), document.fonts.load('700 40px RubikF'), document.fonts.load('400 40px RubikF')]).then(() => { seek(0); return true; });

// interactive preview when opened directly (?play)
if (location.search.includes('play')) {
  document.body.classList.add('preview');
  window.ready.then(() => { const st = performance.now(); const loop = () => { seek(((performance.now() - st) / 1000) % DURATION); requestAnimationFrame(loop); }; loop(); });
}
