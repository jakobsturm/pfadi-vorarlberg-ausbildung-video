'use strict';
// Jugendleiter*innen-Ausbildung – Erklärfilm, Entwurf 2 (16:9)
// Pure function of time: window.seek(t) paints frame t. Engine in lib.js.

// Panels laid out left to right; the camera pans 2 beats, centred on each panel start.
const PLEN = [14, 12, 26, 9, 14, 18, 30, 22, 18, 9, 24, 14];
const PB = PLEN.reduce((a, l, i) => (a.push(i ? a[i - 1] + PLEN[i - 1] : 0), a), []);
const END_BEAT = PB[PB.length - 1] + PLEN[PLEN.length - 1], DURATION = END_BEAT * B;
// music energy per panel: 0 = breakdown, 1 = light, 2 = full
const ENERGY = [1, 0, 2, 0, 1, 2, 2, 2, 2, 0, 2, 1];
const PX = i => i * W;
const at = (i, b) => (PB[i] + b) * B;

// ---------- extra helpers ----------
function popText(panel, t0, str, x, y, o = {}) {
  const { size = 120, color = C.red, rot = 0 } = o;
  el(panel, () => {
    const age = twos(NOW) - t0; if (age < 0) return;
    const s = age < 1 / 15 ? 0.4 : age < 2 / 15 ? 1.25 : 1;
    const wob = Math.sin((NOW - t0) * 3 + x) * 0.06;
    g.save(); g.translate(x, y); g.rotate(rot + wob); g.scale(s, s);
    font(size); g.fillStyle = color; g.textAlign = 'center'; g.fillText(str, 0, size * 0.35); g.textAlign = 'left';
    g.restore();
  });
  ev(t0, 'pop');
}
function sparkle(panel, t0, x, y, r = 26) {
  el(panel, () => {
    const p = clamp((NOW - t0) / 0.25); if (p <= 0) return;
    sketch([[x - r, y], [x + r, y]], { p, w: 5, color: C.red, seed: x | 0, double: false });
    sketch([[x, y - r], [x, y + r]], { p, w: 5, color: C.red, seed: (y | 0) + 1, double: false });
    sketch([[x - r * .55, y - r * .55], [x + r * .55, y + r * .55]], { p, w: 3, color: C.red, seed: (x | 0) + 2, double: false });
  });
}
function band(panel, t0, x, y, w, h, text, o = {}) {
  const { fill = C.kraft, color = C.ink, size = 40, fam = 'R', wt = 700, seed = 77 } = o;
  el(panel, () => {
    const age = twos(NOW) - t0; if (age < 0) return;
    const u = eout(clamp(age / 0.35));
    g.save(); g.translate(lerp(-w - x - 100, 0, u), 0);
    const tip = h * 0.55;
    const pts = [[x, y], [x + w - tip, y], [x + w, y + h / 2], [x + w - tip, y + h], [x, y + h]];
    g.save(); g.shadowColor = 'rgba(80,55,25,0.28)'; g.shadowBlur = 14; g.shadowOffsetY = 8; fillPoly(pts, fill, seed, 1.5); g.restore();
    if (fill === C.kraft) sketch([...pts, pts[0]], { w: 3, seed: seed + 1, double: false, color: 'rgba(37,34,42,.55)' });
    fitFont([text], size, w - tip - 60, fam === 'Marker' ? 'Marker' : 'R', fam === 'Marker' ? '' : wt);
    g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, x + 36, y + h / 2 + 3); g.textBaseline = 'alphabetic';
    g.restore();
  });
  ev(t0, 'whoosh', { dur: 0.35 });
}
function heading(panel, n, title, sub) {
  const Y = 0, X = PX(panel);
  numeral(panel, at(panel, 0.5), n, X + 190, Y + 200);
  writeOn(panel, at(panel, 1), title, X + 320, Y + 245, { size: 110 });
  if (sub) lines(panel, at(panel, 2), [sub], X + 324, Y + 322, { size: 40, color: C.ink2, maxW: 980 });
}
function bodyText(lns, x, y, size = 38, lh = 1.32, wt = 400, color = C.ink) {
  font(size, 'R', wt); g.fillStyle = color;
  lns.forEach((l, i) => g.fillText(l, x, y + i * size * lh));
}

