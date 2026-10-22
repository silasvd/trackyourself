# 08 – Testkonzept

Dieses Kapitel beschreibt die tatsächlich eingerichteten Testarten und die dazugehörigen
Testfälle. Testdateien liegen in `tests/unit`, `tests/component` und `tests/e2e`.

## 8.1 Teststrategie (Testpyramide)

1. **Unit-Tests (Schwerpunkt):** reine Domänenlogik (Punkte, Budget, Tagesreste, Aktivität,
   Rundung). Schnell, zahlreich, deterministisch.
2. **Integrationstests:** Repository-/Persistenzschicht (IndexedDB) und Export/Import, gegen eine
   In-Memory-/Fake-IndexedDB.
3. **Komponententests:** zentrale UI-Bausteine (Dashboard-Status, Erfassungsformular,
   Gewichtsdiagramm) mit React Testing Library.
4. **E2E-Tests (wenige, wichtige Flows):** durchgehende Nutzerflows mit Playwright.

## 8.2 Werkzeuge

- **Vitest** – Unit-/Integrations-/Komponententests.
- **React Testing Library** – nutzerzentrierte Komponententests.
- **Playwright** – E2E inkl. Offline-Szenario und PWA-Verhalten.
- **Fake-IndexedDB** (In-Memory-Implementierung) – für Persistenztests ohne echten Browser.

## 8.3 Abdeckungsziele

- Domänenschicht (`src/domain/**`): **100 % der Zweige** der Rechenregeln; jede in Dok. 04 genannte
  Regel hat mindestens einen Testfall inkl. Grenz- und Sonderfällen.
- Repository-/Backup-Schicht: Lese-/Schreib-/Migrations- und Import/Export-Pfade abgedeckt.
- UI: kritische Statusanzeigen und Formularvalidierung abgedeckt.
- Richtwert Gesamtprojekt: ≥ 80 % Zeilenabdeckung, bei 100 % in der Domäne.

## 8.4 Konkrete Testfälle – Lebensmittel-Punkte (Dok. 04.1)

| # | Eingabe | Erwartung |
| --- | --- | --- |
| P1 | Haferflocken /100 g (370/1,3/1,0/13,5), 50 g | `P100 ≈ 10,37`, `P_roh ≈ 5,18`, **Punkte = 6** |
| P2 | Olivenöl /100 g (884/14/0/0), 10 g | **Punkte = 4** |
| P3 | Magerquark /100 g (67/0,1/4/12), 200 g | **Punkte = 3** |
| P4 | 0‑Punkte-Lebensmittel (Apfel), 150 g | **Punkte = 0** (Formel wird übersprungen) |
| P5 | `P_roh = 0,1` | **Punkte = 1** (Aufrunden, Anti-Schummel) |
| P6 | `P_roh = 3,0` | **Punkte = 3** (keine Aufrundung bei exakt ganzzahlig) |
| P7 | `P_roh = 3,01` | **Punkte = 4** |
| P8 | künstlich negativer Wert (`P_roh < 0`) | **Punkte = 0** (Kappen vor Aufrunden) |
| P9 | `kcal` fehlt | „nicht berechenbar"; Eintrag unvollständig, zählt mit 0 |
| P10 | nur `protein` fehlt | fehlender Summand = 0; Eintrag als „geschätzt/unvollständig" markiert |
| P11 | Menge 0 g | **Punkte = 0** |

## 8.5 Konkrete Testfälle – Tagesbudget (Dok. 04.2)

