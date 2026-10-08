# Erklärfilm Jugendleiter*innen-Ausbildung (PPÖ Vorarlberg)

Ein kurzer Erklärfilm (ca. 2:20, 16:9) für RaRo mit 17 oder 18. Er erklärt, warum sich die Jugendleiter*innen-Ausbildung der Pfadfinder und Pfadfinderinnen Österreichs lohnt, wie die drei Phasen ablaufen und welche gebündelten Seminare es in Vorarlberg gibt.

Bild und Ton entstehen komplett im Code: Die Papier- und Strichanimation wird auf einem Canvas gezeichnet, Musik und Soundeffekte werden synthetisiert. Es gibt keine Videoclips, Samples oder Bilddateien.

## Voraussetzungen

- macOS mit installiertem Google Chrome (wird von `render.mjs` über `puppeteer-core` gesteuert)
- Node.js
- ffmpeg
- python3 (nur für die Loudness-Auswertung in `build.sh`)

```bash
npm install
```

## Benutzung

Live-Vorschau im Browser: Einen lokalen Server im Projektordner starten und `index.html?play` öffnen.

```bash
python3 -m http.server 8080
```

Dann http://localhost:8080/index.html?play aufrufen.

Contact Sheets mit einem Frame pro Beat nach `out/` rendern:

```bash
node render.mjs contact
```

Einzelne Standbilder rendern (Zeit in Sekunden):

```bash
node render.mjs frames 12.5 40
```

Den ganzen Film rendern (Frames, Audio, Normalisierung auf -14 LUFS, H.264):

```bash
./build.sh
```

Das Ergebnis ist `jl-ausbildung-entwurf2.mp4`. Zum Teilen eine kleinere Version exportieren:

```bash
ffmpeg -i jl-ausbildung-entwurf2.mp4 -c:v libx264 -preset medium -crf 25 -pix_fmt yuv420p -c:a copy -movflags +faststart jl-ausbildung-entwurf2_klein.mp4
```

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `index.html` | Canvas-Seite, stellt `window.seek(t)` bereit |
| `lib.js` | Zeichen-Engine: seeded RNG, wackelnde Striche, Papierkarten, Stempel, Sprechblasen, Text, Event-Registry |
| `film.js` | Alle Szenen des Films, Timing in Beats |
| `figur.js`, `figuren.html` | Neue Strichfigur mit Galerie (in Arbeit, noch nicht im Film) |
| `audio.mjs` | Musik und SFX-Synthese, schreibt `out/mix_raw.wav` |
| `render.mjs` | Lokaler Server und Headless Chrome, rendert Frames |
| `build.sh` | Kompletter Durchlauf bis zur MP4 |
| `fonts/` | Permanent Marker und Rubik |
| `versions/` | Gesicherte ältere Entwürfe |

Jeder Frame ist eine reine Funktion der Zeit: `window.seek(t)` zeichnet Frame `t`. Deshalb gibt es keine CSS-Transitions, Timer oder Zufallszahlen ohne Seed.

Gerenderte Videos, Audio und alles in `out/` sind nicht im Repo, weil sie zu groß sind. `./build.sh` erzeugt sie neu.

## Inhalt und Quellen

Phasen, Module und Abschluss folgen ppoe.at/ausbildung/jugendleiterinnen-ausbildung/. Die Anmeldung zu den Seminaren läuft über ppoe.at/seminar-anmeldung. Offene Punkte für die nächste Runde stehen in `NOTIZEN.md`.