// ---------- doodle icons (local coords, ~120px) ----------
const ICONS = {
  cap: p => {
    sketch([[-62, -8], [0, -40], [62, -8], [0, 24], [-62, -8]], { p, w: 5, seed: 1 });
    sketch([[-36, 6], [-36, 40], [36, 40], [36, 6]], { p: clamp(p * 1.5 - .5), w: 5, seed: 2 });
    sketch([[62, -8], [62, 34]], { p: clamp(p * 2 - 1), w: 4, color: C.red, seed: 3 });
  },
  cert: p => {
    sketch(rectPts(-60, -42, 104, 74, 31), { p, w: 5, seed: 4, double: false });
    sketch([[-44, -18], [24, -18]], { p: clamp(p * 2 - .6), w: 3, seed: 5, double: false });
    sketch([[-44, 2], [10, 2]], { p: clamp(p * 2 - .8), w: 3, seed: 6, double: false });
    if (p > 0.7) { fillPoly(ellPts(46, 30, 20, 20, 7, 1, 0), C.red, 8, 1); sketch([[38, 46], [32, 70]], { w: 4, color: C.red, seed: 9, double: false }); sketch([[54, 46], [60, 70]], { w: 4, color: C.red, seed: 10, double: false }); }
  },
  tent: p => {
    sketch([[-66, 42], [0, -48], [66, 42], [-66, 42]], { p, w: 5, seed: 11 });
    sketch([[0, -48], [-16, 42]], { p: clamp(p * 2 - 1), w: 4, seed: 12 });
    sketch([[0, -48], [16, 42]], { p: clamp(p * 2 - 1), w: 4, seed: 13 });
    sketch([[0, -48], [0, -76]], { p: clamp(p * 2 - 1), w: 4, seed: 14 });
    if (p > 0.8) fillPoly([[0, -76], [30, -68], [0, -58]], C.red, 15, 1);
  },
  net: p => {
    const pts = [[-50, 28], [0, -36], [52, 24]];
    sketch([pts[0], pts[1], pts[2], pts[0]], { p, w: 4, seed: 16, double: false });
    pts.forEach((q, i) => { if (p > 0.3 + i * 0.2) { fillPoly(ellPts(q[0], q[1], 18, 18, 17 + i, 1, 0), i === 1 ? C.red : C.card, 20 + i, 1); sketch(ellPts(q[0], q[1], 18, 18, 23 + i), { w: 4, seed: 26 + i, double: false }); } });
  },
  sprout: p => {
    sketch([[-60, 44], [60, 44]], { p, w: 4, seed: 30, double: false });
    sketch(curvePts([0, 44], [-6, 0], [4, -36]), { p: clamp(p * 1.6 - .3), w: 5, seed: 31 });
    if (p > 0.6) { fillPoly(ellPts(-24, -8, 24, 11, 32, 1, 0), C.red, 33, 1); fillPoly(ellPts(26, -26, 24, 11, 34, 1, 0), C.red, 35, 1); }
    sketch([[52, -12], [52, -60]], { p: clamp(p * 2 - 1), w: 4, seed: 36 }); sketch([[38, -44], [52, -62], [66, -44]], { p: clamp(p * 2 - 1.2), w: 4, seed: 37 });
  },
  jump: p => {
    sketch([[-66, 30], [-30, 30], [6, 30], [42, 30], [70, 30]], { p, w: 4, seed: 40, dash: [10, 10], double: false });
    arrow([-62, 22], [0, -80], [66, 18], { p: clamp(p * 1.4 - .3), w: 5, color: C.red, seed: 41, head: 24 });
  },
};

function whyCard(panel, a, cx, cy, icon, title, body, seed, o = {}) {
  const w = 560, h = 350, { fill = C.card } = o;
  card(panel, a, [cx, cy], w, h, (rnd(seed, 1) - .5) * 0.05, seed, () => {
    g.save(); g.translate(-w / 2 + 92, -h / 2 + 92); ICONS[icon](clamp((NOW - a - 0.2) / 0.6)); g.restore();
    fitFont([title], 54, w - 220, 'Marker'); g.fillStyle = C.ink; g.fillText(title, -w / 2 + 180, -h / 2 + 112);
    font(38, 'R', 400); const ls = wrap(body, w - 80);
    bodyText(ls, -w / 2 + 40, -h / 2 + 204, 38, 1.3);
  }, { fill });
  ev(a + 0.2, 'write', { dur: 0.6 });
}

// ===================================================================
// SCENES
// ===================================================================

