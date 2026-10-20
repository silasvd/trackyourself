# 09 – MVP-Backlog & Roadmap

Dieses Kapitel ordnet die Umsetzung in überschaubare Arbeitspakete. Die Reihenfolge ist so gewählt,
dass die risikoreichste Fachlogik früh steht und testbar ist. Es sind bewusst keine Zeit- oder
Aufwandsschätzungen enthalten.

## 9.1 Umsetzungsreihenfolge (Leitlinie)

1. Projekt-Setup und Fachlogik zuerst, dann Persistenz, dann UI, dann E2E/Feinschliff.
2. Jede Fachregel wird gemeinsam mit ihren Tests umgesetzt (Dok. 08).
3. Export/Import früh bereitstellen, um Datenverlust vorzubeugen.

## 9.2 MVP-Arbeitspakete

### AP0 – Projekt-Setup
- Vite + React + TypeScript, ESLint/Prettier, Vitest, Playwright, CI-Pipeline (Dok. 07/08).
- Grundgerüst der Projektstruktur (Dok. 07.3).
- **Fertig, wenn:** Build, Lint, Typecheck und ein Beispieltest in CI grün sind.

### AP1 – Domänenlogik Punkte & Budget
- `points`, `budget`, `weekly`, `activity`, `rounding` als reine Funktionen (Dok. 04).
- Vollständige Unit-Tests inkl. aller Grenz-/Sonderfälle (Dok. 08.4–8.7).
- **Fertig, wenn:** alle Testfälle aus Dok. 08.4–8.7 grün und Domänenabdeckung 100 %.

### AP2 – Datenmodell & Persistenz
- Entitäten (Dok. 03), IndexedDB-Kapselung, Repositories, Schemaversion/Migration (Dok. 06).
- Integrationstests mit Fake-IndexedDB (Dok. 08.9).
- **Fertig, wenn:** CRUD je Entität getestet, Snapshot-Prinzip für DiaryEntry umgesetzt.

### AP3 – Seed-Daten
- Kuratierte Basisliste aus BLS 4.0 und 0‑Punkte-Liste als versionierte Seed-Dateien (Dok. 05).
- Einspiel-Mechanismus inkl. Versionsprüfung (Dok. 06.4).
- Quellennennung Max Rubner-Institut / CC BY 4.0 an geeigneter Stelle (Dok. 05.2.1).
- **Fertig, wenn:** Seed reproduzierbar, keine Duplikate, Lizenzhinweis vorhanden.

### AP4 – Profil & Budget-UI
- Profilerfassung, automatische Budgetberechnung, manuelles Überschreiben ohne Hinweise
  (Dok. 02 Flow E, Dok. 04.2).
- **Fertig, wenn:** Budget erscheint und ist überschreibbar; Komponententests grün.

### AP5 – Lebensmittel & Erfassung
- Basisliste, eigene Lebensmittel (anlegen/bearbeiten/löschen), Favoriten, zuletzt verwendet,
  Portionsauswahl inkl. Umrechnungsregel (Dok. 02 Flow A/B, Dok. 05.3).
- **Fertig, wenn:** Eintrag in ≤ 3 Interaktionen möglich; Portionstests grün (Dok. 08.8).

### AP6 – Ernährungstagebuch & Dashboard
- Einträge je Datum/Mahlzeit, bearbeiten/löschen, frühere Tage, Tages-/Wochenstatus,
  Dashboard-Hierarchie und „verbleibend"-Definition (Dok. 02).
- **Fertig, wenn:** Tages-/Wochenwerte korrekt aus Rohdaten abgeleitet; Komponententests grün.

### AP7 – Aktivitäten
- Erfassung (Aktivität, Dauer, Intensität), Anzeige der Aktivitätspunkte ohne Budgetverrechnung
  (Dok. 02 Flow F, Dok. 04.4).
- **Fertig, wenn:** Aktivitätstests grün (Dok. 08.7).

### AP8 – Gewicht
- Erfassung, Verlaufsdiagramm, Veränderung seit erstem/letztem Eintrag (Dok. 02 Flow G).
- **Fertig, wenn:** Diagramm und Veränderungswerte korrekt; Komponententest grün.

### AP9 – Offline & PWA
- Service Worker, Manifest, Installierbarkeit, Offline-Start (Dok. 06).
- **Fertig, wenn:** E2E-Offlinetest (Dok. 08.11 E4) grün.

### AP10 – Export/Import
- Vollständiger JSON-Export und validierender Import mit Bestätigung (Dok. 03.10, Dok. 06.5).
- **Fertig, wenn:** E2E-Round-Trip (Dok. 08.11 E5) grün.

### AP11 – Barrierefreiheit & Feinschliff
- Kontraste, Beschriftungen, Fokus/Tastatur, kein Farbzwang (Dok. 02.3).
- E2E-Hauptflows (Dok. 08.11), Fehlermeldungen, leere Zustände.
- **Fertig, wenn:** alle E2E-Flows grün, A11y-Grundanforderungen erfüllt.

## 9.3 Definition of Done (je Arbeitspaket)

- Funktion entspricht der Spezifikation der referenzierten Kapitel.
- Zugehörige Tests (Unit/Integration/Component/E2E) vorhanden und grün.
- Lint, Typecheck und Build grün in CI.
- UI-Texte Deutsch, Code/Kommentare Englisch.
- Keine neuen Online-Abhängigkeiten für Kernfunktionen.

## 9.4 Spätere Ausbaustufen (nach MVP)

Priorisierte Reihenfolge als Vorschlag:

1. **Online-/Barcode-Suche** (z. B. Open Food Facts) inkl. lokalem Zwischenspeichern.
2. **Aktivitätspunkte optional auf das Essensbudget anrechnen** (abschaltbar; Verbrauchsreihenfolge
   erweitern).
3. **Automatische Budget-Nachführung** bei Gewichtsänderung.
4. **Erweiterte Auswertungen** über Tag/Woche hinaus.
5. **Datensicherung erweitern** (z. B. automatische Export-Erinnerung).

Nicht vorgesehen bleiben die unter Dok. 01.5 genannten Punkte.

## 9.5 Risiken & offene Punkte

- **Nährwert-/Portionsdaten:** Umfang und Pflege der BLS-Teilmenge sowie der Default-Portionen
  müssen kuratiert werden; Qualität bleibt über `source`/`sourceRef` nachvollziehbar (Dok. 05.5).
- **0‑Punkte-Liste:** bewusste Auswahlentscheidungen (z. B. stärkehaltige Ausnahmen) müssen gepflegt
  werden (Dok. 05.4).
- **Rückwirkende Wochenlogik:** konsequent aus Rohdaten ableiten, um Inkonsistenzen zu vermeiden
  (Dok. 04.3.5, Dok. 07.4).
- **Lokale Datenhaltung:** Nutzer über Export/Import vor Datenverlust schützen (Dok. 06.5).
