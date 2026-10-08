# Erklärfilm Jugendleiter*innen-Ausbildung (PPÖ, Vorarlberg)

Kurzer Erklärfilm, der RaRo (17/18) die Jugendleiter*innen-Ausbildung der PPÖ erklärt: warum sie sich lohnt, wie sie abläuft (3 Phasen) und welche gebündelten Seminare es in Vorarlberg gibt. Look: jugendfreundliche Papier- und Strichanimation. Alles wird im Code erzeugt (Bild und Ton).

Sprache mit dem User: Deutsch. Keine Gedankenstriche (em dash) verwenden, natürlich schreiben.

## Motion studio rules (Vorgabe des Users, verbindlich)

### Render contract
- Every film is a pure function of time: `window.seek(t)` paints frame t.
- No CSS transitions, no setTimeout, no requestAnimationFrame in render mode, no state carried between frames. Seeded noise only (mulberry32), never Math.random.
- Render with `node render.mjs`, encode H.264 yuv420p, CRF 16.

### Look
- Banned defaults: centered title on gradient, everything fading in, corner labels and frame borders, glow on UI chrome, generic particle bursts.
- One display face, one UI face. One accent color unless the brief says otherwise.
- Every 2 to 4 seconds something new must happen on screen.

### Sound
- Score and SFX are synthesized in code unless a track is supplied.
- Place hits on the measured beat grid (`beats.json`). Loudness -14 LUFS.

### Loop before you show me anything
1. Render one frame per beat as a contact sheet and LOOK at it.
2. Score it 1-10 on: hook in first 2s, readability at phone size, motion quality, variety, brand accuracy, sound sync.
3. Fix the 3 worst problems. Repeat until every score is 8+.
4. Only then do the full render.

### Effort
Opus 5.5 defaults to medium effort and always thinks before answering. Every viral one-shot in the list ran on xhigh or max. Use medium for small fixes and re-renders, xhigh for new films, max when the first 3 seconds have to carry a launch.

## Entscheidungen aus dem Feedback (Stand Entwurf 2)

- **Format:** 16:9, 1920×1080, 30 fps. Hochformat (Entwurf 1) ist verworfen.
- **Länge und Tempo:** 2 bis 3 Minuten sind okay (aktuell 2:20 bei 90 BPM). Langsam: Nach jeder Sektion muss genug Zeit zum Lesen bleiben (3 bis 6 s Standbild).
- **Sound:** Papier- und Stift-Effekte leise halten. Aktuell liegen die SFX ca. 13 dB RMS unter der Musik. Nicht wieder lauter machen.
- **Ablauf (Skript des Users, Struktur ist gut so):**
  1. Was man mit 17 oder 18 in der RaRo starten kann
  2. Frage: "Hä? Wie läuft das ab? Und warum soll ich das machen?"
  3. Zuerst das **Warum**: ECTS anrechnen, Zertifikat (aufZAQ), Praxistipps für Heim- und Truppstunden, Vernetzung, persönliche Weiterentwicklung, Vorwissen (z. B. Ausbildung im Sozialbereich) wird angerechnet und verkürzt die Ausbildung
  4. Figur: "Das ist ja super! Wie kann ich starten?"
  5. Dann das **Wie**: 3 Phasen im Überblick
  6. Einstiegsphase: Startveranstaltung + Gespräch mit der*dem Ausbildungsbeauftragten in der eigenen Gruppe
  7. Erfahrungsphase (13 Module, Seminar-Stempel, Fortschrittsgespräche)
  8. Vertiefungsphase (6 Module + Praxisaufgabe)
  9. Abschlussgespräch mit der*dem Ausbildungsbeauftragten, dann Zertifikat und "You did it!"
  10. Figur: "Das ist ja super! Wo kann ich mich anmelden?"
  11. Seminare in Vorarlberg (gebündelt), dann Anmeldung ppoe.at/seminar-anmeldung und "Gut Pfad!"