// ---- 0 Intro: RaRo mit 17/18 ----
(() => {
  const X = PX(0);
  fig(0, at(0, 0.3), X + 420, 930, 1.3, { dur: 1.0, waveFrom: at(0, 2), seed: 3 });
  writeOn(0, at(0, 0.5), 'Du bist 17 oder 18', X + 760, 250, { size: 104 });
  writeOn(0, at(0, 2.5), 'und bei den RaRo?', X + 760, 380, { size: 104 });
  lines(0, at(0, 5), ['Dann kannst du jetzt starten mit der'], X + 764, 510, { size: 50, color: C.ink2 });
  slam(0, at(0, 7), 'Jugendleiter*innen-', X + 760, 680, { size: 124, maxW: 1060, rot: -0.02 });
  slam(0, at(0, 8), 'Ausbildung!', X + 760, 820, { size: 124, maxW: 1060, rot: -0.02 });
  el(0, () => {
    const p = clamp((NOW - at(0, 9)) / 0.5);
    sketch([[770, 865], [1100, 852], [1400, 862]], { p, w: 10, color: C.red, seed: 5 });
  });
  ev(at(0, 9), 'write', { dur: 0.5 });
  sparkle(0, at(0, 10), X + 230, 420); sparkle(0, at(0, 10.5), X + 640, 380, 20); sparkle(0, at(0, 11), X + 600, 560, 16);
})();

// ---- 1 Frage ----
(() => {
  const X = PX(1);
  fig(1, at(1, 0.5), X + 1420, 960, 1.25, { dur: 0.8, waveFrom: at(1, 1.5), seed: 7 });
  bubble(1, at(1, 1.5), X + 140, 170, 1040, 260, [X + 1290, 600], 'Hä? Wie läuft das ab?', { size: 76, tailX: X + 1000 });
  bubble(1, at(1, 5), X + 220, 520, 960, 220, [X + 1290, 640], 'Und warum soll ich das machen?', { size: 58, tailX: X + 1020 });
  popText(1, at(1, 2.5), '?', X + 1330, 320, { size: 130, rot: -0.2 });
  popText(1, at(1, 3), '?', X + 1530, 280, { size: 100, rot: 0.25, color: C.ink });
  popText(1, at(1, 6.5), '?', X + 1640, 420, { size: 110, rot: 0.1 });
})();

// ---- 2 Warum ----
(() => {
  const X = PX(2);
  slam(2, at(2, 0.5), 'Warum?', X + 100, 205, { size: 150 });
  writeOn(2, at(2, 1.5), "Darum lohnt sich's:", X + 920, 200, { size: 74 });
  const cols = [X + 380, X + 960, X + 1540], rows = [452, 828];
  const items = [
    ['cap', 'ECTS-Punkte', 'Die Ausbildung kannst du dir im Studium anrechnen lassen.'],
    ['cert', 'Zertifikat', 'Du wirst zertifizierte*r Jugendleiter*in, extern anerkannt (aufZAQ).'],
    ['tent', 'Praxistipps', 'Ideen und Methoden für deine Heim- und Truppstunden.'],
    ['net', 'Vernetzung', 'Du lernst Leiter*innen aus anderen Gruppen kennen.'],
    ['sprout', 'Wachsen', 'Persönliche Weiterentwicklung als Leiter*in und als Mensch.'],
    ['jump', 'Abkürzung', 'Vorwissen zählt: z. B. eine Ausbildung im Sozialbereich wird angerechnet.'],
  ];
  items.forEach(([ic, t, b], i) => whyCard(2, at(2, 3 + i * 3), cols[i % 3], rows[Math.floor(i / 3)], ic, t, b, 200 + i, { fill: i === 5 ? C.kraft : C.card }));
})();

// ---- 3 "Das ist ja super, wie kann ich starten?" ----
(() => {
  const X = PX(3);
  fig(3, at(3, 0.3), X + 1400, 960, 1.25, { dur: 0.6, waveFrom: at(3, 1), jumpFrom: at(3, 1.5), seed: 9 });
  bubble(3, at(3, 1), X + 200, 260, 1000, 300, [X + 1300, 640], 'Das ist ja super! Wie kann ich starten?', { size: 72, tailX: X + 1000 });
  sparkle(3, at(3, 2), X + 1650, 300); sparkle(3, at(3, 2.5), X + 1200, 760, 20);
})();

