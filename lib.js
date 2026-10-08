'use strict';
// Drawing engine for the paper/line look. Pure function of time: nothing here keeps state between frames.

const W = 1920, H = 1080, FPS = 30, BPM = 90, B = 60 / BPM;
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


// write-on (handwritten letters popping in)
function writeOn(panel, t0, str, x, y, o = {}) {
  const { size = 100, color = C.ink, per = 0.05, maxW = 0, align = 'left' } = o;
  el(panel, () => {
    if (NOW < t0) return;
    font(size); let tw = g.measureText(str).width, sc = 1;
    if (maxW && tw > maxW) sc = maxW / tw;
    g.save(); g.translate(x, y); g.scale(sc, sc);
    if (align === 'right') g.translate(-tw, 0);
    if (align === 'center') g.translate(-tw / 2, 0);
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
  const { size = 40, color = C.ink, lh = 1.3, wt = 500, step = 0.15, maxW = 1700, align = 'left' } = o;
  el(panel, () => {
    arr.forEach((ln, i) => {
      const age = twos(NOW) - (t0 + i * step); if (age < 0) return;
      const dy = age < 1 / 15 ? 22 : age < 2 / 15 ? 7 : 0;
      fitFont([ln], size, maxW, 'R', wt);
      g.fillStyle = color; g.textAlign = align; g.fillText(ln, x, y + i * size * lh + dy); g.textAlign = 'left';
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
  const u = clamp(age / 0.4);
  return { dy: (1 - eback(u)) * -220, drot: (1 - u) * 0.22, s: 1 + (1 - u) * 0.07 };
}
// card that drops in; pos may be a function of NOW for later moves
function card(panel, a, pos, w, h, rot, seed, content, o = {}) {
  const { fill = C.card, sfx = true } = o;
  el(panel, () => {
    const d = dropT(a - 0.138); if (!d) return;
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
    const blink = ((NOW * 0.31 + rnd(seed, 1)) % 1) < 0.035;
    if (blink) { g.fillRect(hx - 21 * s, hy - 7 * s, 12 * s, 3 * s); g.fillRect(hx + 9 * s, hy - 7 * s, 12 * s, 3 * s); }
    else { g.beginPath(); g.arc(hx - 15 * s, hy - 6 * s, 5 * s, 0, 7); g.arc(hx + 15 * s, hy - 6 * s, 5 * s, 0, 7); g.fill(); }
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

