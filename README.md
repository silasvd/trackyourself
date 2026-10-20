# TrackYourself

Eine deutschsprachige, offlinefähige Progressive Web App für Lebensmittel, Punkte, Aktivitäten
und Gewicht. Alle Daten bleiben lokal in IndexedDB: kein Konto, Backend, Tracking oder Sync.

## Funktionsumfang

Der verbindliche MVP aus dem [Umsetzungskonzept](docs/konzept/00-uebersicht.md) (AP0–AP11) ist
implementiert:

- Profil mit berechneten und unabhängig überschreibbaren Tages-/Wochenbudgets.
- 63 kuratierte BLS-4.0-Lebensmittel, eigene Lebensmittel, Favoriten, zuletzt verwendete
  Lebensmittel und wiederverwendbare Portionen.
- Datum und Mahlzeiten, Live-Punkte, Einträge bearbeiten/löschen, historische Lebensmittel-Snapshots.
- Tagesstatus und getrennte Wochenextras, begrenzte Tagesreste, rückwirkende Neuberechnung.
- Aktivitäten ohne Budgetanrechnung; Gewichtsverlauf mit Diagramm, Tabelle und Veränderungswerten.
- Installierbare PWA mit Offline-Start und lokalem JSON-Export/-Import mit Bestätigung und Validierung.
- Mobile Darstellung, beschriftete Eingaben, Tastaturbedienung und textuelle Statusanzeigen.

Die ausdrücklich später geplanten Funktionen (Barcode, Online-Suche, Cloud-Sync, Gamification usw.)
sind nicht Teil des MVP.

## Starten

Voraussetzung: Node.js **22.12+** (alternativ aktuelle 24-/26-Version), npm.

```sh
npm ci
npm run dev
```

Die Entwicklungsadresse wird im Terminal angezeigt. Für einen produktionsnahen **Offline-/PWA-Test**:

```sh
npm run build
npm run preview
```

Die Vorschau läuft standardmäßig unter `http://127.0.0.1:4173`.
Die App einmal online vollständig laden; der Service Worker speichert die Anwendung inklusive
Basisdaten. Anschließend funktioniert auch ein Neustart offline. Bei Bereitstellung außerhalb von
localhost ist **HTTPS** erforderlich. Den Inhalt von `dist/` am Webserver-Wurzelpfad ausliefern.
Updates werden nach Schließen aller App-Tabs und erneutem Öffnen aktiv, ohne Nutzerdaten zu löschen.

## Tests und Qualität

```sh
npm run lint             # ESLint und Prettier
npm run typecheck        # striktes TypeScript
npm run test:coverage    # Unit-, IndexedDB- und React-Komponententests
npm run build
npx playwright install chromium
npm run test:e2e         # Desktop und mobile Chromium-Emulation
```

Die [CI](.github/workflows/ci.yml) führt dieselben Prüfungen bei Push und Pull Request aus.
Die Abdeckung wird unter `coverage/` erzeugt: **100 % Zweig-/Zeilenabdeckung der Domäne** und
**mindestens 80 % Gesamtzeilenabdeckung** sind verpflichtende, automatisch geprüfte Schwellen.
Playwright prüft E1–E6 aus dem Testkonzept sowie Tastaturfokus und mobiles Layout, gegen den
Produktionsbuild mit echtem Service Worker. Mobile Emulation ersetzt keinen Test auf echten
iOS-/Android-Geräten.

## Daten und Sicherungen

- IndexedDB-Schema **2**: sieben Entity-Stores; Migration von Schema 1 ergänzt Indizes ohne Datenverlust.
  Favoriten werden im Repository-Datenbestand gefiltert, weil IndexedDB keine booleschen Indexschlüssel unterstützt.
- Jede Änderung und jeder Import ersetzt den Datenbestand in **einer Transaktion**. Auch bei
  synchronen Schreibfehlern erfolgt ein Rollback. Konflikte durch einen anderen Tab werden
  gemeldet, statt dessen Änderungen zu überschreiben.
- Abgeleitete Budgets und Wochenwerte werden nicht gespeichert. Änderungen am Profil wirken auch
  auf historische Budgetanzeigen; Gewichtsaufzeichnungen ändern das Profilbudget nicht automatisch.