// ---- 4 Wie? Überblick ----
(() => {
  const X = PX(4);
  slam(4, at(4, 0.5), 'Wie?', X + 100, 210, { size: 150 });
  writeOn(4, at(4, 1.5), 'In 3 Phasen zum Zertifikat', X + 520, 205, { size: 74 });
  const st = [[X + 300, 560], [X + 760, 560], [X + 1220, 560], [X + 1680, 560]];
  const lab = [['Einstieg', ['Startveranstaltung', '+ Gespräch']], ['Erfahrung', ['13 Module']], ['Vertiefung', ['6 Module +', 'Praxisaufgabe']], ['Zertifikat!', ['Abschluss-', 'gespräch']]];
  for (let k = 0; k < 3; k++) {
    const a = at(4, 3.4 + k * 1.5);
    const c = [(st[k][0] + st[k + 1][0]) / 2, k % 2 ? 640 : 480];
    el(4, () => sketch(curvePts([st[k][0] + 66, 560], c, [st[k + 1][0] - 66, 560]), { p: clamp((NOW - a) / 0.6), w: 6, seed: 40 + k, dash: [20, 16], double: false }));
    ev(a, 'write', { dur: 0.6 });
  }
  for (let k = 0; k < 4; k++) {
    const a = at(4, 3 + k * 1.5);
    el(4, () => {
      const age = twos(NOW) - a; if (age < 0) return;
      const s = age < 1 / 15 ? 0.5 : age < 2 / 15 ? 1.15 : 1;
      const [x, y] = st[k];
      g.save(); g.translate(x, y); g.scale(s, s);
      if (k < 3) {
        fillPoly(ellPts(0, 0, 64, 64, k, 1, 0), C.card, k + 30, 1.5);
        sketch(ellPts(0, 0, 64, 64, k + 5), { w: 7, color: C.red, seed: k + 50 });
        font(86); g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(String(k + 1), 0, 31); g.textAlign = 'left';
      } else {
        const sp = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 36 : 84, an = -Math.PI / 2 + i * Math.PI / 5; sp.push([Math.cos(an) * r, Math.sin(an) * r]); }
        fillPoly(sp, C.red, 61, 1.5); sketch([...sp, sp[0]], { w: 5, seed: 62, double: false });
      }
      g.restore();
    });
    ev(a, 'pop');
    writeOn(4, a + 0.2, lab[k][0], st[k][0] - 0, 720, { size: 70, color: k === 3 ? C.red : C.ink, per: 0.04, align: 'center' });
    lines(4, a + 0.7, lab[k][1], st[k][0], 795, { size: 38, color: C.ink2, align: 'center' });
  }
  lines(4, at(4, 9.5), ['Innerhalb einer Phase bestimmst du selbst die Reihenfolge der Module.'], X + 100, 975, { size: 42, wt: 500 });
})();

// ---- 5 Einstiegsphase ----
(() => {
  const X = PX(5);
  heading(5, 1, 'Einstiegsphase');
  card(5, at(5, 2.5), [X + 530, 600], 800, 430, -0.02, 501, (w, h) => {
    font(68); g.fillStyle = C.ink; g.fillText('Startveranstaltung', -w / 2 + 40, -h / 2 + 96);
    bodyText(['Auftrag & Werte der PPÖ', 'Pfadfinder*innen-Methode', 'Leiter*innen aus anderen Gruppen'], -w / 2 + 42, -h / 2 + 172, 40);
    font(40, 'R', 700); g.fillStyle = C.ink; g.fillText('ab 17 Jahren', -w / 2 + 42, -h / 2 + 352);
  });
  stamp(5, at(5, 4.5), X + 780, 760, -0.12, 'SEMINAR', { size: 42 });
  card(5, at(5, 6.5), [X + 1390, 600], 800, 430, 0.02, 502, (w, h) => {
    font(68); g.fillStyle = C.ink; g.fillText('Einstiegsgespräch', -w / 2 + 40, -h / 2 + 96);
    bodyText(['mit deiner*deinem Ausbildungs-', 'beauftragten in deiner Gruppe:'], -w / 2 + 42, -h / 2 + 172, 40);
    bodyText(['Was kannst du schon?', 'Womit startest du?'], -w / 2 + 42, -h / 2 + 300, 40, 1.32, 700);
  });
  lines(5, at(5, 10), ['Beides geschafft? Dann geht es weiter mit Phase 2.'], X + 100, 940, { size: 44, color: C.ink2 });
})();

