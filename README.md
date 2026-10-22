# TrackYourself

Eine deutschsprachige, offlinefähige Progressive Web App für Lebensmittel, Punkte, Aktivitäten
und Gewicht. Alle Daten bleiben lokal in IndexedDB: kein Konto, Backend, Tracking oder Sync.

## Funktionsumfang

Der verbindliche MVP aus dem [Umsetzungskonzept](docs/konzept/00-uebersicht.md) (AP0–AP11) ist
implementiert, ergänzt um Schnellerfassung und eine erweiterte Basisliste (AP12):

- Profil mit berechneten und unabhängig überschreibbaren Tages-/Wochenbudgets.
- 201 kuratierte BLS-4.0-Lebensmittel in 18 Kategorien (inkl. gegarter Formen, Hackfleisch,
  Pflanzendrinks, Brot, Saucen und fertiger Gerichte), eigene Lebensmittel, Favoriten, zuletzt
  verwendete Lebensmittel und wiederverwendbare Portionen.
- Fehlertolerante Suche mit Alltagsnamen/Synonymen (z. B. Nudeln, Hafermilch, Hack), eigenen
  Suchbegriffen, Pluralformen und einfachen Tippfehlern.
- EAN-/UPC-Scan per Kamera oder manueller Barcodeeingabe, Open-Food-Facts-Anbindung und
  dauerhafter lokaler Produktcache, inklusive Herstellerportionen und gekennzeichneter Schätzportionen.
- Rezepte aus mehreren Zutaten mit Punkten pro Portion, Mahlzeit-Vorlagen, eigene Übersicht
  „Rezepte & Vorlagen“, „Vom Vortag übernehmen“, „Speichern und weiter“ und Vorschlag der zuletzt verwendeten Menge.
- Datum und Mahlzeiten, Live-Punkte, Einträge bearbeiten/löschen, historische Lebensmittel-Snapshots.
- Tagesstatus und getrennte Wochenextras, begrenzte Tagesreste, rückwirkende Neuberechnung.
- Aktivitäten ohne Budgetanrechnung; Gewichtsverlauf mit Diagramm, Tabelle und Veränderungswerten.
- Installierbare PWA mit Offline-Start und lokalem JSON-Export/-Import mit Bestätigung und Validierung.
- Mobile Darstellung, beschriftete Eingaben, Tastaturbedienung und textuelle Statusanzeigen.

Die ausdrücklich später geplanten Funktionen (Online-Textsuche, Cloud-Sync, Gamification usw.)
sind nicht Teil des MVP.

### Barcode und Portionen

Unter „Lebensmittel hinzufügen → Barcode scannen“ die Kamera starten oder die Nummer eingeben.
Die Kamera benötigt HTTPS (oder localhost) und eine Browserberechtigung. Die Bilder werden
ausschließlich auf dem Gerät ausgewertet; die Scannerbibliothek ist Teil der offline gespeicherten App.
Über unverschlüsseltes LAN-HTTP bleibt die manuelle Eingabe nutzbar; zum Testen im WLAN siehe
„HTTPS im WLAN für den Kamera-Scan“ weiter unten.

Vor jedem Onlineabruf wird der lokale Lebensmittelbestand geprüft. Bekannte Produkte benötigen
auch nach einem Neustart keine Onlineabfrage. Unbekannte Produkte werden gezielt über die
Open-Food-Facts-API v3 abgerufen; dabei werden nur Barcode und technische Verbindungsdaten
übertragen, keine Profil- oder Tagebuchdaten. Erfolgreiche Abrufe werden vor der Buchung in
IndexedDB gespeichert und mit exportiert/importiert. Es gibt keine automatische Aktualisierung.
Unter „Gescannt“ sind sie auffindbar und bearbeitbar. Löschen entfernt auch den lokalen Cacheeintrag.
UPC-A und entsprechende EAN-/GTIN-Darstellungen werden vereinheitlicht.

Die Punkte verwenden dasselbe Modell wie die übrigen Lebensmittel. Energie in kJ wird bei
fehlenden kcal umgerechnet. Fehlende andere Nährwerte bleiben sichtbar unvollständig;
ohne Produktnamen oder Energie wird kein Produkt gespeichert. Fehler, Zeitüberschreitungen,
unbekannte Barcodes und Abfragelimits werden angezeigt; manuelles Anlegen bleibt möglich.