- **Begriffe:** "Ausbildungsbeauftragte*r" (so nennt es der User), nicht "GAB". Ansprache in Du-Form.
- **Vorarlberg-Seminare:** Keine Termine im Film, nur die Bündelung zeigen. GL-Termine (Modultag GL, Modulabend GL) gehören zur Gruppenleitung und bleiben draußen. Die Startveranstaltung steht nicht in der Seminarliste.
  - Modultag: Sicherheitshalber, Gesetzlicher Rahmen, Kommunikation (Phase 2)
  - Modulwochenende: Pädagogisches Konzept 1, Partizipation 1, Zielorientierte Planung (Phase 2)
  - Wochenende je Stufe: Methoden der Altersstufen (Phase 2)
  - Vertiefungswochenende je Stufe: Pädagogisches Konzept 2, Gruppenentwicklung, Spiritualität (Phase 3)
  - Stufen-Seminare gibt es für **alle vier Stufen**: WiWö, GuSp, CaEx, RaRo
- **Offene Notizen** stehen in `NOTIZEN.md`. Wenn der User "Notizen, noch nichts machen" schreibt: nur dort eintragen, nichts am Film ändern.

## Inhaltliche Fakten (Quellen)

- Phasen und Module: ppoe.at/ausbildung/jugendleiterinnen-ausbildung/ und die Kärtchen `~/Downloads/PPÖ_Fortschritte_A5_Kaertchen.pdf` (Seite 3 = Bausteine-Grafik mit Seminar-Markierungen)
  - Einstiegsphase: Einstiegsgespräch, Startveranstaltung (Seminar, ab 17, ca. 7 h)
  - Erfahrungsphase (13): Arbeiten mit Gruppen, Erste Hilfe (S), Freiwilliges Engagement, Führungsverhalten, Geschlechterbezogenes Arbeiten, Gesetzlicher Rahmen (S), Kommunikation (S), Lebensraum Natur, Methoden der Altersstufen (S, Stufe), Pädagogisches Konzept 1 (S), Partizipation 1 (S), Sicherheitshalber (S), Zielorientierte Planung (S)
  - Vertiefungsphase: Elternarbeit, Gefahren und Risiken, Gruppenentwicklung (S), Partizipation 2, Pädagogisches Konzept 2 (S, Stufe), Praxisaufgabe (baut auf PK2 auf), Spiritualität (S), Abschlussgespräch
  - Fortschrittsgespräche begleiten die Erfahrungsphase. Reihenfolge innerhalb einer Phase ist frei.
  - Abschluss: Zertifikat Jugendleiter*in der PPÖ, extern zertifiziert durch aufZAQ, plus Instruktorabzeichen
- Anrechnung von Vorwissen (Schule, Uni, Beruf, andere Pfadi-Kurse): ppoe.at/ausbildung/
- ECTS und "Ausbildung im Sozialbereich wird angerechnet": Aussage aus dem Skript des Users, nicht auf ppoe.at belegt
- Seminarliste: ppoe.at/seminar-anmeldung/ lädt ein edoobox-iframe hinter einer Cloudflare-Bot-Prüfung. Die darf Claude nicht lösen; der User kopiert die Liste oder klickt die Prüfung selbst.

## Look

- Papier `#EFE7D6`, Karten `#FCF9F2`, Kraftpapier `#D9C29B`, Tinte `#25222A` / `#6A6370`, einzige Akzentfarbe Rot `#C63A2C`. Das rote Halstuch der Figur passt zu den RaRo.
- Display-Schrift: Permanent Marker (`fonts/`), UI-Schrift: Rubik 400/500/700 (`fonts/`, als `RubikF` geladen).
- Linien "boilen" mit 8 fps (seed wechselt mit `floor(t*8)`), Papierteile bewegen sich stop-motion "on twos" (15 fps), Kamera und Linienzeichnen laufen flüssig mit 30 fps.
- Elemente erscheinen durch Zeichnen, Aufploppen, Fallen mit Überschwinger, Stempel-Slam oder Reinschieben, nie durch Einblenden.
- Kamera fährt seitlich von Panel zu Panel (2 Beats, zentriert auf den Panel-Start), dabei zeichnet sich der gestrichelte Pfad am unteren Rand weiter. Slams geben einen kleinen Kamera-Punch.