- Sicherungen enthalten `schemaVersion`, `exportedAt`, Profil, Lebensmittel, Portionen, Tagebuch,
  Aktivitäten, Gewicht **und `appMeta`** (einschließlich Seed-Version).
  Ohne Profil steht `profile` auf `null`. Unbekannte Versionen, fehlende Felder, doppelte IDs,
  unzulässige Werte, inkonsistente Punkte und defekte Portionsverweise werden abgewiesen.
- Lebensmittel in historischen Einträgen bleiben dank Snapshot auch nach Änderung/Löschung gültig.
  Punkte werden je Eintrag aufgerundet. Fehlende Nährwerte bleiben sichtbar unvollständig.
- Daten regelmäßig unter **Profil/Einstellungen → Daten exportieren** sichern. Browserdaten löschen
  oder Geräteverlust kann lokale Daten unwiederbringlich entfernen.

## Basisliste und Quellen

**Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0 — Deutsche
Nährstoffdatenbank. Karlsruhe.** DOI:
[10.25826/Data20251217-134202-0](https://doi.org/10.25826/Data20251217-134202-0).
Lizenz: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.de).
Die Namensnennung ist auch in der App unter „Über / Datenquellen“ enthalten.

Die [versionierte Seed-Datei](src/data/seed/foods.json) ist eine kuratierte Auswahl aus dem offiziellen
[BLS-4.0-Download](https://blsdb.de/download), Archiv `BLS_4_0_2025_DE.zip`, Arbeitsmappe
`BLS_4_0_Daten_2025_DE.xlsx`. Die Originalwerte der Spalten `ENERCC`, `FASAT`, `SUGAR`,
`PROT625` werden unverändert übernommen, identifiziert über den jeweiligen BLS-Code.
SHA-256 des verwendeten Archivs:
`12b7a6ba62807ec9b301eb276f897dc85f99b2292311618dec3749a12d984c91`.

Änderungen gegenüber der Datenquelle: Auswahl, Kategorien, eigenständige 0-Punkte-Zuordnung und
kuratierte Standardportionen. Portionsrichtwerte stammen aus Konzept 05.3.2:
Scheibe Brot 45 g, Ei 55 g, Apfel 150 g, Esslöffel Öl 10 g, Becher Joghurt 150 g.
Für Haferflocken sind 50 g vorausgewählt, sonst 100 g als direkt anpassbare Ausgangsmenge.
Dies sind **keine behaupteten BLS-Haushaltsmaße**.
Eigene Portionen können ergänzt und als Standard festgelegt werden; ohne belastbare Umrechnungsmenge
bleibt eine Portion nicht auswählbar.

BLS-Nährwerte sind je **100 g**, auch bei Flüssigkeiten. Es wird keine Dichte geschätzt;
Milliliter stehen bei entsprechend angelegten eigenen Lebensmitteln zur Verfügung.
Die Rechenbeispiele des Konzepts sind separate Testfixtures; echte BLS-Werte können davon abweichen
(z. B. Hafer Flocken: 348 kcal/100 g, 50 g ergeben 5 Punkte). Magerquark wird als Formelbeispiel
ohne 0-Punkte-Ausnahme getestet, in der Basisliste aber gemäß der kuratierten Regel mit 0 bewertet.

## Architektur

- `src/domain/`: reine Fachfunktionen, ohne UI-/Speicherabhängigkeiten.
- `src/data/`: validierte Entitäten, IndexedDB-Repository, Seed und Sicherungsformat.
- `src/app/`: Laden/Speichern, Fehlerzustand und Formatierung.
- `src/ui/`: React-Seiten und wiederverwendbare Komponenten; Diagramm als leichtgewichtiges SVG.
- `public/` und Vite-PWA-Konfiguration: lokale Installationsicons, Manifest und generierter Service Worker.
- `tests/`: Unit-, Integrations-, Komponenten- und E2E-Tests.

## Dokumentation

- [Umsetzungskonzept](docs/konzept/00-uebersicht.md) – verbindliches, ausführliches Konzept für die Neuentwicklung inklusive Punkte- und Budgetlogik, Datenmodell, Offline-Architektur, Testkonzept und MVP-Backlog.
- [Vorbereitung zur Konzept-Neuerstellung](docs/konzept-neuerstellung-vorbereitung.md) – bisherige Anforderungen, Entscheidungen, offene Fragen und Erkenntnisse zum Prototyp.