// ---- 6 Erfahrungsphase ----
const MOD2 = [
  ['Erste Hilfe', 'S'], ['Partizipation 1', 'S'], ['Führungs-\nverhalten'], ['Sicherheits-\nhalber', 'S'], ['Freiwilliges\nEngagement'],
  ['Methoden der\nAltersstufen', 'SS'], ['Lebensraum\nNatur'], ['Gesetzlicher\nRahmen', 'S'], ['Arbeiten mit\nGruppen'], ['Geschlechter-\nbezogenes\nArbeiten'],
  ['Ziel-\norientierte\nPlanung', 'S'], ['Kommunikation', 'S'], ['Pädagogisches\nKonzept 1', 'S'],
];
(() => {
  const X = PX(6);
  heading(6, 2, 'Erfahrungsphase', 'Nach erfolgreichem Abschluss der Einstiegsphase:');
  const cols = [260, 610, 960, 1310, 1660].map(c => X + c), rows = [452, 642, 832];
  const slot = k => [cols[k % 5], rows[Math.floor(k / 5)]];
  const swapA = 2, swapB = 8, tSwap = at(6, 20.5), dSwap = 0.7;
  const posOf = k => () => {
    const [x, y] = slot(k);
    if (k === swapA || k === swapB) {
      const other = slot(k === swapA ? swapB : swapA);
      const u = eio(clamp((twos(NOW) - tSwap) / dSwap)), lift = Math.sin(u * Math.PI) * (k === swapA ? -110 : 110);
      return [lerp(x, other[0], u), lerp(y, other[1], u) + lift, Math.sin(u * Math.PI) * 0.25];
    }
    return [x, y];
  };
  MOD2.forEach(([label, s], k) => card(6, at(6, 3 + k * 0.75), posOf(k), 320, 166, (rnd(k, 17) - .5) * 0.07, 600 + k, w => { g.translate(0, s ? -14 : 0); cardLabel(label.split('\n'), w, 40); }));
  ev(tSwap, 'whoosh', { dur: dSwap });
  let j = 0;
  MOD2.forEach(([, s], k) => {
    if (!s) return; const [x, y] = slot(k);
    stamp(6, at(6, 13 + j * 0.75), x + 52, y + 74, -0.08 + (rnd(k, 3) - .5) * 0.08, s === 'SS' ? 'SEMINAR·STUFE' : 'SEMINAR', { size: s === 'SS' ? 26 : 30 });
    j++;
  });
  el(6, () => {
    const age = twos(NOW) - at(6, 19); if (age < 0) return;
    const dy = age < 1 / 15 ? 22 : age < 2 / 15 ? 7 : 0;
    font(40, 'R', 700); g.fillStyle = C.red; g.fillText('SEMINAR', X + 1160, 815 + dy);
    const w = g.measureText('SEMINAR ').width;
    font(40, 'R', 500); g.fillStyle = C.ink; g.fillText('= Seminar besuchen', X + 1160 + w, 815 + dy);
    g.fillStyle = C.ink2; g.fillText('ohne Stempel = in deiner Gruppe', X + 1160, 870 + dy);
  });
  writeOn(6, tSwap, 'Reihenfolge?', X + 1330, 175, { size: 58, color: C.red, per: 0.04 });
  writeOn(6, tSwap + 0.5, 'Du entscheidest!', X + 1330, 245, { size: 58, color: C.red, per: 0.04 });
  band(6, at(6, 23.5), X + 100, 940, 1720, 92, 'Fortschrittsgespräche mit deiner*deinem Ausbildungsbeauftragten', { size: 40 });
})();

// ---- 7 Vertiefungsphase ----
const MOD3 = [['Partizipation 2'], ['Elternarbeit'], ['Gruppen-\nentwicklung', 'S'], ['Gefahren &\nRisiken'], ['Pädagogisches\nKonzept 2', 'SS'], ['Spiritualität', 'S']];
(() => {
  const X = PX(7);
  heading(7, 3, 'Vertiefungsphase', 'Den letzten Teil schließt du mit der Vertiefungsphase ab.');
  const cols = [295, 690, 1085].map(c => X + c), rows = [505, 755];
  const slot = k => [cols[k % 3], rows[Math.floor(k / 3)]];
  MOD3.forEach(([label, s], k) => card(7, at(7, 3 + k * 0.75), slot(k), 375, 220, (rnd(k, 27) - .5) * 0.07, 700 + k, w => { g.translate(0, s ? -14 : 0); cardLabel(label.split('\n'), w, 46); }));
  let j = 0;
  MOD3.forEach(([, s], k) => {
    if (!s) return; const [x, y] = slot(k);
    stamp(7, at(7, 8 + j * 0.75), x + 70, y + 100, -0.08 + (rnd(k, 5) - .5) * 0.08, s === 'SS' ? 'SEMINAR·STUFE' : 'SEMINAR', { size: s === 'SS' ? 26 : 30 }); j++;
  });
  card(7, at(7, 11), [X + 1575, 630], 480, 480, 0.02, 720, (w, h) => {
    font(62); g.fillStyle = C.ink; g.fillText('Praxisaufgabe', -w / 2 + 36, -h / 2 + 88);
    font(38, 'R', 400);
    bodyText(wrap('Plane ein Programm für deine Stufe, führe es durch, reflektiere es und stell es anderen Jugendleiter*innen vor.', w - 76), -w / 2 + 38, -h / 2 + 160, 38, 1.32);
  });
  lines(7, at(7, 14), ['Die Praxisaufgabe baut auf Pädagogisches Konzept 2 auf.'], X + 100, 975, { size: 42, color: C.ink2 });
})();