| # | Profil | Erwartung |
| --- | --- | --- |
| B1 | männlich, nicht stillend, 34 J., Aktivität 1, 185 cm, 95 kg | roh 35,5 → **Tagesbudget 36**, **Wochen 50** |
| B2 | weiblich, nicht stillend, 30 J., Aktivität 2, 165 cm, 70 kg | roh 24,25 → **Tagesbudget 24**, **Wochen 34** |
| B3 | Alter genau 27 | Altersbonus **3** (Grenze `< 27` greift nicht mehr) |
| B4 | Alter 26 | Altersbonus **4** |
| B5 | Alter 58 | Altersbonus **0** |
| B6 | Größe 154 / 155 / 179 / 180 cm | **0 / 1 / 1 / 2** (Grenzen, keine Lücke bei 179) |
| B7 | Stillen = true | zusätzlich **+10** |
| B8 | Gewicht 45 kg / 49 kg | Gewichtsanteil **0** / **1** (`(49−45)/4`) |
| B9 | Aktivität 0/1/2/3 | Beitrag **0/2/4/6** |
| B10 | `dailyBudgetOverride = 30` gesetzt | Budget **= 30** (Berechnung ignoriert, keine Hinweise) |

## 8.6 Konkrete Testfälle – Tagesreste & Wochenextras (Dok. 04.3)

| # | Szenario | Erwartung |
| --- | --- | --- |
| W1 | Tagesbudget 24, verbraucht 22, Tag abgeschlossen | Tagesrest 2, Übertrag **2** |
| W2 | verbraucht 24 | Übertrag **0** |
| W3 | verbraucht 10 (Rest 14) | Übertrag **4** (Deckel), 10 verfallen |
| W4 | Tag ohne Einträge, abgeschlossen | Übertrag **min(4, Budget)** = 4 |
| W5 | Mo 2, Di 0, Mi 4 übertragen; Grundwert 34 | Wochenextras **40** |
| W6 | heutiger Tag | kein Vorab-Übertrag des heutigen Tages |
| W7 | zukünftiger Tag | **kein** Übertrag |
| W8 | Verbrauchsreihenfolge: Tagesbudget zuerst, dann Wochenextras | korrekt abgebucht |
| W9 | rückwirkende Änderung eines Vortags | Tagesrest/Übertrag/Wochenextras **neu berechnet** |
| W10 | Wochenwechsel (Montag) | Wochenextras auf Grundwert zurückgesetzt |

## 8.7 Konkrete Testfälle – Aktivitätspunkte (Dok. 04.4)

| # | Eingabe | Erwartung |
| --- | --- | --- |
| A1 | 60 Min. „medium" | **4** |
| A2 | 45 Min. „medium" | **3** (`0,75×4=3`) |
| A3 | 30 Min. „low" | **1** (`0,5×2=1`) |
| A4 | 30 Min. „high" | **3** (`0,5×6=3`) |
| A5 | Aktivität ändert Essensbudget | **nein** (nur Anzeige im MVP) |

## 8.8 Konkrete Testfälle – Portionen (Dok. 05.3)

| # | Szenario | Erwartung |
| --- | --- | --- |
| PT1 | Alltagseinheit mit `grams` (1 Scheibe = 45 g), 2 Scheiben | Menge **90 g** |
| PT2 | Alltagseinheit ohne `grams` | Umrechnung **nicht möglich**; nur g/ml-Eingabe |
| PT3 | eigene Portion anlegen und wiederverwenden | Portion bleibt erhalten |
| PT4 | Standardportion vorausgewählt (ohne Historie) | korrekt im Formular gesetzt |
| PT5 | Lebensmittel erneut wählen | zuletzt verwendete Menge und Einheit vorausgewählt |

## 8.9 Konkrete Testfälle – Persistenz & Export/Import (Dok. 03/06)

