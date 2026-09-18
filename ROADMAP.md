# 🗺️ Roadmap — Epsche Schulden Saga

> Diese Datei ist die Roadmap-Quelle im Repo. Sie soll langfristig als Notion-Board
> **„Epsche Schulden Saga – Roadmap"** (Spalten: Backlog / In Progress / Done) geführt werden.
> Stand 18.09.2026: Der verbundene Notion-Connector hat in der aktuellen Session nur
> Lese-Rechte (Schreib-Tools wie `create_pages` / `create_database` sind im Client nicht
> freigegeben) — siehe Issue #1. Bis dahin lebt die Roadmap hier.
>
> **Import in Notion:** Diese Datei lässt sich 1:1 als Seite importieren; die Tabellen
> entsprechen den Board-Einträgen mit den Spalten Status / Phase.

## ✅ Done

| Task | Phase | Status | Commit |
|---|---|---|---|
| Side-Scroller-Basis: Gravity, Boden & Plattformen, Laufen, Springen, Gamepad | 1 | Done | `ec709d0` |
| Gegner von rechts mit Verfolgung, Kontaktschaden, i-Frames | 1 | Done | `ec709d0` |
| Nahkampfangriff mit kurzlebiger Hitbox, Cooldown, Slash-Effekt | 2 | Done | `ecb59b6` |
| Gegner-HP, HP-Balken, Knockback, Treffer-Flash, Todesanimation | 2 | Done | `ecb59b6` |
| XP/Level-System mit Stat-Growth (+2 dmg, +10 HP, +8 Speed pro Level) | 3 | Done | `e17c859` |
| LocalStorage-Save (Level, XP, xpToNext) + Load beim Start | 3 | Done | `e17c859` |
| Level-/XP-HUD (Balken + Text) | 3 | Done | `e17c859` |
| 5 Feuerkünstler-Waffen (Feuerschwert, Dragon Staff, Contact Staff, Poi, Rope Dart) | 4 | Done | `5b09179` |
| Waffen-Wechsel (Tasten 1–5, Q, LB/RB) + Waffen-HUD | 4 | Done | `5b09179` |
| Waffen-Animationen als Shapes/Tweens (Slash, 360°-Spin, Poi-Kreise, Rope-Dart-Stoß) | 4 | Done | `5b09179` |
| Wellen-System: Gegner spawnen gestaffelt von rechts | 5 | Done | `d2ac9f7` |
| 3 Gegnertypen: Kreditkarte, Mahnung, Inkasso | 5 | Done | `d2ac9f7` |
| Kapitel-Progression mit Banner, Abschluss-Panel, Bonus-XP & Heilung | 5 | Done | `d2ac9f7` |
| README aktualisiert (Steuerung, Waffen, Levelsystem, Deploy) | 6 | Done | *(dieser Commit)* |

## 🔄 In Progress

| Task | Phase | Status |
|---|---|---|
| Notion-Board „Epsche Schulden Saga – Roadmap" anlegen (benötigt Schreib-Freigabe für den Notion-Connector) | 6 | In Progress |

## 📋 Backlog

| Task | Phase | Status | Anmerkung |
|---|---|---|---|
| Sprite-Grafiken & Spritesheets statt Shapes (Stickman, Gegner, Waffen) | 7 | Backlog | Phaser-Loader + Anim-Konfig ergänzen; Waffen-Hitboxen bleiben |
| Sound & Musik (Schwung, Treffer, Level-Up, Kapitel-Banner) | 7 | Backlog | freie CC0-Assets, kein Build-Schritt nötig |
| Dodge/Dash mit i-Frames | 7 | Backlog | Shift/Pad-Bumper; ergänzt die Waffen-Kombo |
| Boss-Gegner alle 5 Kapitel („Der Schuldenberg") | 8 | Backlog | eigene HP-Leiste + Angriffsmuster |
| Dialog-System & Story-Kapitel (ursprüngliche Vision: Schuldenabbau + Selbstoptimierung) | 8 | Backlog | aus alter README-Roadmap übernommen |
| Mobile Touch-Controls | 9 | Backlog | Phaser Virtual Joystick / eigene Buttons |
| Atem-Übungs-Minigame zwischen Kapiteln | 9 | Backlog | aus alter README-Roadmap übernommen |
