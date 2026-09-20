# ⚔️ Epsche Schulden Saga

**Side-Scroller Hack & Slash im Stil von „Stick Fight: Shadow Warrior" — Stickman gegen die Schulden-Front: Kreditkarten, Mahnungen und Inkasso kommen in Wellen von rechts.**

Live spielen: https://chrismindpower369.github.io/epsche-schulden-saga/

Gebaut mit [Phaser 3](https://phaser.io/) (Arcade Physics) — komplett ohne externe Assets, läuft direkt im Browser.

## 🎮 Steuerung

### Tastatur
| Taste | Aktion |
|---|---|
| `A` / `D` oder `←` / `→` | Laufen |
| `W` / `↑` / `Leertaste` | Springen |
| `J` / `K` | Nahkampfangriff |
| `1` – `5` | Waffe direkt wählen |
| `Q` | Nächste Waffe |
| `R` | Neustart (nach Niederlage) |

### Gamepad
| Eingabe | Aktion |
|---|---|
| Linker Stick / D-Pad | Laufen |
| A (unterer Button) | Springen |
| X oder B | Nahkampfangriff |
| LB / RB | Waffe wechseln |
| Start | Neustart |

## 🔥 Feuerkünstler-Waffen

Alle Waffen sind Currently Shapes + Tween-Animationen (Feuerstriche, rotierende Stäbe, kreisende Poi-Kugeln, schnelle Rope-Dart-Stöße). Echte Sprites können später 1:1 eingesetzt werden.

| # | Waffe | Reichweite | Tempo | Schaden | Effekt |
|---|---|---|---|---|---|
| 1 | Feuerschwert | mittel | schnell | 1.0× | breiter Schwing-Bogen |
| 2 | Dragon Staff | lang | mittel | 1.25× | 360°-Rotation |
| 3 | Contact Staff | mittel | mittel | 1.1× | 360°-Rotation, breiter |
| 4 | Poi | breit | langsam | 0.8× | zwei kreisende Feuerkugeln |
| 5 | Rope Dart | sehr lang | langsam | 1.5× | Stöße nach vorn |

## 📈 Level-System

- Gegner geben XP; pro Level-Up: **+2 Schaden, +10 max HP, +8 Laufspeed**
- Fortschritt (Level, XP, xpToNext) wird automatisch im **LocalStorage** gespeichert und beim nächsten Besuch fortgesetzt
- Wellen-Bonus: Kapitelabschluss gibt Bonus-XP und heilt 20 % der max HP

## 🌊 Gegner & Kapitel

Gegner spawnen immer **rechts außerhalb des Bildes** und laufen nach links:

| Gegner | HP | Tempo | XP |
|---|---|---|---|
| Kreditkarte | 30 | langsam | 12 |
| Mahnung | 18 | schnell | 10 |
| Inkasso | 80 | sehr langsam | 30 |

Kapitel (Wellen):
- **Kapitel 1:** 3× Kreditkarte
- **Kapitel 2:** 3× Kreditkarte + 2× Mahnung
- **Kapitel 3+:** Inkasso kommt ins Spiel; Gegner-HP steigt ab Kapitel 4 um 8 % pro Kapitel
- Nach jedem Kapitel: Zusammenfassung (Bonus-XP, Heilung, Kills) und kurze Pause zum Waffenwechsel

## 🛠️ Build & Deploy

Kein Build-Schritt nötig — reines HTML/JS:

```
index.html   # Lädt Phaser 3.80.1 vom CDN und danach die Module aus js/
js/data.js      # feste Werte: Konfiguration, Gegnertypen, Waffen, Farben
js/state.js     # einziger Eigentümer des Laufzeit-Zustands
js/save.js      # LocalStorage (Fortschritt speichern/laden)
js/input.js     # Tastatur & Gamepad -> Absichten
js/hud.js       # alle Bildschirm-Elemente (Leisten, Texte, Panels)
js/progress.js  # XP, Level, abgeleitete Spielerwerte
js/player.js    # Bewegung, Sprung, Angriff, Waffen, Schadenseingang
js/enemies.js   # Gegner erzeugen, verfolgen, treffen, töten
js/waves.js     # Kapitel-/Wellenablauf
js/scene.js     # Szenen-Lebenszyklus (Welt, Kollisionen, Aufbau)
js/main.js      # Phaser-Konfiguration und Start
```

Die Dateien werden als klassische Skripte in dieser Reihenfolge geladen (kein Build,
keine ES-Module) — deshalb genügt es, `?v=` in `index.html` zu erhöhen, wenn sich eine
Datei ändert, damit Browser nicht die alte Fassung aus dem Cache laden.

Alle Module liegen dabei global in `window.Saga` (z. B. `Saga.State`, `Saga.Player`,
`Saga.Enemies`). Das ist Absicht: ohne Build-Schritt ist der globale Namensraum die
Schnittstelle zwischen den Dateien. Einen separaten Dev-/Test-Hook gibt es bewusst **nicht** —
zum Prüfen im Browser dienen direkt die Module, etwa `Saga.Waves.composition(3)`,
`Saga.State.mode` oder `Saga.State.kills`.

**Lokal testen:**
```bash
python -m http.server 8000
# → http://localhost:8000
```
(Direkt per `file://` öffnen funktioniert wegen des dynamischen Script-Loaders ebenfalls.)

**Deploy:** GitHub Pages ist auf `main` / `(root)` konfiguriert — jeder Push auf `main` deployt automatisch. Die Pages-Konfiguration bitte nicht ändern.

**Speicher zurücksetzen:** In der Browser-Konsole
```js
localStorage.removeItem('epsche-schulden-saga-save-v1');
```

## 📋 Roadmap

Die aktuelle Roadmap liegt im Notion-Board **„Epsche Schulden Saga – Roadmap"**.

Umgesetzt (Phasen 1–5): Side-Scroller-Basis · Nahkampf-Hitboxen · XP/Level mit Save · 5 Feuerkünstler-Waffen · Wellen & Kapitel-Progression.

Nächste Ideen: Sprite-Grafiken & Spritesheets statt Shapes · Sound/Musik · Boss-Gegner pro 5. Kapitel · Dodge/Dash ·/mobile Touch-Controls · Boss-Endgegner „Der Schuldenberg".