| # | Szenario | Erwartung |
| --- | --- | --- |
| D1 | Eintrag speichern, neu laden | Eintrag bleibt erhalten (IndexedDB) |
| D2 | Food löschen, alter DiaryEntry | bleibt dank `foodSnapshot` korrekt |
| D3 | Export → Import in leere DB | identischer Datenbestand |
| D4 | Import einer fehlerhaften Datei | Abweisung, bestehende Daten unverändert |
| D5 | Seed beim ersten Start | Basisliste eingespielt, `seededBaseFoodsVersion` gesetzt |
| D6 | Seed bei bereits vorhandener aktueller Version | kein erneutes/duplizierendes Einspielen |
| D7 | Schemamigration (DB v1→v3, v2→v3; Sicherung v2→v3) | Daten erhalten, Store `mealTemplates` ergänzt |
| D8 | Seed-Version 1 → 2 | fehlende Basislebensmittel ergänzt, bestehende/geänderte unverändert |
| D10 | Seed-Version 2 → 3 und 3 → 4 | unveränderte Basisnamen und passende Snapshots umbenannt; eigene Namen, Punkte unverändert; als Version 3 markierte Daten mit BLS-Namen werden nachträglich umbenannt |
| D9 | Validierung Rezepte/Vorlagen/Suchbegriffe | unbekannte/verschachtelte Zutaten, leere Vorlagen und leere Begriffe abgewiesen |

## 8.9a Konkrete Testfälle – Suche, Basisliste, Rezepte, Vorlagen (Dok. 05)