// ---- 8 Abschlussgespräch + You did it! ----
(() => {
  const X = PX(8);
  writeOn(8, at(8, 0.5), 'Ganz zum Schluss:', X + 100, 195, { size: 90 });
  band(8, at(8, 2), X + 100, 260, 900, 130, 'Abschlussgespräch', { fill: C.red, color: C.card, fam: 'Marker', size: 76, seed: 91 });
  lines(8, at(8, 3.5), ['mit deiner*deinem Ausbildungs-', 'beauftragten: Rückblick & Feedback'], X + 100, 475, { size: 44, maxW: 900 });
  fig(8, at(8, 4.5), X + 330, 1010, 0.78, { dur: 0.6, jumpFrom: at(8, 11), seed: 3 });
  fig(8, at(8, 5), X + 720, 1010, 0.85, { dur: 0.6, hat: false, clip: true, seed: 81 });
  card(8, at(8, 7), [X + 1440, 450], 740, 480, -0.03, 801, (w, h) => {
    sketch(rectPts(-w / 2 + 28, -h / 2 + 28, w - 56, h - 56, 802), { w: 3, seed: 803, double: false, color: C.ink2 });
    font(38, 'R', 700); g.fillStyle = C.ink2; g.textAlign = 'center';
    g.fillText('Z E R T I F I K A T', 0, -h / 2 + 115);
    fitFont(['Jugendleiter*in'], 100, w - 130, 'Marker'); g.fillStyle = C.red; g.fillText('Jugendleiter*in', 0, -h / 2 + 260);
    font(66); g.fillStyle = C.ink; g.fillText('der PPÖ', 0, -h / 2 + 360);
    g.textAlign = 'left';
  });
  stamp(8, at(8, 8.5), X + 1650, 640, -0.16, 'GESCHAFFT!', { size: 40 });
  slam(8, at(8, 10), 'You did it!', X + 1090, 860, { size: 130, maxW: 740 });
  writeOn(8, at(8, 12), '+ Instruktorabzeichen', X + 1100, 965, { size: 54, per: 0.035 });
  sparkle(8, at(8, 10.5), X + 1000, 760); sparkle(8, at(8, 11), X + 1860, 820, 20);
})();

// ---- 9 "Wo kann ich mich anmelden?" ----
(() => {
  const X = PX(9);
  fig(9, at(9, 0.3), X + 480, 960, 1.25, { dur: 0.6, waveFrom: at(9, 1), seed: 11 });
  bubble(9, at(9, 1), X + 760, 260, 1000, 300, [X + 600, 620], 'Das ist ja super! Wo kann ich mich anmelden?', { size: 70, tailX: X + 880 });
  popText(9, at(9, 2.5), '?', X + 340, 330, { size: 110, rot: -0.2 });
})();

