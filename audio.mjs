// Synthesizes score + SFX from out/events.json (exported by render.mjs) -> out/mix_raw.wav
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'out');
const { duration, bpm, sections, events } = JSON.parse(fs.readFileSync(path.join(OUT, 'events.json'), 'utf8'));
const SR = 48000, B = 60 / bpm, LEN = Math.ceil((duration + 1.2) * SR);

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(1234);
const noise = () => rng() * 2 - 1;

const bus = () => [new Float32Array(LEN), new Float32Array(LEN)];
const music = bus(), sfx = bus(), send = bus();

function add(b, i, v, pan = 0) { if (i < 0 || i >= LEN) return; b[0][i] += v * Math.cos((pan + 1) * Math.PI / 4); b[1][i] += v * Math.sin((pan + 1) * Math.PI / 4); }

// RBJ biquad
function biquad(type, f, q) {
  const w = 2 * Math.PI * f / SR, a = Math.sin(w) / (2 * q), c = Math.cos(w);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = a; b1 = 0; b2 = -a; }
  a0 = 1 + a; a1 = -2 * c; a2 = 1 - a;
  const k = { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const fn = x => { const y = k.b0 * x + k.b1 * x1 + k.b2 * x2 - k.a1 * y1 - k.a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  fn.set = (f2, q2 = q) => { const n = biquad(type, f2, q2); Object.assign(k, n.k); };
  fn.k = k; return fn;
}

// ---------------- instruments ----------------
function pluck(t, f, { dur = 1.6, gain = 0.22, pan = 0, decay = 0.9965, bright = 0.5 } = {}) {
  const N = Math.max(2, Math.round(SR / f)), buf = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++) { const n = noise(); prev = prev * (1 - bright) + n * bright; buf[i] = prev; }
  const s0 = Math.round(t * SR), n = Math.round(dur * SR);
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const y = buf[idx], nx = (idx + 1) % N;
    buf[idx] = decay * 0.5 * (buf[idx] + buf[nx]);
    idx = nx;
    const env = Math.min(1, i / 60) * (i > n - 2400 ? (n - i) / 2400 : 1);
    add(music, s0 + i, y * gain * env, pan); add(send, s0 + i, y * gain * env * 0.5, pan);
  }
}
function bell(t, f, { gain = 0.12, dur = 1.4, pan = 0 } = {}) {
  const s0 = Math.round(t * SR), n = Math.round(dur * SR);
  for (let i = 0; i < n; i++) {
    const x = i / SR, e = Math.exp(-x * 4.2) * Math.min(1, i / 40);
    const v = (Math.sin(2 * Math.PI * f * x) + 0.35 * Math.sin(2 * Math.PI * f * 2.76 * x) * Math.exp(-x * 9) + 0.15 * Math.sin(2 * Math.PI * f * 5.4 * x) * Math.exp(-x * 16)) * e * gain;
    add(music, s0 + i, v, pan); add(send, s0 + i, v * 0.8, pan);
  }
}
function bass(t, f, { dur = B * 1.8, gain = 0.26 } = {}) {
  const s0 = Math.round(t * SR), n = Math.round(dur * SR);
  for (let i = 0; i < n; i++) {
    const x = i / SR, e = Math.min(1, i / 200) * Math.exp(-x * 2.2) * (i > n - 1500 ? (n - i) / 1500 : 1);
    const v = Math.tanh(1.6 * Math.sin(2 * Math.PI * f * x)) * e * gain;
    add(music, s0 + i, v, 0);
  }
}
function kick(t, gain = 0.5) {
  const s0 = Math.round(t * SR), n = Math.round(0.32 * SR); let ph = 0;
  for (let i = 0; i < n; i++) { const x = i / SR, f = 45 + 95 * Math.exp(-x * 30); ph += 2 * Math.PI * f / SR; add(music, s0 + i, Math.sin(ph) * Math.exp(-x * 9) * gain, 0); }
}
function clap(t, gain = 0.2) {
  const s0 = Math.round(t * SR), n = Math.round(0.18 * SR), bp = biquad('bp', 1700, 1.1);
  for (let i = 0; i < n; i++) {
    const x = i / SR, burst = (x < 0.03 ? (Math.floor(x / 0.009) % 2 ? 0.5 : 1) : 1) * Math.exp(-x * 26);
    const v = bp(noise()) * burst * gain * 3; add(music, s0 + i, v, 0.1); add(send, s0 + i, v * 0.6, 0.1);
  }
}
function shaker(t, gain = 0.05, pan = 0.3) {
  const s0 = Math.round(t * SR), n = Math.round(0.07 * SR), hp = biquad('hp', 6500, 0.7);
  for (let i = 0; i < n; i++) { const x = i / SR, e = Math.min(1, i / 120) * Math.exp(-x * 60); add(music, s0 + i, hp(noise()) * e * gain, pan); }
}