| # | Szenario | Erwartung |
| --- | --- | --- |
| S1 | Groß-/Kleinschreibung, Umlaute, ß, Akzente, Satzzeichen | werden ignoriert (ü = ue, ß = ss) |
| S2 | Suche nach Synonym der Basisliste bzw. eigenem Suchbegriff | Lebensmittel gefunden |
| S3 | Plural/Flexion („Kartoffel", „Bohne") | gefunden über Wortstamm |
| S4 | mehrere Wörter, beliebige Reihenfolge, Leerzeichen | alle Wörter müssen passen |
| S5 | ein Tippfehler ab 5 Zeichen („Brokoli") | gefunden; kurze Wörter nicht |
| S6 | Eingaben < 3 Zeichen | nur am Wortanfang |
| S7 | Rangfolge exakter Name → Synonym → Präfixe → Wortanfänge → Rest | wie Dok. 05, 5.2.3 |
| S8 | Gleichstand | Favoriten, dann kürzerer Name, dann alphabetisch |
| S9 | leere Suche | Favoriten zuerst, dann zuletzt verwendet, dann alphabetisch |
| C1 | Alltagsbegriffe auf echter Basisliste (Nudeln, Kartoffeln, Hafermilch, Hackfleisch …) | sinnvoller erster Treffer (z. B. Nudeln → „Nudeln, gekocht") |
| C2 | Zubereitete Formen und Gerichte | gekochte Varianten, Chili con carne u. a. vorhanden |
| C3 | jedes Basislebensmittel | über eigenen Namen auffindbar, Portion mit Gewicht |
| C4 | jedes Basislebensmittel | hat Suchbegriffe |
| C5 | Anzeigenamen | eindeutig, alltagstauglich; BLS-Bezeichnung weiterhin suchbar |
| R1 | Gesamtgewicht | Summe der Zutaten bzw. Gewicht fertig gekocht |
| R2 | 0‑Punkte-Zutat | zählt Gewicht, keine Punkte |
| R3 | fehlender Nährwert einer zählenden Zutat | Rezeptwert bleibt unbekannt |
| R4 | Portionen | „Portion (1/n)" Standard, „Ganzes Rezept" |
| R5 | Punkte einer Portion | entsprechen dem Zutatenanteil |
| R6 | Zutat ändert sich | Rezepte neu berechnet, andere Lebensmittel unverändert |
| R7 | Verwendungsprüfung | Rezepte mit einer Zutat ermittelt |
| T1 | Vorlage aus Mahlzeit | gelöschte Lebensmittel übersprungen |
| T2 | Vorlage eintragen | aktuelle Nährwerte, neu berechnete Punkte |
| T3 | Vom Vortag übernehmen | Snapshot und Punkte unverändert |
| T4 | Mengenvorschlag | zuletzt gespeicherter Eintrag des Lebensmittels |
| T5 | „zuletzt verwendet" | nur verwendete Lebensmittel markiert |
| T6 | Punkte einer Vorlage | Summe mit aktuellen Nährwerten, gelöschte Lebensmittel zählen 0 |
| T7 | Lebensmittel/Rezept löschen | Portionen und Vorlagenpositionen entfernt, leere Vorlagen entfallen |

## 8.10 Komponententests (Beispiele)

- Dashboard zeigt Budget, verbraucht und verbleibend korrekt und nur als Tagespunkte;
  Wochenextras getrennt.
- Statusfarben werden stets von Text/Zahl begleitet (kein Farbzwang).
- Erfassungsformular: Live-Punkteanzeige, Validierung negativer/leerer Eingaben.
- Schnellerfassung: „Zu Mahlzeit hinzufügen", Synonymsuche, „Speichern und weiter",
  Mengenvorschlag, eigene Suchbegriffe.
- Vorlagen: vom Vortag übernehmen, als Vorlage speichern, Positionen abwählen/ändern, eintragen,
  löschen.
- Rezepte: anlegen mit Live-Vorschau, eintragen, Neuberechnung nach Zutatenänderung, Schutz vor
  Löschen verwendeter Zutaten, Bereinigung von Vorlagen.
- Auswahldialog: Filter-Chips, beim Tippen ausgeblendete Chips und „+ Neu"-Menü, aktiver Filter
  als aufhebbarer Chip.
- Bereich „Rezepte & Vorlagen": leere Zustände, Auflistung mit Punkten und Inhalt, Vorlage
  umbenennen und eintragen, Rezept bearbeiten und löschen, Vorlage löschen.
- Gewichtsdiagramm: Veränderung seit erstem und letztem Eintrag korrekt.

## 8.11 E2E-Flows (Playwright)

- **E1:** Profil anlegen → Budget erscheint → Lebensmittel eintragen → Dashboard aktualisiert.
- **E2:** Eintrag bearbeiten/löschen → Tages- und Wochenstatus aktualisieren.
- **E3:** Früheren Tag korrigieren → Wochenextras passen sich an.
- **E4:** Offline-Betrieb → App startet und funktioniert ohne Netzwerk; Einträge bleiben erhalten.
- **E5:** Export → Daten löschen → Import → Zustand vollständig wiederhergestellt.
- **E6:** Gewicht erfassen → Verlauf/Diagramm aktualisiert.
- **E7:** Synonymsuche (Nudeln, Kartoffeln, Hackfleisch, Hafermilch) → Porridge mit „Speichern und
  weiter" → als Vorlage speichern → nächster Tag „Vom Vortag übernehmen" → Folgetag Vorlage
  eintragen → Folgetag Vorlage über „Rezepte & Vorlagen" eintragen.
- **E8:** Chili-Rezept aus Basiszutaten anlegen → Portion eintragen → Rezept in der Suche und in
  „Rezepte & Vorlagen" mit Punkten pro Portion und Zutaten.
- **E9:** Speichern funktioniert ohne `crypto.randomUUID` (HTTP im WLAN, z. B. iPhone).
- **E10:** Mobiler Auswahldialog: alle Eingabefelder ≥ 16 px (kein iOS-Fokus-Zoom), Treffer
  stehen direkt unter dem Suchfeld im sichtbaren Bereich.

## 8.12 Testdaten & Determinismus

- Feste, dokumentierte Beispielprofile und -lebensmittel (u. a. die Beispiele aus Dok. 04).
- Datum/Zeit in Tests fixieren (z. B. fester „heute"-Wert), damit Tagesreste-/Wochenlogik
  deterministisch ist.
- Keine Netzwerkabhängigkeit in Unit-/Integrationstests.

## 8.13 Ausführung & CI

- **Lokal:** Test-, Lint- und Build-Skripte über die Paketskripte ausführbar.
- **CI (GitHub Actions):** bei jedem Push/PR: Install → Lint → Typecheck → Unit/Integration/Component
  → Build → E2E. Abdeckungsbericht wird erzeugt; die Domänenabdeckung (100 %) ist Mindestbedingung.
- Fehlende/instabile Tests blockieren den Merge.