// ---- 10 Seminare in Vorarlberg (gebündelt) ----
const VBG = [[9.73, 47.54], [9.68, 47.50], [9.62, 47.46], [9.66, 47.40], [9.62, 47.35], [9.60, 47.30], [9.53, 47.27], [9.57, 47.20], [9.61, 47.06], [9.70, 47.04], [9.87, 46.99], [9.98, 46.92], [10.10, 46.85], [10.16, 46.85], [10.23, 46.88], [10.17, 47.00], [10.22, 47.13], [10.13, 47.21], [10.20, 47.28], [10.10, 47.37], [10.03, 47.39], [9.97, 47.54], [9.85, 47.52], [9.80, 47.58], [9.73, 47.54]];
const STUFEN = ['je Stufe:', 'WiWö · GuSp', 'CaEx · RaRo'];
const BUNDLES = [
  { fmt: 'Modultag', ph: 2, sub: [], chips: ['Sicherheitshalber', 'Gesetzlicher Rahmen', 'Kommunikation'] },
  { fmt: 'Modulwochenende', ph: 2, sub: [], chips: ['Pädagogisches Konzept 1', 'Partizipation 1', 'Zielorientierte Planung'] },
  { fmt: 'Wochenende', ph: 2, sub: STUFEN, chips: ['Methoden der Altersstufen'] },
  { fmt: 'Vertiefungswochenende', ph: 3, sub: STUFEN, chips: ['Pädagogisches Konzept 2', 'Gruppenentwicklung', 'Spiritualität'] },
];
(() => {
  const X = PX(10);
  writeOn(10, at(10, 0.5), 'Seminare in', X + 100, 165, { size: 90 });
  slam(10, at(10, 1.5), 'Vorarlberg', X + 700, 170, { size: 120, maxW: 620 });
  el(10, () => {
    const p = clamp((NOW - at(10, 1)) / 1.0);
    const pts = VBG.map(([lo, la]) => [X + 1640 + (lo - 9.5) * 0.68 * 330, 40 + (47.6 - la) * 330]);
    if (p >= 1) fillPoly(pts.slice(0, -1), 'rgba(198,58,44,0.16)', 701, 1);
    sketch(pts, { p, w: 5, seed: 702 });
  });
  ev(at(10, 1), 'write', { dur: 1.0 });
  lines(10, at(10, 2.5), ['So sind die Module zu Seminaren gebündelt:'], X + 100, 255, { size: 44, color: C.ink2 });
  const blocks = [[X + 100, 310], [X + 990, 310], [X + 100, 680], [X + 990, 680]];
  BUNDLES.forEach((b, r) => {
    const t0 = at(10, 4 + r * 4), [x0, y0] = blocks[r];
    writeOn(10, t0, b.fmt, x0, y0 + 56, { size: 62, color: C.red, per: 0.035, maxW: 600 });
    el(10, () => {
      const age = twos(NOW) - (t0 + 0.3); if (age < 0) return;
      const s = age < 1 / 15 ? 0.5 : age < 2 / 15 ? 1.15 : 1;
      g.save(); g.translate(x0 + 790, y0 + 34); g.scale(s, s);
      fillPoly(ellPts(0, 0, 34, 34, r, 1, 0), C.red, 1020 + r, 1);
      font(44); g.fillStyle = C.card; g.textAlign = 'center'; g.fillText(String(b.ph), 0, 16); g.textAlign = 'left';
      g.restore();
      font(26, 'R', 500); g.fillStyle = C.ink2; g.textAlign = 'right'; g.fillText('Phase', x0 + 746, y0 + 44); g.textAlign = 'left';
    });
    b.chips.forEach((c, i) => {
      const a = t0 + B * (1.5 + i * 0.5);
      el(10, () => {
        const age = twos(NOW) - (a - 0.1); if (age < 0) return;
        const u = clamp(age / 0.32), dx = (1 - eback(u)) * -900;
        g.save(); g.translate(x0 + i * 16 + dx + 285, y0 + 128 + i * 68); g.rotate((i % 2 ? 0.016 : -0.012) + (1 - u) * -0.2);
        paper(-285, -39, 570, 78, C.card, 1010 + r * 5 + i);
        fitFont([c], 42, 500, 'R', 500); g.fillStyle = C.ink; g.textBaseline = 'middle'; g.fillText(c, -244, 2); g.textBaseline = 'alphabetic';
        g.restore();
      });
      ev(a, 'drop');
    });
    const tc = t0 + B * (1.5 + b.chips.length * 0.5 + 0.5);
    el(10, () => {
      const age = twos(NOW) - tc; if (age < 0) return;
      paperclip(x0 + 18, y0 + 52 + (1 - eout(clamp(age / 0.2))) * -90, 0.66);
    });
    ev(tc, 'clip');
    lines(10, tc + B, b.sub, x0 + 640, y0 + 130, { size: 38, color: C.ink, maxW: 210, step: 0.2, wt: 500 });
  });
})();

