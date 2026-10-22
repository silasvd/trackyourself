# 06 – Offline-Architektur & Persistenz

## 6.1 Ziele

- Alle gespeicherten Daten und Kernfunktionen stehen **offline** zur Verfügung.
- Die App startet und läuft nach dem ersten Laden ohne Internetverbindung.
- Nutzerdaten bleiben lokal und privat; kein Server, kein Konto, kein Sync im MVP.

## 6.2 Zwei getrennte Belange

Diese beiden Dinge werden bewusst getrennt behandelt:

1. **App-Shell-Caching (Service Worker):** HTML, JS, CSS, Icons und die mitgelieferten Seed-Daten
   werden über einen Service Worker zwischengespeichert, damit die App offline startet.
2. **Nutzerdatenspeicherung (IndexedDB):** Profil, Lebensmittel, Portionen, Tagebuch-, Aktivitäts-
   und Gewichtseinträge liegen dauerhaft in IndexedDB.

> Wichtig: App-Caching ersetzt **keine** dauerhafte Nutzerdatenspeicherung. Beide Mechanismen sind
> unabhängig.

## 6.3 Persistenz: IndexedDB

- **Begründung:** strukturierte Speicherung, ausreichende Kapazität, breite Browserunterstützung,
  asynchroner Zugriff.
- **Kapselung:** Der Zugriff erfolgt ausschließlich über eine **Repository-Schicht** (Dok. 07).
  Die restliche App kennt IndexedDB-Details nicht. Dadurch bleibt die Speichertechnik austauschbar.
- **Objektspeicher (Stores):** je Entität aus Dok. 03 (`profile`, `foods`, `portions`,
  `diaryEntries`, `activityEntries`, `weightEntries`, `mealTemplates`, `appMeta`).
- **Indizes:** u. a. `diaryEntries` nach `date` und nach `meal`; `foods` nach `isFavorite` und
  `lastUsedAt`; `weightEntries` nach `date`.
- **Schemaversion & Migrationen:** `AppMeta.schemaVersion` steuert Migrationen bei Strukturänderungen.
  Migrationen sind vorwärtsgerichtet und dürfen bestehende Nutzerdaten nicht verlieren.
  Schema 3 ergänzt den Store `mealTemplates`; Rezepte und eigene Suchbegriffe sind optionale Felder
  von `Food` und benötigen keine Datenmigration.

## 6.4 Seed-Daten (Basisliste & 0‑Punkte-Liste)

- Basisliste (Dok. 05) und 0‑Punkte-Zuordnung werden als statische, versionierte Dateien
  ausgeliefert.
- Beim ersten Start (oder bei neuer Seed-Version) werden sie nach IndexedDB eingespielt.
- `AppMeta.seededBaseFoodsVersion` verhindert doppeltes Einspielen und ermöglicht Aktualisierungen,
  ohne vom Nutzer angelegte/veränderte Daten zu überschreiben. Bei einer neuen Seed-Version werden
  nur fehlende Basislebensmittel samt Portionen ergänzt (Seed-Version 2: Erweiterung von 63 auf
  201 Einträge). Ab Seed-Version 3 werden unveränderte Basislebensmittel und deren Tagebuch-Snapshots
  von der BLS-Bezeichnung in den Anzeigenamen umbenannt; jede höhere Seed-Version wiederholt diese
  idempotente Prüfung (Seed-Version 4, Dok. 05.2.2).
- Suchbegriffe der Basisliste sind Teil des App-Bundles und wirken ohne Einspielen.

## 6.5 Datensicherung (Export/Import)

- Da keine Cloud existiert, können Daten bei Geräteverlust, Löschen der Browserdaten oder
  Gerätewechsel verloren gehen.
- Als Schutz bietet das MVP **lokalen Export/Import** als JSON-Datei (Dok. 02 Flow H, Dok. 03,
  Abschnitt 3.10). Der Export ist vollständig und wiederherstellbar.

## 6.6 Online-Abhängigkeiten

- Im MVP gibt es **keine** laufende Online-Abhängigkeit für Kernfunktionen.
- Die spätere Online-/Barcode-Suche (Dok. 09) benötigt eine Internetverbindung; bereits geladene
  Produktdaten können lokal zwischengespeichert werden.

## 6.7 Robustheit

- Schreibzugriffe sind transaktional; fehlgeschlagene Schreibvorgänge dürfen keinen inkonsistenten
  Zustand hinterlassen.
- Beim Import werden Daten zuerst validiert und erst nach Bestätigung angewendet.
- Speicherfehler (z. B. Kontingent überschritten, privater Modus ohne Persistenz) werden erkannt
  und dem Nutzer verständlich gemeldet.
