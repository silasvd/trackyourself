# 09 – Implementierter Umfang & Tests

Dieses Kapitel dokumentiert den aktuellen Funktionsumfang und die vorhandenen lokalen Prüfungen.

## 9.1 Vorhandene Funktionsbereiche

- Profil mit automatisch berechnetem Tages- und Wochenbudget sowie getrennten manuellen Overrides.
- Lebensmittel, Portionen, Favoriten, zuletzt verwendete Lebensmittel, Suche und BLS-Basisliste.
- Tagebuch mit Mahlzeiten, Datumsauswahl, Bearbeiten/Löschen, Tages-/Wochenstatus und rückwirkender
  Neuberechnung.
- Rezepte, Mahlzeit-Vorlagen, Übernahme vom Vortag und „Speichern und weiter".
- Aktivitätspunkte zur Anzeige sowie Gewichtsverlauf mit Diagramm und Tabelle.
- Barcode-Erfassung per Kamera oder manueller Eingabe, Open Food Facts-Abruf und lokaler Cache.
- IndexedDB-Speicherung, versionierte Seed-Daten sowie JSON-Export und -Import.
- Installierbare PWA mit Offline-App-Shell.

Die fachlichen Details stehen in den Kapiteln 01–08. Änderungen am tatsächlich verfügbaren Umfang
sollten dort zusammen mit der Umsetzung dokumentiert werden.

## 9.2 Lokale Prüfungen

| Kommando | Prüfung |
| --- | --- |
| `npm run lint` | ESLint und Prettier |
| `npm run typecheck` | TypeScript-Projektprüfung |
| `npm test` | Unit- und Komponententests mit Vitest |
| `npm run test:coverage` | Vitest mit Coverage-Anforderungen |
| `npm run build` | TypeScript-Build und Vite-Produktionsbuild |
| `npm run test:e2e` | Playwright-End-to-End-Tests |

## 9.3 CI

GitHub Actions führt bei Push und Pull Request Lint, Typecheck, Coverage-Tests, Build und
Playwright-E2E-Tests aus. Der Workflow für GitHub Pages erstellt und veröffentlicht den Build bei
Push auf `main`.