// ---- 11 Anmeldung ----
(() => {
  const X = PX(11);
  writeOn(11, at(11, 0.5), 'Anmelden:', X + 100, 300, { size: 110 });
  el(11, () => {
    const age = twos(NOW) - at(11, 2); if (age < 0) return;
    const s = age < 1 / 15 ? 0.6 : age < 2 / 15 ? 1.06 : 1;
    g.save(); g.translate(X + 770, 470); g.scale(s, s); g.rotate(-0.012);
    paper(-670, -82, 1340, 164, C.kraft, 1111);
    fitFont(['ppoe.at/seminar-anmeldung'], 84, 1240, 'R', 700); g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText('ppoe.at/seminar-anmeldung', 0, 30); g.textAlign = 'left';
    g.restore();
    sketch([[X + 120, 585], [X + 700, 575], [X + 1420, 588]], { p: clamp((NOW - at(11, 3)) / 0.45), w: 10, color: C.red, seed: 1112 });
  });
  ev(at(11, 2), 'pop'); ev(at(11, 3), 'write', { dur: 0.45 });
  lines(11, at(11, 4.5), ['Fragen? Der Kontakt steht beim jeweiligen Seminar.'], X + 100, 700, { size: 46, color: C.ink2 });
  fig(11, at(11, 5), X + 1620, 1010, 1.05, { dur: 0.6, waveFrom: at(11, 6), jumpFrom: at(11, 7), seed: 3 });
  slam(11, at(11, 7), 'Gut Pfad!', X + 100, 920, { size: 150, maxW: 900 });
})();

// ---- trail connectors along the bottom edge (drawn during camera travel) ----
for (let i = 1; i < PB.length; i++) {
  const a = (PB[i] - 1) * B, d = 2 * B, xA = PX(i - 1), xB = PX(i);
  const pts = curvePts([xA + 1750, 1056], [(xA + xB + W) / 2 - 300, i % 2 ? 1030 : 1075], [xB + 160, 1056], 50);
  el(i, () => sketch(pts, { p: clamp((NOW - a) / d), w: 6, seed: 900 + i, dash: [22, 18], double: false, color: 'rgba(37,34,42,0.5)' }));
  ev(a, 'whoosh', { dur: d });
}

// ===================================================================
// CAMERA + FRAME
// ===================================================================
function camera(t) {
  let x = 0, z = 1;
  for (let i = 1; i < PB.length; i++) {
    const a = (PB[i] - 1) * B, d = 2 * B, u = clamp((t - a) / d);
    if (t >= a) { x = lerp(PX(i - 1), PX(i), eio(u)); z = 1 - 0.06 * Math.sin(Math.PI * u); }
  }
  for (const p of PUNCH) { const a = t - p; if (a >= 0 && a < 0.5) z += 0.03 * Math.exp(-a * 9); }
  return { x: x + 5 * vnoise(t * 0.5, 5), y: 5 * vnoise(t * 0.5, 9), z, r: 0.003 * vnoise(t * 0.35, 3) };
}

function seek(t) {
  NOW = t; g = ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
  const cam = camera(t);
  ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.rotate(cam.r); ctx.translate(-W / 2 - cam.x, -H / 2 - cam.y);
  const x0 = cam.x - 300, x1 = cam.x + W + 300;
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = TEXP; ctx.fillRect(x0, -200, x1 - x0, H + 400); ctx.restore();
  ctx.fillStyle = 'rgba(37,34,42,0.10)';
  for (let xx = Math.floor(x0 / 60) * 60; xx < x1; xx += 60) for (let yy = -120; yy < H + 120; yy += 60) ctx.fillRect(xx - 2, yy - 2, 4, 4);
  for (const e of ELS) {
    const px = PX(e.panel);
    if (px > cam.x + W * 1.4 || px + W < cam.x - W * 0.4) continue;
    ctx.save(); e.draw(); ctx.restore();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
  vg.addColorStop(0, 'rgba(90,60,25,0)'); vg.addColorStop(1, 'rgba(90,60,25,0.15)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

window.seek = seek;
window.FILM = {
  W, H, FPS, BPM, DURATION,
  beats: Array.from({ length: END_BEAT + 1 }, (_, i) => +(i * B).toFixed(4)),
  sections: PB.map((b, i) => ({ beat: b, len: PLEN[i], energy: ENERGY[i] })),
  events: EVENTS.slice().sort((a, b) => a.t - b.t),
};
window.ready = Promise.all([document.fonts.load('100px Marker'), document.fonts.load('500 40px RubikF'), document.fonts.load('700 40px RubikF'), document.fonts.load('400 40px RubikF')]).then(() => { seek(0); return true; });

if (location.search.includes('play')) {
  document.body.classList.add('preview');
  window.ready.then(() => { const st = performance.now(); const loop = () => { seek(((performance.now() - st) / 1000) % DURATION); requestAnimationFrame(loop); }; loop(); });
}