// ---------------- SFX ----------------
function sWrite(t, dur, gain = 1) {
  const s0 = Math.round(t * SR), n = Math.round(dur * SR), bp = biquad('bp', 3600, 1.4), hp = biquad('hp', 1800, 0.7);
  let segEnd = 0, segLen = 1, segStart = 0;
  for (let i = 0; i < n; i++) {
    if (i >= segEnd) { segStart = i; segLen = Math.round((0.05 + rng() * 0.08) * SR); segEnd = i + segLen; }
    const u = (i - segStart) / segLen, env = Math.sin(Math.PI * u) ** 0.7 * (0.6 + 0.4 * rng());
    const fade = Math.min(1, i / 400, (n - i) / 400);
    add(sfx, s0 + i, hp(bp(noise())) * env * fade * 0.22 * gain, -0.1);
  }
}
function sDrop(t, gain = 0.5) {
  const s0 = Math.round(t * SR), n = Math.round(0.09 * SR), lp = biquad('lp', 2400, 0.8), bp = biquad('bp', 320, 2);
  for (let i = 0; i < n; i++) { const x = i / SR, e = Math.exp(-x * 70); const z = noise(); add(sfx, s0 + i, (lp(z) * 0.6 + bp(z) * 3) * e * gain, (rng() - .5) * 0.4); }
}
function sStamp(t, gain = 0.75) {
  const s0 = Math.round(t * SR), n = Math.round(0.22 * SR), lp = biquad('lp', 1200, 0.9); let ph = 0;
  for (let i = 0; i < n; i++) {
    const x = i / SR, f = 60 + 90 * Math.exp(-x * 40); ph += 2 * Math.PI * f / SR;
    const v = Math.sin(ph) * Math.exp(-x * 18) * 0.9 + lp(noise()) * Math.exp(-x * 55) * 0.9;
    add(sfx, s0 + i, v * gain, 0); add(send, s0 + i, v * gain * 0.15, 0);
  }
}
function sWhoosh(t, dur, gain = 0.32) {
  const s0 = Math.round(t * SR), n = Math.round(dur * SR), bp = biquad('bp', 400, 0.9);
  for (let i = 0; i < n; i++) {
    const u = i / n; if (i % 64 === 0) bp.set(300 + 2400 * Math.sin(Math.PI * u) ** 1.5, 0.9);
    add(sfx, s0 + i, bp(noise()) * Math.sin(Math.PI * u) ** 1.4 * gain, -0.6 + 1.2 * u);
  }
}
function sPop(t, gain = 0.35) {
  const s0 = Math.round(t * SR), n = Math.round(0.09 * SR); let ph = 0;
  for (let i = 0; i < n; i++) { const x = i / SR, f = 420 + 700 * (x / 0.09); ph += 2 * Math.PI * f / SR; add(sfx, s0 + i, Math.sin(ph) * Math.exp(-x * 38) * gain, 0.2); }
}
function sClip(t, gain = 0.28) {
  const s0 = Math.round(t * SR), n = Math.round(0.12 * SR);
  for (let i = 0; i < n; i++) {
    const x = i / SR, v = Math.sin(2 * Math.PI * 3100 * x) * Math.exp(-x * 60) + Math.sin(2 * Math.PI * 4420 * x) * Math.exp(-x * 80) * 0.7 + (x < 0.004 ? noise() : 0);
    const x2 = x - 0.045, v2 = x2 > 0 ? (Math.sin(2 * Math.PI * 3600 * x2) * Math.exp(-x2 * 70) + (x2 < 0.003 ? noise() : 0)) * 0.7 : 0;
    add(sfx, s0 + i, (v + v2) * gain, -0.3);
  }
}
function sTick(t) { sDrop(t, 0.15); bell(t + 0.02, 1567.98, { gain: 0.06, dur: 0.8, pan: 0.3 }); }
function sHit(t) { sStamp(t, 0.45); kick(t, 0.22); }

