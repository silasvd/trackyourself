# 07 – Technische Architektur

## 7.1 Technologie-Stack

| Bereich | Wahl | Begründung |
| --- | --- | --- |
| Sprache | **TypeScript** | Typsicherheit für Fachlogik und Datenmodell. |
| UI-Bibliothek | **React** | Komponentenmodell, breite Verfügbarkeit. |
| Build/Dev | **Vite** | Schnelles Dev-Setup, einfacher PWA-Build. |
| PWA | Service Worker + Web App Manifest | Installierbarkeit, Offline-Start (Dok. 06). |
| Persistenz | **IndexedDB** (gekapselt) | Dauerhafte lokale Nutzerdaten (Dok. 06). |
| Diagramme | SVG-Komponente in React | Gewichtsverlauf (Dok. 02). |
| Tests | **Vitest**, **React Testing Library**, **Playwright** | Unit, Komponente, E2E (Dok. 08). |
| Lint/Format | ESLint + Prettier | Einheitlicher Stil, frühe Fehlererkennung. |

Neue Abhängigkeiten werden sparsam gewählt; bevorzugt werden etablierte, wartungsarme Bibliotheken.

## 7.2 Schichtenmodell

Klare Trennung, damit die Fachlogik unabhängig testbar ist:

```
UI (React-Komponenten, Seiten)
        │   nutzt
        ▼
Anwendungs-/Zustandsschicht (State, Use-Cases, Formatierung)
        │   ruft
        ▼
Domänenschicht (reine Fachlogik: Punkte, Budget, Tagesreste)   ← framework-frei, rein funktional
        │   nutzt
        ▼
Daten-/Repository-Schicht (IndexedDB-Kapselung, Seed, Export/Import)
```

Grundsätze:

- **Domänenschicht ist rein und seiteneffektfrei.** Alle Berechnungen aus Dok. 04 liegen hier als
  reine Funktionen ohne UI- oder DB-Abhängigkeit. Dadurch sind sie vollständig und schnell per
  Unit-Test abdeckbar.
- **Repository-Schicht kapselt IndexedDB.** Nur sie kennt Speicherdetails (Dok. 06).
- **UI enthält keine Rechenlogik.** Komponenten rufen Domänenfunktionen/Use-Cases auf und zeigen
  Ergebnisse an.

## 7.3 Projektstruktur

```
src/
  domain/            # reine Fachlogik (framework-frei)
    points.ts        # Lebensmittel-Punkte (4.1)
    budget.ts        # Tages-/Wochenbudget (4.2)
    weekly.ts        # Tagesreste & Wochenextras (4.3)
    activity.ts      # Aktivitätspunkte (4.4)
    rounding.ts      # Rundungs-Hilfen (ceil/kaufmännisch)
    types.ts         # Domänentypen
  data/              # Persistenz & Daten
    db.ts            # IndexedDB-Zugriff (gekapselt)
    seed/            # Basisliste & 0-Punkte-Liste (versioniert)
    backup.ts        # Export/Import (3.10)
    openFoodFacts.ts # Barcode-Produktabruf und Mapping
    validation.ts    # Daten- und Backup-Validierung
  app/               # Zustand, Use-Cases, Formatierung
  ui/                # React-Komponenten & Seiten
    pages/           # Dashboard, Aktivität, Gewicht, Profil
    components/      # wiederverwendbare Bausteine
  main.tsx
tests/
  unit/              # Vitest (Domäne, Speicherung, Datentransformation)
  component/         # React Testing Library
  e2e/               # Playwright
docs/
  konzept/           # dieses Konzept
```

## 7.4 Zustandsverwaltung

- Bewusst schlank gehalten. Für MVP genügt lokaler/komponentennaher Zustand plus eine kleine,
  zentrale Schicht für abgeleitete Tages-/Wochenwerte.
- Abgeleitete Werte (verbraucht, verbleibend, Wochenextras) werden **immer aus den Rohdaten
  berechnet** (Domänenschicht), nicht redundant gespeichert. So sind rückwirkende Korrekturen
  (Dok. 04, 4.3.5) automatisch konsistent.

## 7.5 Qualität & Konventionen

- **Sprache:** UI-Texte Deutsch; Code, Bezeichner und Kommentare Englisch.
- **Formatierung/Lint:** ESLint + Prettier, als CI-Schritt erzwungen (Dok. 08).
- **Typen:** strikte TypeScript-Konfiguration; keine impliziten `any`.
- **Fehlerbehandlung:** Persistenz-/Importfehler werden abgefangen und verständlich gemeldet.
- **Barrierefreiheit:** als Querschnittsanforderung in Komponenten berücksichtigt (Dok. 02).

## 7.6 Implementierte technische Eigenschaften

- Schreib- und Ersetzungsvorgänge erfolgen transaktional; Fehler brechen die Änderung ab.
- Speichern erkennt Änderungen aus einem anderen Tab, statt sie still zu überschreiben.
- Die PWA-Konfiguration erzeugt Manifest und Service Worker beim Build; offline benötigte
  App-Dateien werden über Workbox vorgecached.
- Die Fachlogik liegt in TypeScript-Modulen unter `src/domain/`; UI-Komponenten verwenden sie für
  Berechnung und Anzeige.