## Dateien

- `lib.js`: Zeichen-Engine (seeded RNG, Wobble-Striche, Papierkarten, Stempel, Sprechblasen, einfache Strichfigur, Text-Helfer, Event-Registry `el()` / `ev()`)
- `film.js`: Szenen von Entwurf 2. `PLEN` = Länge jedes Panels in Beats, `ENERGY` = Musikenergie pro Panel (0 ruhig, 1 leicht, 2 voll). `at(panel, beat)` rechnet Panel-Beats in Sekunden um.
- `figur.js` + `figuren.html`: Strichfigur 2 (Skelett, Gesten, Mimik, Varianten A/B/C) mit Galerie. In Arbeit und noch **nicht** in `film.js` eingebunden.
- `audio.mjs`: synthetisiert Musik (Karplus-Strong-Plucks, Bass, Kick/Clap/Shaker, Glocken-Motiv) und SFX aus `out/events.json`, Hall, schreibt `out/mix_raw.wav`
- `render.mjs`: lokaler HTTP-Server + puppeteer-core mit dem installierten Google Chrome, 6 Worker
- `build.sh`: kompletter Durchlauf Frames → Audio → Loudnorm (2 Pässe, -14 LUFS, TP -1,5) → H.264 CRF 16 → `jl-ausbildung-entwurf2.mp4`
- `versions/v1/`: gesicherter Entwurf 1 (Hochformat). Vor größeren Umbauten den aktuellen Stand nach `versions/vN/` kopieren.
- `out/`: Zwischenergebnisse (contact sheets, frames, events.json, beats.json, Mixe)

## Prozess

1. Änderungen in `film.js` / `lib.js` / `audio.mjs` machen.
2. Contact Sheets rendern und **alle ansehen** (ein Frame pro Beat, 24 pro Sheet):
   ```bash
   node render.mjs contact
   ```
   Einzelne Standbilder: `node render.mjs frames 12.5 40` (schreibt `out/still_<t>.jpg`).
3. Nach den sechs Kriterien bewerten, die 3 größten Probleme beheben, wiederholen.
4. Prüfen, dass alle Treffer (hit, stamp, drop, tick, pop, clip) auf dem 16tel-Raster liegen:
   ```bash
   node -e "const e=require('./out/events.json');const B=60/e.bpm;console.log(e.events.filter(x=>['hit','stamp','drop','tick','pop','clip'].includes(x.type)).filter(x=>{const q=(x.t/B*4)%1;return Math.min(q,1-q)>0.02}))"
   ```
   Kärtchen-Events zählen auf den Landezeitpunkt (`card()` startet die Fallanimation 0,138 s vorher).
5. Voller Render:
   ```bash
   ./build.sh
   ```
6. Nachkontrolle: Loudness steht am Ende der build.sh-Ausgabe (Ziel -14 LUFS), Wellenform mit `showwavespic` ansehen (Musik muss durchgehend tragen, SFX nur Akzente), Stichproben-Frames aus der MP4 ziehen.
7. Zum Teilen zusätzlich eine kleine Version exportieren (der Master mit CRF 16 ist über 200 MB):
   ```bash
   ffmpeg -i jl-ausbildung-entwurf2.mp4 -c:v libx264 -preset medium -crf 25 -pix_fmt yuv420p -c:a copy -movflags +faststart jl-ausbildung-entwurf2_klein.mp4
   ```
8. Dem User die Bewertung ehrlich nennen, auch wenn noch nicht alles bei 8+ ist, und offene inhaltliche Punkte zum Gegenprüfen auflisten.

Live-Vorschau im Browser: `index.html?play` über einen lokalen Server öffnen (nur dort läuft requestAnimationFrame, nie im Render).