// ---------------- arrangement ----------------
const C_ = { b: 65.41, n: [261.63, 329.63, 392.0, 523.25] }, G_ = { b: 98.0, n: [246.94, 293.66, 392.0, 493.88] };
const Am = { b: 110.0, n: [220.0, 261.63, 329.63, 440.0] }, F_ = { b: 87.31, n: [220.0, 261.63, 349.23, 440.0] };
const PROG = { full: [C_, G_, Am, F_], calm: [Am, F_, C_, G_] };
const totalBeats = Math.round(duration / B);
const energyAt = beat => { let e = 1; for (const s of sections) if (beat >= s.beat) e = s.energy; return e; };
const motif = [[0, 659.25], [0.5, 783.99], [1, 880.0], [2, 783.99], [2.5, 659.25], [3, 587.33], [4, 523.25]];
for (let bar = 0; bar * 4 < totalBeats; bar++) {
  const t0 = bar * 4 * B, last = (bar + 1) * 4 >= totalBeats, eBar = energyAt(bar * 4 + 1);
  const ch = (eBar === 2 ? PROG.full : PROG.calm)[bar % 4];
  if (last) {
    C_.n.forEach((f, i) => pluck(t0 + i * 0.02, f, { dur: 3.5, gain: 0.2, pan: -0.3 + i * 0.2, decay: 0.998 }));
    bass(t0, C_.b, { dur: 3 }); bell(t0, 1046.5, { gain: 0.1, dur: 3 }); kick(t0, 0.4);
    break;
  }
  for (const sb of (eBar === 0 ? [0] : [0, 2])) ch.n.forEach((f, i) => pluck(t0 + sb * B + i * 0.018, f, { dur: 2.6, gain: eBar === 0 ? 0.1 : 0.11, pan: -0.25 + i * 0.17 }));
  const arp = [0, 2, 1, 3, 2, 1, 3, 2];
  arp.forEach((ni, e) => {
    if (e % 4 === 0) return;
    if (eBar === 0 && e % 2) return;
    pluck(t0 + e * B / 2, ch.n[ni] * (e % 2 ? 2 : 1), { dur: 1.6, gain: 0.07, pan: e % 2 ? 0.35 : -0.35, decay: 0.996, bright: 0.7 });
  });
  bass(t0, ch.b, { gain: eBar === 0 ? 0.18 : 0.26 });
  if (eBar > 0) { bass(t0 + 2 * B, ch.b, { gain: 0.2 }); bass(t0 + 3.5 * B, ch.b * 1.5, { dur: B * 0.45, gain: 0.13 }); }
  for (let k = 0; k < 4; k++) {
    const beat = bar * 4 + k, tb = t0 + k * B, e = energyAt(beat);
    if (beat < 2) continue;
    if (e === 2 && k % 2 === 0) kick(tb, 0.4);
    if (e === 1 && k === 0) kick(tb, 0.34);
    if (e === 2 && k % 2 === 1) clap(tb, 0.15);
    if (e === 1 && k === 3) clap(tb, 0.1);
    if (e > 0) shaker(tb + B / 2, 0.045);
    shaker(tb, e === 0 ? 0.015 : 0.022, -0.3);
  }
  if (eBar === 2 && bar % 4 === 2) motif.forEach(([o, f]) => bell(t0 + o * B, f, { gain: 0.045, dur: 1.0, pan: 0.15 }));
}

// SFX sit well under the music (paper/pencil especially quiet)
for (const e of events) {
  if (e.type === 'write') sWrite(e.t, Math.max(0.12, e.dur), 0.28);
  else if (e.type === 'drop') sDrop(e.t, 0.17);
  else if (e.type === 'stamp') sStamp(e.t, 0.4);
  else if (e.type === 'hit') sHit(e.t);
  else if (e.type === 'whoosh') sWhoosh(e.t, e.dur, 0.1);
  else if (e.type === 'pop') sPop(e.t, 0.2);
  else if (e.type === 'clip') sClip(e.t, 0.16);
  else if (e.type === 'tick') sTick(e.t);
}

// ---------------- reverb (Schroeder) on send ----------------
function reverb(inp) {
  const combs = [1687, 1601, 2053, 2251].map(d => ({ d, buf: new Float32Array(d), i: 0, lp: 0 }));
  const aps = [347, 113].map(d => ({ d, buf: new Float32Array(d), i: 0 }));
  const out = new Float32Array(LEN);
  for (let n = 0; n < LEN; n++) {
    let s = 0;
    for (const c of combs) { const y = c.buf[c.i]; c.lp = y * 0.65 + c.lp * 0.35; c.buf[c.i] = inp[n] + c.lp * 0.8; c.i = (c.i + 1) % c.d; s += y; }
    s *= 0.25;
    for (const a of aps) { const y = a.buf[a.i]; const v = -0.6 * s + y; a.buf[a.i] = s + 0.6 * v; a.i = (a.i + 1) % a.d; s = v; }
    out[n] = s;
  }
  return out;
}
const wetL = reverb(send[0]), wetR = reverb(send[1]);

// ---------------- mix + WAV ----------------
const MUSIC_GAIN = 0.8, SFX_GAIN = 0.8;
const data = Buffer.alloc(LEN * 2 * 4);
for (let n = 0; n < LEN; n++) {
  for (let ch = 0; ch < 2; ch++) {
    const v = music[ch][n] * MUSIC_GAIN + sfx[ch][n] * SFX_GAIN + (ch ? wetR : wetL)[n] * 0.32;
    data.writeFloatLE(Math.tanh(v * 1.1) / 1.1, (n * 2 + ch) * 4);
  }
}
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(3, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(SR, 24);
hdr.writeUInt32LE(SR * 8, 28); hdr.writeUInt16LE(8, 32); hdr.writeUInt16LE(32, 34); hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
fs.writeFileSync(path.join(OUT, 'mix_raw.wav'), Buffer.concat([hdr, data]));
console.log('mix_raw.wav', (LEN / SR).toFixed(2), 's,', events.length, 'events');
const rms = (b, g) => { let s = 0; for (let n = 0; n < LEN; n++) s += (b[0][n] * g) ** 2; return (20 * Math.log10(Math.sqrt(s / LEN))).toFixed(1); };
console.log('music RMS dB', rms(music, MUSIC_GAIN), ' sfx RMS dB', rms(sfx, SFX_GAIN));
