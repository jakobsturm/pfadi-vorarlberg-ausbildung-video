'use strict';
// Strichfigur 2: Skelett mit Gelenken, Gesten-Bibliothek, Mimik und Requisiten. Braucht lib.js.
// Winkel in Grad, Bildschirm-Konvention: 0 = rechts, 90 = unten, 180 = links, -90 = oben.
// Gerechnet wird in lokalen Einheiten (s = 1, Ursprung am Boden zwischen den Füßen, "l"/"r" = Bildschirmseite);
// erst beim Zeichnen wird skaliert und mit dir = -1 gespiegelt.
(() => {
  // BOIL: wie oft pro Sekunde die Striche der Figur neu gezittert werden (der Rest des Films kocht mit 8)
  const RAD = Math.PI / 180, S = Math.sin, FOOT = 6, TRANS = 0.3, BOIL = 4;
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const pol = (p, a, l) => [p[0] + Math.cos(a * RAD) * l, p[1] + Math.sin(a * RAD) * l];
  const rotP = (q, a) => { const c = Math.cos(a * RAD), s = Math.sin(a * RAD); return [q[0] * c - q[1] * s, q[0] * s + q[1] * c]; };
  const angTo = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]) / RAD;
  const lerpA = (a, b, u) => a + ((((b - a) % 360) + 540) % 360 - 180) * u;
  const popS = age => age < 0 ? 0 : age < 1 / 15 ? 0.45 : age < 2 / 15 ? 1.2 : 1;
  const oval = (c, rx, ry, a, n = 16) => Array.from({ length: n }, (_, i) => add(c, rotP([Math.cos(i / n * 2 * Math.PI) * rx, Math.sin(i / n * 2 * Math.PI) * ry], a)));

  // ---------- Varianten (Proportionen + Ausstattung) ----------
  const VARIANTEN = {
    A: {
      name: 'Klassik plus', headR: 44, torso: 132, sh: 0.76, upper: 60, fore: 56, thigh: 66, shin: 64, shW: 0,
      hat: true, hair: null, brille: false, scarf: true, hands: 'voll', feet: 'schuh', hose: false, shirt: false, headFill: null,
    },
    B: {
      name: 'Wuschel', headR: 52, torso: 108, sh: 0.72, upper: 62, fore: 58, thigh: 80, shin: 78, shW: 0,
      hat: false, hair: 'tolle', brille: false, scarf: true, hands: 'mitt', feet: 'oval', hose: true, shirt: false, headFill: null,
    },
    C: {
      name: 'Kluft', headR: 46, torso: 128, sh: 0.76, upper: 60, fore: 56, thigh: 66, shin: 64, shW: 14,
      hat: true, hair: null, brille: false, scarf: true, hands: 'voll', feet: 'stiefel', hose: false, shirt: true, headFill: C.card,
    },
  };

  // ---------- Posen ----------
  // Arme: [Oberarm, Unterarm] als absolute Winkel, oder { at: Ankerpunkt, off, elbow: 'out'|'in'|'down'|'up' } (IK).
  // Beine: [Oberschenkel l, Schienbein l, Oberschenkel r, Schienbein r].
  const BASE = {
    lean: 0, tilt: 0, lift: 0, hipX: 0,
    l: [114, 102], r: [66, 78], legs: [98, 94, 82, 86], feet: null,
    lh: 'dot', rh: 'dot', lhDir: null, rhDir: null,
    eyes: 'dot', brows: 'ruhig', mouth: 'laecheln', look: [0, 0],
    idle: 1, fx: [], board: null, phone: null, pen: false,
  };

  // Jede Geste ist eine Funktion der Zeit seit Gestenbeginn (s) und liefert nur, was von BASE abweicht.
  const GESTEN = {
    stehen: () => ({}),
    winken: t => ({ r: [-12, -80 + 20 * S(t * 9)], rh: 'offen', tilt: 7, brows: 'hoch', mouth: 'grins', fx: ['wellen'] }),
    zeigen: t => ({
      r: [-8, -12 + 3 * S(t * 7)], rh: 'zeig', l: { at: 'hueftL' }, lh: 'faust',
      lean: 4, tilt: 5, look: [4, -1], mouth: 'grins',
    }),
    zeigenOben: t => ({ r: [-50, -58 + 3 * S(t * 7)], rh: 'zeig', tilt: -5, look: [3, -4], brows: 'hoch', mouth: 'laecheln' }),
    reden: t => ({
      r: [48, -24 + 16 * S(t * 5.5)], rh: 'offen', rhDir: -40, tilt: 4 * S(t * 2.3),
      brows: S(t * 3.1) > 0.5 ? 'hoch' : 'ruhig', mouth: 'reden',
    }),
    tada: t => ({
      l: [148, 172 + 4 * S(t * 4)], r: [32, 8 - 4 * S(t * 4)], lh: 'offen', rh: 'offen', lhDir: 200, rhDir: -20,
      tilt: 6, eyes: 'froh', brows: 'hoch', mouth: 'grins', fx: ['funken'],
    }),
    denken: t => ({
      r: { at: 'kinn', off: [6, 6 + 1.5 * S(t * 6)], elbow: 'out' }, rh: 'faust',
      l: { at: 'ellbogenR', off: [-2, 10], elbow: 'down' },
      tilt: -9, look: [-4, -5], brows: 'denk', mouth: 'flach', fx: ['punkte'],
    }),
    kopfkratzen: t => ({
      r: { at: 'schlaefeR', off: [4 + 4 * S(t * 16), -10 + 3 * S(t * 16 + 1.5)], elbow: 'out' },
      l: { at: 'hueftL' }, lh: 'faust', tilt: -10, look: [3, -4], brows: 'denk', mouth: 'wellig', fx: ['frage'],
    }),
    schulterzucken: t => {
      const b = 6 * Math.abs(S(t * 4));
      return {
        l: [116, 192 - b], r: [64, -12 + b], lh: 'offen', rh: 'offen', lhDir: 230, rhDir: -50,
        tilt: 10, brows: 'sorge', mouth: 'wellig', fx: ['frage2'],
      };
    },
    staunen: t => ({
      l: { at: 'wangeL', elbow: 'down' }, r: { at: 'wangeR', elbow: 'down' }, lh: 'offen', rh: 'offen', lhDir: -100, rhDir: -80,
      lift: t < 0.35 ? 18 * S(t / 0.35 * Math.PI) : 0, eyes: 'gross', brows: 'hoch', mouth: 'o', fx: ['ausruf'], idle: 0.4,
    }),
    idee: t => ({
      r: { at: 'schlaefeR', off: [26, -16], elbow: 'out' }, rh: 'zeig', rhDir: -90,
      lift: t > 0.2 && t < 0.5 ? 14 * S((t - 0.2) / 0.3 * Math.PI) : 0,
      eyes: 'gross', brows: 'hoch', mouth: t < 0.6 ? 'o' : 'grins', fx: ['birne'],
    }),
    daumenHoch: t => ({ r: [34, -62 + 5 * S(t * 7)], rh: 'daumen', l: { at: 'hueftL' }, lh: 'faust', tilt: 7, eyes: 'zwinkern', mouth: 'grins' }),
    jubeln: t => {
      const ph = (t / B) % 1, air = S(ph * Math.PI), tuck = air * 0.8 + Math.pow(1 - air, 6) * 0.3;
      return {
        l: [228 - 10 * air, 242 - 14 * air], r: [-48 + 10 * air, -62 + 14 * air], lh: 'offen', rh: 'offen',
        lift: air * 64, legs: [98 + 30 * tuck, 94 - 20 * tuck, 82 - 30 * tuck, 86 + 20 * tuck],
        eyes: 'froh', brows: 'hoch', mouth: 'grins', fx: ['funken'], idle: 0,
      };
    },
    hueften: () => ({
      l: { at: 'hueftL' }, r: { at: 'hueftR' }, lh: 'faust', rh: 'faust',
      lean: -3, tilt: 5, legs: [103, 99, 77, 81], mouth: 'grins',
    }),
    notieren: t => {
      const row = Math.floor(t / 1.1) % 3, u = (t / 1.1) % 1;
      const tip = [-12 + 22 * u, -14 + row * 13 + 2 * S(t * 26)];
      return {
        board: { at: 'brett', rot: -8 }, l: { at: 'brett', off: [-24, 30] },
        r: { at: 'brett', off: [tip[0] + 14, tip[1] - 20], elbow: 'down' }, pen: true,
        tilt: -7, look: [-3, 4], mouth: 'schief',
      };
    },
    handy: t => ({
      phone: { at: 'handy', rot: 4 }, l: { at: 'handy', off: [-14, 12] }, r: { at: 'handy', off: [12, 2 + 3 * Math.max(0, S(t * 10))] },
      tilt: 6, look: [0, 5],
    }),
    gehen: t => {
      const ph = t / B * Math.PI, sw = S(ph), cw = Math.cos(ph);
      return {
        legs: [90 - 28 * sw, 90 - 28 * sw + 40 * Math.max(0, cw), 90 + 28 * sw, 90 + 28 * sw + 40 * Math.max(0, -cw)],
        feet: [16 * Math.max(0, cw), 16 * Math.max(0, -cw)],
        l: [90 + 24 * sw, 78 + 24 * sw], r: [90 - 24 * sw, 66 - 24 * sw],
        lean: 5, look: [3, 0], idle: 0.3,
      };
    },
    pfadigruss: () => ({ r: { at: 'gruss' }, rh: 'gruss', rhDir: -115, l: [96, 92], legs: [94, 92, 86, 88], idle: 0.3 }),
  };

  // ---------- Skelett ----------
  function bodyOf(P, V) {
    const legs = hip => {
      const kl = pol(hip, P.legs[0], V.thigh), kr = pol(hip, P.legs[2], V.thigh);
      return { kl, al: pol(kl, P.legs[1], V.shin), kr, ar: pol(kr, P.legs[3], V.shin) };
    };
    const L0 = legs([0, 0]);
    // the lower foot stands on the ground, lift raises the whole figure
    const hip = [P.hipX, -Math.max(L0.al[1], L0.ar[1]) - FOOT - P.lift];
    const up = -90 + P.lean;
    const T = (d, x = 0) => pol(pol(hip, up, d), up + 90, x);
    const neck = T(V.torso), shY = V.torso * V.sh;
    return {
      hip, ...legs(hip), up, T, neck, sh: T(shY), shL: T(shY, -V.shW), shR: T(shY, V.shW),
      hc: pol(neck, up + P.tilt, V.headR + 3), tilt: P.lean + P.tilt,
    };
  }

  function anchor(a, Bd, V, ex = {}) {
    if (Array.isArray(a)) return a;
    const r = V.headR, Hd = q => add(Bd.hc, rotP(q, Bd.tilt)), T = Bd.T, tt = V.torso;
    switch (a) {
      case 'kinn': return Hd([r * 0.2, r * 1.02]);
      case 'schlaefeL': return Hd([-r * 0.95, -r * 0.35]);
      case 'schlaefeR': return Hd([r * 0.95, -r * 0.35]);
      case 'wangeL': return Hd([-r * 1.1, r * 0.3]);
      case 'wangeR': return Hd([r * 1.1, r * 0.3]);
      case 'gruss': return Hd([r * 1.32, -r * 0.5]);
      case 'hueftL': return T(6, -20 - V.shW * 0.5);
      case 'hueftR': return T(6, 20 + V.shW * 0.5);
      case 'brett': return T(tt * 0.5, -16);
      case 'handy': return T(tt * 0.52, 2);
      case 'ellbogenR': return ex.eR || T(tt * 0.6, 40);
    }
    return T(tt * 0.5);
  }

  // two-bone IK; of the two elbow solutions take the one that best matches pref
  function ik(s, t, a, b, pref, side) {
    const d = clamp(Math.hypot(t[0] - s[0], t[1] - s[1]), Math.abs(a - b) + 1, a + b - 0.5);
    const base = angTo(s, t), A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)) / RAD;
    const sol = [base - A, base + A].map(ua => { const e = pol(s, ua, a); return { ua, e, fa: angTo(e, t) }; });
    const score = { out: q => side * q.e[0], in: q => -side * q.e[0], down: q => q.e[1], up: q => -q.e[1] }[pref];
    const q = score(sol[0]) >= score(sol[1]) ? sol[0] : sol[1];
    return [q.ua, q.fa];
  }
  function armOf(spec, side, Bd, V, ex) {
    if (Array.isArray(spec)) return spec;
    const tg = add(anchor(spec.at, Bd, V, ex), spec.off || [0, 0]);
    return ik(side < 0 ? Bd.shL : Bd.shR, tg, V.upper, V.fore, spec.elbow || 'out', side);
  }

  // lt = Zeit seit Gestenbeginn, gt = globale Zeit (für Atmen/Schwanken)
  function evalGeste(name, lt, gt, V, seed) {
    const P = { ...BASE, ...(GESTEN[name] || GESTEN.stehen)(Math.max(0, lt), V) };
    const k = P.idle;
    if (k) {
      P.tilt += k * 2 * vnoise(gt * 0.6, seed + 11);
      P.lean += k * 1.4 * S(gt * 2.1 + seed);
      const sw = k * 2.5 * S(gt * 2.1 + seed + 0.8);
      if (Array.isArray(P.l)) P.l = [P.l[0] + sw, P.l[1] + sw * 1.4];
      if (Array.isArray(P.r)) P.r = [P.r[0] - sw, P.r[1] - sw * 1.4];
    }
    P.name = name; P.age = lt;
    const Bd = bodyOf(P, V), ex = {};
    P.r = armOf(P.r, 1, Bd, V, ex);
    ex.eR = pol(Bd.shR, P.r[0], V.upper);
    P.l = armOf(P.l, -1, Bd, V, ex);
    return P;
  }

  function mixPose(a, b, u) {
    const o = { ...(u < 0.5 ? a : b) };
    for (const k of ['lean', 'tilt', 'lift', 'hipX']) o[k] = lerp(a[k], b[k], u);
    o.l = [lerpA(a.l[0], b.l[0], u), lerpA(a.l[1], b.l[1], u)];
    o.r = [lerpA(a.r[0], b.r[0], u), lerpA(a.r[1], b.r[1], u)];
    o.legs = a.legs.map((v, i) => lerpA(v, b.legs[i], u));
    o.look = [lerp(a.look[0], b.look[0], u), lerp(a.look[1], b.look[1], u)];
    return o;
  }

  // gesten: [[t, 'name'], ...] aufsteigend sortiert; zwischen zwei Gesten wird TRANS Sekunden überblendet
  function poseAt(gesten, t, V, seed = 3) {
    let i = -1;
    for (let k = 0; k < gesten.length; k++) if (t >= gesten[k][0]) i = k;
    if (i < 0) return evalGeste('stehen', t, t, V, seed);
    const [t1, n1] = gesten[i], cur = evalGeste(n1, t - t1, t, V, seed);
    const u = eio(clamp((t - t1) / TRANS));
    if (u >= 1) return cur;
    const prev = i > 0 ? evalGeste(gesten[i - 1][1], t - gesten[i - 1][0], t, V, seed) : evalGeste('stehen', t, t, V, seed);
    return mixPose(prev, cur, u);
  }

  // ---------- Zeichnen ----------
  const QM = [[...curvePts([-12, -14], [-11, -31], [3, -30], 8), ...curvePts([3, -30], [17, -27], [8, -12], 8).slice(1), [1, -5], [0, 5]]];

  function drawFigur(x, y, s, P, V, o = {}) {
    const { dir = 1, p = 1, seed = 3, boil = BOIL } = o;
    const sk = (pts, opt) => sketch(pts, { boil, ...opt }), fp = (pts, color, sd, amp) => fillPoly(pts, color, sd, amp, boil);
    const wk = o.wk || Math.min(1, 0.45 + 0.55 * s), lw = 6 * wk, t = NOW;
    const Pk = k => clamp(p * 6 - k);
    const Wp = q => [x + dir * q[0] * s, y + q[1] * s], Wl = pts => pts.map(Wp);
    const Bd = bodyOf(P, V), r = V.headR, kH = r / 44, air = clamp(P.lift / 40);
    const Hd = q => add(Bd.hc, rotP(q, Bd.tilt)), HW = q => Wp(Hd(q));
    const eL = pol(Bd.shL, P.l[0], V.upper), hL = pol(eL, P.l[1], V.fore);
    const eR = pol(Bd.shR, P.r[0], V.upper), hR = pol(eR, P.r[1], V.fore);
    const limb = (a, b, c) => V.hose ? curvePts(a, [2 * b[0] - (a[0] + c[0]) / 2, 2 * b[1] - (a[1] + c[1]) / 2], c, 14) : [a, b, c];
    const line = (pts, w, sd, color = C.ink, amp = 2) => sk(pts, { w: w * wk, seed: seed + sd, double: false, color, amp });
    const outline = 'rgba(37,34,42,0.85)';

    // ground shadow, shrinks while jumping
    if (p > 0) {
      const k = clamp(1 - P.lift / 140), rx = 88 * s * (0.55 + 0.45 * k);
      g.save(); g.translate(x + dir * P.hipX * s, y + 5 * s); g.scale(1, 0.17);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      rg.addColorStop(0, `rgba(80,55,25,${0.34 * k * clamp(p * 3)})`); rg.addColorStop(1, 'rgba(80,55,25,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill(); g.restore();
    }

    // legs + feet
    sk(Wl(limb(Bd.hip, Bd.kl, Bd.al)), { p: Pk(2), w: lw, seed: seed + 2 });
    sk(Wl(limb(Bd.hip, Bd.kr, Bd.ar)), { p: Pk(2), w: lw, seed: seed + 12 });
    if (Pk(2) >= 1) {
      const fa = P.feet || [180 - 40 * air, 40 * air];
      [[Bd.al, fa[0]], [Bd.ar, fa[1]]].forEach(([an, a], i) => {
        const big = V.feet === 'stiefel', pts = oval(pol(an, a, 7), big ? 15 : 13, big ? 8.5 : 7, a);
        if (V.feet === 'oval') { fp(Wl(pts), C.card, seed + 40 + i, 0.8); line(Wl([...pts, pts[0]]), 3.5, 42 + i); }
        else fp(Wl(pts), C.ink, seed + 40 + i, 0.8);
      });
    }

    // shorts (Kluft)
    if (V.shirt && Pk(5) > 0) {
      const mL = pol(Bd.hip, P.legs[0], V.thigh * 0.42), mR = pol(Bd.hip, P.legs[2], V.thigh * 0.42), w0 = V.shW + 10;
      const sh = [Bd.T(6, -w0), Bd.T(6, w0), pol(mR, P.legs[2] - 90, 11), pol(mR, P.legs[2] + 90, 9), pol(Bd.hip, 90, 5), pol(mL, P.legs[0] - 90, 9), pol(mL, P.legs[0] + 90, 11)];
      fp(Wl(sh), '#4A4450', seed + 52, 1); line(Wl([...sh, sh[0]]), 3, 53, outline);
    }

    // Halstuch, wie es getragen wird: gerollt um den Hals, vorne als V zum Knoten, darunter die zwei Zipfel.
    // ribbon() legt ein Band mit Breitenverlauf wf(u) um eine Mittellinie.
    const ribbon = (pts, wf) => {
      const L = [], R = [];
      pts.forEach((q, i) => {
        const a = angTo(pts[Math.max(0, i - 1)], pts[Math.min(pts.length - 1, i + 1)]), w = wf(i / (pts.length - 1));
        L.push(pol(q, a - 90, w)); R.push(pol(q, a + 90, w));
      });
      return [...L, ...R.reverse()];
    };
    // top = where the roll sits on the neck, kd = height of the knot
    const tt = V.torso, scarf = V.scarf && Pk(5) > 0, top = tt - tt * (1 - V.sh) * 0.6, kd = tt * 0.5, knot = Bd.T(kd);
    // the part running behind the neck, so it goes under the neck line
    if (scarf) fp(Wl(ribbon(curvePts(Bd.T(top - 3, -22), Bd.T(top + 9, 0), Bd.T(top - 3, 22), 10), () => 5)), '#9C2E22', seed + 5, 0.8);

    // torso
    sk(Wl([Bd.hip, Bd.neck]), { p: Pk(1), w: lw, seed: seed + 1 });
    if (V.shirt && Pk(5) > 0) {
      const ys = V.torso * V.sh + 9, w0 = V.shW + 8;
      const sh = [Bd.T(ys, -w0), Bd.T(ys + 3, 0), Bd.T(ys, w0), Bd.T(-4, w0 + 4), Bd.T(-4, -w0 - 4)];
      fp(Wl(sh), C.kraft, seed + 50, 1.2); line(Wl([...sh, sh[0]]), 3, 51, outline);
      line(Wl([Bd.T(ys - 44), Bd.T(2)]), 2.4, 54, 'rgba(37,34,42,.45)');
      // sleeves go under the Halstuch; the arm lines then start where the sleeves end
      [[Bd.shL, P.l[0]], [Bd.shR, P.r[0]]].forEach(([sh, ua], i) => {
        const m = pol(sh, ua, V.upper * 0.45), b = pol(sh, ua + 180, 3);
        const pts = [pol(b, ua - 90, 10), pol(b, ua + 90, 10), pol(m, ua + 90, 8.5), pol(m, ua - 90, 8.5)];
        fp(Wl(pts), C.kraft, seed + 55 + i, 0.8); line(Wl([...pts, pts[0]]), 3, 56 + i, outline);
      });
    }

    if (scarf) {
      const T = Bd.T, sw = 6 * S(t * 3.3 + seed) - P.lean * 0.8 - 16 * air;
      // two pointed tips hanging below the knot, swinging a little behind the body
      [[6, 46, '#B0352A'], [-5, 40, C.red]].forEach(([da, len, col], i) => {
        const a = Bd.up + 180 + sw + da, k0 = pol(knot, Bd.up + 180, 3);
        const pts = Array.from({ length: 7 }, (_, j) => pol(k0, a + j * sw * 0.15, len * j / 6));
        fp(Wl(ribbon(pts, u => u < 0.6 ? lerp(5.5, 9.5, u / 0.6) : lerp(9.5, 0.8, (u - 0.6) / 0.4))), col, seed + 6 + i, 0.8);
      });
      // the V from both sides of the neck down to the knot
      for (const sx of [-1, 1]) {
        const pts = curvePts(T(top, sx * 22), T(lerp(top, kd, 0.45), sx * 19), T(kd + 3, sx * 5.5), 10);
        fp(Wl(ribbon(pts, u => lerp(7, 5.5, u))), C.red, seed + 8 + sx, 0.8);
        line(Wl(curvePts(T(top - 4, sx * 21), T(lerp(top, kd, 0.45), sx * 18), T(kd + 4, sx * 5), 8)), 2, 12 + sx, 'rgba(90,20,15,.45)', 1);
      }
      // Halstuchknoten: wooden ring, seen from the front as a short wide band
      const wo = ribbon([pol(knot, Bd.up + 90, -14), pol(knot, Bd.up + 90, 14)], () => 8);
      fp(Wl(wo), C.kraft, seed + 14, 0.6); line(Wl([...wo, wo[0]]), 3, 15);
      for (const dx of [-7, 0, 7]) line(Wl([T(kd + 5, dx), T(kd - 5, dx - 1)]), 1.6, 16 + dx, 'rgba(37,34,42,.4)', 0.6);
    }

    // head
    if (V.headFill && Pk(0) >= 1) fp(Wl(ellPts(Bd.hc[0], Bd.hc[1], r, r * 1.06, seed, 1, 0)), V.headFill, seed + 60, 0.6);
    sk(Wl(ellPts(Bd.hc[0], Bd.hc[1], r, r * 1.06, seed, 1.08)), { p: Pk(0), w: lw, seed, amp: 1.5 });

    if (Pk(5) > 0 && V.hair === 'tolle') {
      const wig = 3 * S(t * 4 + seed) + 10 * air;
      [[[-4, -r + 2], [-4, -r - 18], [10 + wig, -r - 26]], [[5, -r + 3], [12, -r - 14], [26 + wig, -r - 15]], [[-12, -r + 5], [-20, -r - 12], [-8 + wig, -r - 22]]]
        .forEach(([a, b, c], i) => line(curvePts(a, b, c, 8).map(HW), 5, 20 + i));
    }
    if (Pk(5) > 0 && V.hair === 'zopf') {
      const cap = [];
      for (let i = 0; i <= 16; i++) { const a = (200 + i / 16 * 140) * RAD; cap.push([Math.cos(a) * r * 1.03, Math.sin(a) * r * 1.07]); }
      cap.push(...curvePts(cap[cap.length - 1], [r * 0.1, -r * 1.05], cap[0], 10));
      fp(cap.map(HW), C.ink, seed + 25, 1);
      const sw = 5 * S(t * 3 + seed) + 14 * air;
      line(curvePts([r * 0.78, -r * 0.62], [r * 1.6, -r * 0.75 + sw * 0.3], [r * 1.35 + sw, r * 0.45], 10).map(HW), 12, 26);
      fp(oval([r * 0.86, -r * 0.66], 5, 6, 30).map(HW), C.red, seed + 27, 0.5);
    }

    // face
    if (Pk(1) > 0) {
      const k = kH, lk = P.look;
      const blink = ((t * 0.31 + rnd(seed, 1)) % 1) < 0.035;
      const dot = (q, rr) => { const c = HW(q); g.fillStyle = C.ink; g.beginPath(); g.arc(c[0], c[1], rr * s, 0, 7); g.fill(); };
      const fl = (pts, w, sd) => line(pts.map(HW), w, sd, C.ink, 1.4);
      for (const sx of [-1, 1]) {
        const ex = sx * 15 * k, ey = -6 * k;
        let e = P.eyes === 'zwinkern' ? (sx > 0 ? 'froh' : 'dot') : P.eyes;
        if (blink && (e === 'dot' || e === 'gross')) e = 'zu';
        if (e === 'dot') dot([ex + lk[0] * k, ey + lk[1] * k], 5 * k);
        else if (e === 'zu') fl([[ex - 6 * k, ey + 1], [ex + 6 * k, ey + 1]], 3.5, 70 + sx);
        else if (e === 'froh') fl(curvePts([ex - 7 * k, ey + 3 * k], [ex, ey - 9 * k], [ex + 7 * k, ey + 3 * k], 8), 4, 72 + sx);
        else if (e === 'gross') { fl(ellPts(ex, ey, 9 * k, 10 * k, seed + sx, 1.05), 3, 74 + sx); dot([ex + lk[0] * 0.7 * k, ey + lk[1] * 0.7 * k], 4.2 * k); }

        // brows: A = outer end, M = middle, Z = inner end
        const bx = ex + lk[0] * 0.4 * k, by = -23 * k, out = (dx, dy) => [bx + sx * dx * k, by + dy * k];
        let A, M, Z;
        const br = P.brows === 'denk' ? (sx < 0 ? 'hoch' : 'schraeg') : P.brows;
        if (br === 'ruhig') { A = out(7, 1.5); M = out(0, -3); Z = out(-7, 1.5); }
        else if (br === 'hoch') { A = out(8, -4); M = out(0, -12); Z = out(-8, -4); }
        else if (br === 'schraeg') { A = out(7, -1); Z = out(-7, 4); M = [(A[0] + Z[0]) / 2, (A[1] + Z[1]) / 2]; }
        else if (br === 'sorge') { A = out(7, 2); Z = out(-7, -5); M = [(A[0] + Z[0]) / 2, (A[1] + Z[1]) / 2 - 1]; }
        if (A) fl(curvePts(A, M, Z, 6), 3.6, 76 + sx);
      }
      let m = P.mouth;
      if (m === 'reden') m = ['klein', 'grins', 'o', 'laecheln', 'klein'][Math.floor(rnd(seed, Math.floor(t * 7.5)) * 5)];
      if (m === 'laecheln') fl(curvePts([-17 * k, 13 * k], [0, 30 * k], [17 * k, 13 * k], 10), 4, 80);
      else if (m === 'grins') {
        fp(curvePts([-19 * k, 11 * k], [0, 46 * k], [19 * k, 11 * k], 14).map(HW), C.ink, seed + 81, 0.6);
        fp(ellPts(0, 24 * k, 7 * k, 4 * k, seed, 1, 0).map(HW), C.red, seed + 82, 0.3);
      }
      else if (m === 'o') fp(ellPts(0, 20 * k, 6.5 * k, 8.5 * k, seed, 1, 0).map(HW), C.ink, seed + 83, 0.4);
      else if (m === 'klein') fp(ellPts(0, 18 * k, 9 * k, 5.5 * k, seed, 1, 0).map(HW), C.ink, seed + 84, 0.4);
      else if (m === 'flach') fl([[-10 * k, 19 * k], [10 * k, 17 * k]], 4, 85);
      else if (m === 'wellig') fl([[-13 * k, 19 * k], [-6.5 * k, 15 * k], [0, 19 * k], [6.5 * k, 15 * k], [13 * k, 19 * k]], 3.6, 86);
      else if (m === 'schief') fl(curvePts([-9 * k, 18 * k], [5 * k, 25 * k], [17 * k, 11 * k], 8), 4, 87);
      if (V.brille) {
        for (const sx of [-1, 1]) fl(ellPts(sx * 15 * k, -6 * k, 11 * k, 10 * k, seed + 3 + sx, 1.04), 3.2, 88 + sx);
        fl([[-4 * k, -8 * k], [4 * k, -8 * k]], 3.2, 90);
      }
    }

    // Pfadihut
    if (V.hat && Pk(5) > 0) {
      const K = pts => pts.map(([a, b]) => HW([a * kH, b * kH]));
      const crown = K([[-42, -37], [-27, -94], [0, -80], [27, -94], [42, -38]]);
      fp(crown, C.kraft, seed + 7, 1.5);
      sk(crown, { p: Pk(5), w: 5 * wk, seed: seed + 8 });
      sk(K([[-74, -33], [74, -39]]), { p: Pk(5), w: 7 * wk, seed: seed + 9 });
    }

    // props held in front of the body (hands are drawn on top)
    const prop = (spec, draw) => {
      const sc = popS(P.age - 0.15); if (!spec || Pk(5) <= 0 || sc <= 0) return;
      const c = Wp(anchor(spec.at, Bd, V));
      g.save(); g.translate(c[0], c[1]); g.scale(dir * s * sc, s * sc); g.rotate((spec.rot || 0) * RAD); draw(); g.restore();
    };
    prop(P.board, () => {
      paper(-28, -38, 56, 76, C.kraft, 21, { shadow: false });
      paper(-23, -30, 46, 63, C.card, 23, { shadow: false, outline: false });
      fp([[-13, -43], [13, -43], [13, -33], [-13, -33]], C.ink2, 25, 0.4);
      for (let i = 0; i < 3; i++) sk([[-17, -16 + i * 14], [i === 2 ? 5 : 17, -16 + i * 14]], { w: 2.4, seed: 26 + i, double: false, color: C.ink2, amp: 1 });
    });
    prop(P.phone, () => {
      fp([[-15, -25], [15, -25], [15, 25], [-15, 25]], C.ink, 31, 0.6);
      fp([[-11, -19], [11, -19], [11, 17], [-11, 17]], '#F4EEDF', 32, 0.4);
      fp([[-7, -13], [7, -13], [7, -6], [-7, -6]], C.red, 33, 0.3);
      sk([[-7, 1], [7, 1]], { w: 2, seed: 34, double: false, color: C.ink2, amp: 0.6 });
      sk([[-7, 8], [3, 8]], { w: 2, seed: 35, double: false, color: C.ink2, amp: 0.6 });
    });

    // arms + hands
    const armFrom = (sh, ua) => V.shirt ? pol(sh, ua, V.upper * 0.4) : sh;
    const hand = (h, kind, a, sd) => {
      const mitt = V.hands === 'mitt', R0 = mitt ? 10 : 8.5;
      const palm = rr => {
        const pts = oval(h, rr, rr * 0.95, a, 14);
        if (mitt) { fp(Wl(pts), C.card, seed + sd, 0.5); line(Wl([...pts, pts[0]]), 3.5, sd + 1); }
        else fp(Wl(pts), C.ink, seed + sd, 0.5);
      };
      const fing = (ang, l0, l1, w = 4, off = 0) => { const b = pol(h, ang + 90, off); line(Wl([pol(b, ang, l0), pol(b, ang, l1)]), w, sd + 2 + Math.round(ang + off), C.ink, 1.2); };
      if (kind === 'offen') { for (const d of [-40, -14, 12, 38]) fing(a + d, 5, 18); palm(R0 * 0.9); }
      else if (kind === 'zeig') { fing(a, 4, 24, 4.5); palm(R0); }
      else if (kind === 'daumen') { fing(-90, 4, 21, 5); palm(R0 + 1.5); }
      else if (kind === 'gruss') { for (const off of [-5, 0, 5]) fing(a, 3, 19, 3.6, off); palm(R0 * 0.9); }
      else if (kind === 'faust') palm(R0 + 1.5);
      else palm(R0);
    };
    sk(Wl(limb(armFrom(Bd.shL, P.l[0]), eL, hL)), { p: Pk(3), w: lw, seed: seed + 3 });
    if (Pk(3) >= 1) hand(hL, P.lh, P.lhDir ?? P.l[1], 30);
    sk(Wl(limb(armFrom(Bd.shR, P.r[0]), eR, hR)), { p: Pk(4), w: lw, seed: seed + 4 });
    if (P.pen && Pk(5) > 0) {
      line(Wl([pol(hR, 125, -12), pol(hR, 125, 24)]), 4.5, 92);
      line(Wl([pol(hR, 125, -13), pol(hR, 125, -5)]), 6, 93, C.red);
    }
    if (Pk(4) >= 1) hand(hR, P.rh, P.rhDir ?? P.r[1], 34);

    // effects; glyphs keep their reading direction when the figure is mirrored
    if (Pk(5) < 1) return;
    const age = P.age, hc = Bd.hc;
    const glyph = (base, strokes, dots, rot, sc, color, sd) => {
      if (sc <= 0) return;
      const o0 = Wp(base), T = q => { const v = rotP(q, rot); return [o0[0] + v[0] * s * sc, o0[1] + v[1] * s * sc]; };
      strokes.forEach((st, i) => line(st.map(T), 5.5, sd + i, color));
      g.fillStyle = color;
      dots.forEach(([q, rr]) => { const c = T(q); g.beginPath(); g.arc(c[0], c[1], rr * s * sc, 0, 7); g.fill(); });
    };
    for (const f of P.fx) {
      if (f === 'frage' || f === 'frage2') {
        glyph(add(hc, [r * 1.45, -r * 1.55 + 3 * S(t * 4)]), QM, [[[0, 15], 3.8]], 12, popS(age - 0.2), C.red, 110);
        if (f === 'frage2') glyph(add(hc, [-r * 1.5, -r * 1.35 + 3 * S(t * 4 + 2)]), QM, [[[0, 15], 3.8]], -14, popS(age - 0.45) * 0.8, C.ink, 120);
      }
      if (f === 'ausruf') glyph(add(hc, [r * 1.45, -r * 1.5]), [[[0, -30], [0, 2]]], [[[0, 14], 4.2]], 10, popS(age - 0.1) * (1 + 0.08 * S(t * 12)), C.red, 130);
      if (f === 'birne' && age > 0.25) {
        const sc = eback(clamp((age - 0.25) / 0.3)), c = Wp(add(hc, [0, V.hat ? -145 * kH : -r - 58]));
        const Tq = q => [c[0] + q[0] * s * sc, c[1] + q[1] * s * sc];
        fp(ellPts(0, 0, 19, 20, 5, 1, 0).map(Tq), '#F2D68A', seed + 140, 1);
        line(ellPts(0, 0, 19, 20, 6, 1.06).map(Tq), 4, 141);
        line([[-8, 24], [8, 24]].map(Tq), 4, 142); line([[-6, 30], [6, 30]].map(Tq), 4, 143);
        line([[-6, 6], [-3, -2], [0, 6], [3, -2], [6, 6]].map(Tq), 2.5, 144, C.red, 0.8);
        if (age < 0.8 || Math.floor(t * 7.5) % 2) for (const d of [-75, -45, -15, 15, 45, 75]) line([pol([0, 0], -90 + d, 29), pol([0, 0], -90 + d, 39)].map(Tq), 4, 150 + d, C.red);
      }
      if (f === 'funken') [[-1.7, -0.9, 18], [1.8, -1.3, 15], [1.55, 0.7, 12], [-1.5, 0.9, 13]].forEach(([fx, fy, rr], i) => {
        const sc = popS(age - 0.15 - i * 0.12) * (0.75 + 0.25 * Math.abs(S(t * 5 + i * 1.7)));
        if (sc <= 0) return;
        const c = add(hc, [fx * r, fy * r]), R = rr * sc;
        line(Wl([[c[0] - R, c[1]], [c[0] + R, c[1]]]), 4, 230 + i * 3, C.red);
        line(Wl([[c[0], c[1] - R], [c[0], c[1] + R]]), 4, 231 + i * 3, C.red);
        line(Wl([[c[0] - R * 0.55, c[1] - R * 0.55], [c[0] + R * 0.55, c[1] + R * 0.55]]), 2.5, 232 + i * 3, C.red);
      });
      if (f === 'punkte') for (let i = 0; i < 3; i++) {
        if (age % 1.8 < 0.3 + i * 0.3) continue;
        const c = Hd([-r * 1.3 - i * 17, -i * 16]), rr = 4 + i * 2.5;
        line(Wl(ellPts(c[0], c[1], rr, rr, i, 1.1)), 3, 250 + i);
      }
      if (f === 'wellen') for (const sd of [-1, 1]) for (const [rad, a0, a1] of [[V.fore + 18, 14, 34], [V.fore + 31, 18, 30]]) {
        const pts = [];
        for (let i = 0; i <= 6; i++) pts.push(pol(eR, P.r[1] + sd * (a0 + (a1 - a0) * i / 6), rad));
        line(Wl(pts), 3.5, 260 + rad + sd);
      }
    }
  }

  // Film-Helfer wie fig(), aber mit Gesten-Zeitplan in Filmzeit:
  // figur(3, at(3, 0.3), X + 1400, 960, 1.25, { gesten: [[at(3, 1), 'winken'], [at(3, 3), 'jubeln']] })
  function figur(panel, t0, x, y, s, o = {}) {
    const { dur = 0.7, gesten = [], variante = 'A', dir = 1, seed = 3 } = o;
    const V = typeof variante === 'string' ? VARIANTEN[variante] : variante;
    el(panel, () => {
      if (NOW < t0) return;
      drawFigur(x, y, s, poseAt(gesten, twos(NOW), V, seed), V, { dir, seed, p: clamp((NOW - t0) / dur) });
    });
    ev(t0, 'write', { dur });
  }

  window.FIGUR = { VARIANTEN, GESTEN, poseAt, drawFigur, figur };
  window.figur = figur;
})();