Herstellerportionen und Packungsmengen werden übernommen, sofern Menge und Einheit vorliegen.
Zusätzlich gibt es passende **geschätzte** Alltagseinheiten, z. B. dünne/dicke Scheiben
Aufschnitt (10/20 g), Schnittkäse (25 g), Brot (45 g), Joghurtbecher (150 g) oder eine
Handfläche rohes Hackfleisch (100 g). Diese Werte sind keine produktspezifischen Messungen.
Die Auswahl zeigt immer die Umrechnungsmenge; über „Bearbeiten“ lassen sich alle Portionen
anpassen. Nährwerte und Herstellerangaben mit der Verpackung vergleichen.

Für Hackfleisch **in einer Soße** ein Rezept mit den Mengen des gesamten Topfes und der
Portionsanzahl anlegen. Beispiel: 500 g Hackfleisch auf 4 gleich große Portionen verteilen,
anschließend eine Rezeptportion buchen. Sie enthält rechnerisch 125 g Hackfleisch plus die
übrigen anteiligen Zutaten. Der Barcode allein kann die Zusammensetzung des Tellers nicht bestimmen.

Produktdaten: [Open Food Facts](https://world.openfoodfacts.org/),
Lizenz [ODbL](https://opendatacommons.org/licenses/odbl/1-0/).
Vor öffentlichem Betrieb die [Nutzungsbedingungen](https://world.openfoodfacts.org/terms-of-use)
beachten und die Anwendung über das in der
[API-Dokumentation](https://openfoodfacts.github.io/openfoodfacts-server/api/) verlinkte Formular
anmelden. Die App führt nur explizite Einzelabfragen durch, keine Online-Suche beim Tippen.

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
Updates werden automatisch geladen und aktiviert, ohne Nutzerdaten zu löschen: beim Start, beim
Zurückkehren in die App und stündlich. Die Seite lädt dabei einmal neu; nicht gespeicherte
Eingaben gehen dann verloren. Ganz unten im Profil stehen Version, Commit und Build-Zeitpunkt, so
lässt sich der Stand prüfen. Nach `git commit` den Build wiederholen, damit der Commit stimmt.

### Auf dem Smartphone im WLAN testen

Rechner und Smartphone müssen im selben WLAN sein. Am einfachsten mit dem Skript (PowerShell 7
`pwsh` unter Windows, macOS oder Linux; Windows PowerShell 5.1 geht ebenfalls):

```powershell
./Run.ps1              # installiert bei Bedarf Abhängigkeiten, baut und startet die Vorschau
./Run.ps1 -Port 5000   # anderer Port
./Run.ps1 -SkipBuild   # vorhandenen Build in dist/ verwenden
./Run.ps1 -Https       # HTTPS mit selbstsigniertem Zertifikat (für den Kamera-Scan)
```

Falls Windows die Ausführung blockiert: `powershell -ExecutionPolicy Bypass -File .\Run.ps1`.
Manuell geht dasselbe mit:

```sh
npm run build
npm run preview:lan        # = vite preview --host 0.0.0.0 --port 4173
npm run preview:lan:https  # dasselbe über HTTPS mit selbstsigniertem Zertifikat
```

Dann auf dem Smartphone `http://<IP-des-Rechners>:4173` öffnen (das Skript zeigt die Adressen an).
Die Firewall-Abfrage für Node.js beim ersten Start erlauben. Einschränkungen dieses Modus:

- Über `http://` mit LAN-Adresse ist die Seite **kein sicherer Kontext**. Der Service Worker
  startet deshalb nicht: Die App läuft vollständig, aber **nicht offline**. Für Offline-Betrieb und
  Dauernutzung über HTTPS bereitstellen (z. B. GitHub Pages, Netlify, Cloudflare Pages).
- Die **Barcode-Kamera** braucht ebenfalls einen sicheren Kontext. Über `http://` bleibt nur die
  Barcode-Eingabe von Hand.
- Daten liegen pro Adresse getrennt im Browser des Smartphones. Beim Wechsel von Adresse oder
  Hosting mit **Daten exportieren/importieren** umziehen.

**HTTPS im WLAN für den Kamera-Scan:** `./Run.ps1 -Https` bzw. `npm run preview:lan:https` erzeugt
beim ersten Start ein selbstsigniertes Zertifikat (gespeichert in `node_modules/.vite/basic-ssl`,
ca. 30 Tage gültig, wird danach automatisch erneuert). Auf dem Smartphone
`https://<IP-des-Rechners>:4173` öffnen und die Zertifikatswarnung bestätigen (Safari: „Details
einblenden“ › „Diese Website besuchen“). Danach funktionieren Kamera und Barcode-Erkennung.
Einschränkungen: Weil das Zertifikat nicht vertrauenswürdig ist, startet der Service Worker in der
Regel nicht (kein Offline-Modus, keine App-Installation), und `https://` gilt als andere Adresse als
`http://` – vorhandene Einträge per Export/Import übernehmen.

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
Playwright prüft E1–E10 aus dem Testkonzept sowie Tastaturfokus und mobiles Layout, gegen den
Produktionsbuild mit echtem Service Worker. Mobile Emulation ersetzt keinen Test auf echten
iOS-/Android-Geräten.

## Daten und Sicherungen

- IndexedDB-Schema **3**: acht Entity-Stores (inkl. `mealTemplates`); Migrationen von Schema 1/2
  ergänzen Indizes und den Vorlagen-Store ohne Datenverlust.
  Favoriten werden im Repository-Datenbestand gefiltert, weil IndexedDB keine booleschen Indexschlüssel unterstützt.
- Jede Änderung und jeder Import ersetzt den Datenbestand in **einer Transaktion**. Auch bei
  synchronen Schreibfehlern erfolgt ein Rollback. Konflikte durch einen anderen Tab werden
  gemeldet, statt dessen Änderungen zu überschreiben.
- Abgeleitete Budgets und Wochenwerte werden nicht gespeichert. Änderungen am Profil wirken auch
  auf historische Budgetanzeigen; Gewichtsaufzeichnungen ändern das Profilbudget nicht automatisch.
- Sicherungen enthalten `schemaVersion`, `exportedAt`, Profil, Lebensmittel (inkl. Rezepte und
  eigener Suchbegriffe), Portionen, Tagebuch, Aktivitäten, Gewicht, Mahlzeit-Vorlagen **und
  `appMeta`** (einschließlich Seed-Version). Sicherungen der Version 2 werden beim Import migriert.
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
Die Erweiterung (Seed-Versionen 2 und 3) stammt aus derselben Arbeitsmappe über OpenAgrar
(`openagrar_mods_00112643`, SHA-256 der Arbeitsmappe
`524bbefe25b691f5cb3de7a9f3e27fa2967aebfeabf217d99414ba7806e78c60`); alle 201 Einträge stimmen mit
ihr überein.

Die Seed-Datei wird mit [`scripts/build-food-seed.py`](scripts/build-food-seed.py) erzeugt
(Python 3 mit `openpyxl`):

```sh
python3 scripts/build-food-seed.py /pfad/zu/BLS_4_0_Daten_2025_DE.xlsx
npx prettier --write src/data/seed/foods.json
```

Das Skript enthält Auswahl, Kategorien, Standardportionen, 0-Punkte-Zuordnung, Suchbegriffe und
alltagstaugliche Anzeigenamen (z. B. „Nudeln, gekocht“ statt „Teigwaren eifrei, gekocht“). Die
BLS-Bezeichnung bleibt als `blsName` erhalten und ist in der App weiterhin suchbar.
Bestehende Einträge bleiben unverändert, neue BLS-Codes werden ergänzt. Bei Änderungen
`seedVersion` in `src/data/seed/index.ts` erhöhen; bestehende Installationen erhalten dann
fehlende Basislebensmittel (ab Seed-Version 3 auch neue Anzeigenamen für unveränderte Einträge; aktuell Version 4),
ohne eigene Änderungen zu verlieren.

Änderungen gegenüber der Datenquelle: Auswahl, Kategorien, eigenständige 0-Punkte-Zuordnung,
alltagstaugliche Anzeigenamen und kuratierte Standardportionen. Portionsrichtwerte stammen aus Konzept 05.3.2:
Scheibe Brot 45 g, Ei 55 g, Apfel 150 g, Esslöffel Öl 10 g, Becher Joghurt 150 g.
Für Haferflocken sind 50 g vorausgewählt; weitere Richtwerte (z. B. Glas Getränk 200 ml,
Beilagenportion gegart 200 g, Dose Hülsenfrüchte 250 g abgetropft) sind im Generator-Skript
dokumentiert, sonst gelten 100 g als direkt anpassbare Ausgangsmenge.
Dies sind **keine behaupteten BLS-Haushaltsmaße**.
Eigene Portionen können ergänzt und als Standard festgelegt werden; ohne belastbare Umrechnungsmenge
bleibt eine Portion nicht auswählbar.

BLS-Nährwerte sind je **100 g**, auch bei Flüssigkeiten. Es wird keine Dichte geschätzt;
Milliliter stehen bei entsprechend angelegten eigenen Lebensmitteln zur Verfügung.
Die Rechenbeispiele des Konzepts sind separate Testfixtures; echte BLS-Werte können davon abweichen
(z. B. Haferflocken: 348 kcal/100 g, 50 g ergeben 5 Punkte). Magerquark wird als Formelbeispiel
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
