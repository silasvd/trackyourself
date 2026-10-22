# TrackYourself

Eine deutschsprachige PWA zur Erfassung von Lebensmitteln, Aktivitäten und Gewicht. Die Daten
bleiben lokal im Browser; ein Konto, Backend oder geräteübergreifender Sync ist nicht vorhanden.

## Funktionen

- Profil, Tages- und Wochenbudget sowie Ernährungstagebuch.
- Kuratierte BLS-Basisliste, Suche, eigene Lebensmittel und Portionen.
- Rezepte, Mahlzeit-Vorlagen, Favoriten und zuletzt verwendete Lebensmittel.
- Barcode-Erfassung mit Open Food Facts und lokalem Produktcache.
- Aktivitäts- und Gewichtsverlauf, Offline-Nutzung und JSON-Sicherung.

Details zum implementierten Verhalten stehen im [Ist-Konzept](docs/konzept/00-uebersicht.md).

## Lokal starten

Voraussetzung: Node.js 22.12+ und npm.

```sh
npm ci
npm run dev
```

Für einen Produktionsbuild und lokalen PWA-Test:

```sh
npm run build
npm run preview
```

Auf Smartphones kann `./Run.ps1` beim Build und Start einer WLAN-Vorschau helfen; mit `-Https`
steht ein selbstsigniertes Zertifikat für den Kamera-Scan zur Verfügung.

## Qualität prüfen

```sh
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run test:e2e
```

## Veröffentlichung

GitHub Pages wird über den Workflow
[pages.yml](.github/workflows/pages.yml) bei Push auf `main` veröffentlicht. Im Repository muss
als Pages-Quelle einmalig **GitHub Actions** ausgewählt werden.

## Dokumentation

- [Ist-Konzept](docs/konzept/00-uebersicht.md) – aktueller Funktionsumfang und Einstieg in alle Kapitel.
- [Lebensmittel & Datenquellen](docs/konzept/05-lebensmittel-und-datenquellen.md) – Basisliste,
  Portionen, Barcode-Erfassung und Quellen.
- [Offline-Architektur](docs/konzept/06-offline-architektur.md) – lokale Datenhaltung, PWA und
  Datensicherung.
- [Testkonzept](docs/konzept/08-testkonzept.md) – vorhandene Testarten und Testfälle.
