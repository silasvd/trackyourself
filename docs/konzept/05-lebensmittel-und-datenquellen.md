# 05 – Lebensmittel & Datenquellen

## 5.1 Erfassungswege

1. **Basislebensmittel:** Eine mit der App ausgelieferte, lokale Referenzliste häufiger
   Grundnahrungsmittel mit Nährwerten. Damit sind Grundnahrungsmittel ohne Internet und ohne
   Barcode sofort auswählbar.
2. **Eigene Lebensmittel:** Nutzer legen Lebensmittel mit Nährwerten selbst an und verwenden sie
   wieder (Flow B, Dok. 02).
3. **Rezepte:** Gerichte aus mehreren Zutaten (Basis- oder eigene Lebensmittel) werden einmal mit
   Grammangaben und Portionszahl angelegt und danach wie ein einzelnes Lebensmittel eingetragen
   (Abschnitt 5.6, Flow I in Dok. 02).
4. **Mahlzeit-Vorlagen und Vortag:** wiederkehrende Mahlzeiten (z. B. Porridge mit Hafermilch)
   werden als Vorlage gespeichert oder vom Vortag übernommen (Abschnitt 5.7, Flow J in Dok. 02).
5. **Barcode-Erfassung:** Kamera oder manuelle Eingabe. Unbekannte Barcodes werden gezielt bei
   Open Food Facts abgefragt; erfolgreiche Produkte werden lokal gespeichert (Abschnitt 5.8).

## 5.2 Datenquelle der Basisliste: BLS 4.0

- **Quelle:** Bundeslebensmittelschlüssel (BLS), **Version 4.0**, bereitgestellt vom
  **Max Rubner-Institut (MRI)**.
- **Lizenz:** Open Data unter **CC BY 4.0**. Nutzung (auch eingebettet in die App) ist zulässig; es
  besteht die **Pflicht zur Quellennennung** des Max Rubner-Instituts.
- **Nur Version 4.0 verwenden.** Frühere Versionen (3.x) hatten einschränkende/kostenpflichtige
  Lizenzbedingungen und dürfen nicht genutzt werden.

### 5.2.1 Umsetzungsregeln für die Basisliste

- Aus BLS 4.0 wird eine **kuratierte Teilmenge** häufiger Grundnahrungsmittel abgeleitet und als
  statische Datei mit der App ausgeliefert (Seed, Dok. 06).
- Je Lebensmittel werden mindestens gespeichert: Name, Kategorie, Nährwerte je 100 g/ml
  (kcal, gesättigte Fette, Zucker, Protein), Basis (g/ml), Quellenverweis (`sourceRef` =
  BLS-Kennung), Datenqualität.
- **Pflichtangabe in der App:** An gut auffindbarer Stelle (z. B. Einstellungen → „Über/Datenquellen")
  wird der BLS 4.0 als Quelle und das Max Rubner-Institut genannt (CC BY 4.0). Dies ist eine
  Lizenzpflicht, kein verunsichernder Hinweis und erscheint nicht in den Erfassungsflows.
- **Anzeigenamen statt BLS-Bezeichnungen:** Die BLS-Namen sind fachlich, aber im Alltag schwer
  verständlich („Teigwaren eifrei, gekocht", „Eierteigwaren roh", „Hühnerei roh"). Jedes
  Basislebensmittel erhält daher einen alltagstauglichen Anzeigenamen („Nudeln, gekocht",
  „Eiernudeln, roh", „Ei, roh"). Regeln: gebräuchliches Wort zuerst; Zubereitungszustand nach
  Komma; „roh" entfällt bei Obst und Gemüse, das nur roh geführt wird; Fettstufen nur, wo sie
  Varianten unterscheiden; Namen sind eindeutig. Die BLS-Bezeichnung bleibt als `blsName` in der
  Seed-Datei erhalten, ist weiterhin suchbar und wird beim Bearbeiten unter „Bereits auffindbar
  unter" angezeigt; die Zuordnung zur Quelle erfolgt über `sourceRef` (BLS-Code).
- **Zubereitungszustand:** Wo relevant, wird roh/gekocht im Namen kenntlich gemacht (z. B. „Reis,
  gekocht"), da sich Nährwerte je 100 g unterscheiden.
- **Zubereitete Varianten:** Lebensmittel, die überwiegend gegart gegessen werden, sind zusätzlich
  in der gegarten Form enthalten (z. B. Kartoffeln gekocht/Pellkartoffeln/Bratkartoffeln, Nudeln
  und Reis gekocht), damit beim Eintragen nicht umgerechnet werden muss.

### 5.2.2 Abdeckung der Basisliste

Die Basisliste umfasst **201 Einträge** in 18 Kategorien (Seed-Version 4). Sie deckt neben
Grundzutaten (Kartoffeln, Nudeln, Reis, Haferflocken, Brot, Eier, Milch, Joghurt, Käse, Obst,
Gemüse, Hülsenfrüchte, Fleisch inkl. Hackfleisch von Rind, Schwein und gemischt, Fisch, Öle, Zucker,
Mehl) auch typische Alltagsprodukte ab: Pflanzendrinks (Hafer, Soja, Mandel), Brot und Backwaren,
Wurst und Aufschnitt, Saucen und Würzmittel, Nüsse und Samen, Süßes und Snacks, Getränke sowie
gängige fertige Gerichte (z. B. Chili con carne, Spaghetti Bolognese, Kartoffelsalat), deren
Nährwerte das BLS als Rezeptur führt.

**Generator:** `scripts/build-food-seed.py` erzeugt `src/data/seed/foods.json` direkt aus der
BLS‑4.0‑Datei (`BLS_4_0_Daten_2025_DE.xlsx`, OpenAgrar `openagrar_mods_00112643`). Die Auswahl
(BLS-Code, Kategorie, Standardportion, 0‑Punkte, Suchbegriffe, Anzeigename) ist im Skript
dokumentiert;
Nährwerte stammen ausschließlich aus dem BLS. BLS-Codes sind stabile IDs: Bestehende Einträge
bleiben beim erneuten Lauf unverändert, neue Codes werden ergänzt.

**Auslieferung an bestehende Installationen:** Erhöht sich die Seed-Version, ergänzt die App nur
fehlende Basislebensmittel (per ID). Ab Seed-Version 3 ersetzt sie zusätzlich die bisher angezeigten
BLS-Bezeichnungen durch die Anzeigenamen – nur, wenn der Name noch unverändert ist – und passt den
Namen in Tagebuch-Snapshots dieser Lebensmittel an (Nährwerte und Punkte bleiben unverändert). Vom
Nutzer umbenannte oder gelöschte Basislebensmittel bleiben unangetastet. Die Umbenennung läuft bei
jeder höheren Seed-Version erneut; Seed-Version 4 holt sie für Installationen nach, die Version 3
ohne Umbenennung erhalten hatten.

### 5.2.3 Suche und Suchbegriffe

Die Suche findet Alltagsbegriffe und Synonyme, nicht nur den Anzeigenamen; auch die
ursprüngliche BLS-Bezeichnung („Teigwaren eifrei, gekocht") bleibt ein Suchbegriff.

- **Suchbegriffe (Aliase):** Jedes Basislebensmittel führt Alltagsnamen und Synonyme (z. B. Nudeln,
  Pasta, Spaghetti; Hafermilch; Hack, Faschiertes). Sie werden mit der App ausgeliefert und nicht in
  der Datenbank gespeichert, sodass auch bestehende Installationen sofort profitieren. Eigene
  Suchbegriffe lassen sich je Lebensmittel ergänzen (`Food.aliases`, Dok. 03).
- **Normalisierung:** Groß-/Kleinschreibung, Umlaute (ä = ae, ß = ss), Akzente und Satzzeichen
  werden ignoriert; zusammengeschriebene Begriffe passen auch getrennt („Hafer Flocken").
- **Mehrere Wörter:** Jedes Wort muss passen, Reihenfolge egal („hack rind").
- **Einfache Wortstämme und Tippfehler:** Plural-/Flexionsendungen (-en, -n, -e, -s) werden
  toleriert; ab 5 Buchstaben ist ein Tippfehler erlaubt („Brokoli" findet Broccoli). Sehr kurze
  Eingaben (< 3 Zeichen) passen nur am Wortanfang.
- **Rangfolge:** exakter Name → exakter Suchbegriff → Name beginnt mit Eingabe → Suchbegriff beginnt
  mit Eingabe → alle Wörter am Wortanfang → sonstige Treffer; innerhalb gleicher Stufe Favoriten
  zuerst, dann kürzere Namen. Rohe Varianten führen den bloßen Alltagsnamen bewusst nicht, damit
  z. B. „Kartoffeln" zuerst die gekochte Form zeigt.

## 5.3 Portionsgrößen & Einheiten

### 5.3.1 Unterstützte Einheiten

- **Grundeinheiten:** Gramm (g) und Milliliter (ml) – immer verfügbar.
- **Alltagseinheiten:** z. B. Stück, Scheibe, Becher, Riegel, Esslöffel, Packung – je Lebensmittel,
  sofern eine belastbare Gewichtsangabe vorliegt.

### 5.3.2 Herkunft der Portionsgrößen (verbindlich)

1. **Primär:** die im BLS enthaltenen Haushaltsmaße/Portionsangaben, sofern vorhanden
   (z. B. mittlere Stückgröße in Gramm).
2. **Ergänzend (Fallback):** eine mit der App ausgelieferte, kuratierte Default-Tabelle gängiger
   Alltagsportionen, wenn das BLS für ein Lebensmittel kein Haushaltsmaß liefert. Beispiele für
   dokumentierte Richtwerte:
   - 1 Scheibe Brot ≈ 45 g
   - 1 Ei ≈ 55 g
   - 1 Apfel ≈ 150 g
   - 1 Esslöffel Öl ≈ 10 g
   - 1 Becher Joghurt ≈ 150 g
   Jede Default-Portion wird in der Datei mit Quelle/Begründung dokumentiert.
3. **Eigene Portionen:** Nutzer können je Lebensmittel eigene, wiederverwendbare Portionsgrößen
   anlegen (Dok. 03, `Portion`).

### 5.3.3 Umrechnungsregel

- Eine Alltagseinheit wird **nur dann** in Gramm umgerechnet, wenn eine belastbare Gewichtsangabe
  (`Portion.grams`) vorliegt (aus BLS, Default-Tabelle oder Nutzereingabe).
- Fehlt sie, bleibt nur die direkte Eingabe in g/ml. Es werden keine Gewichte „geraten".

## 5.4 0‑Punkte-Lebensmittel

### 5.4.1 Prinzip

- 0‑Punkte-Lebensmittel sind eine **eigenständige Regel** und kein Ergebnis der Nährwertformel.
- Ist `Food.countsAsZero = true`, ergibt jede Menge 0 Punkte (Dok. 04, 4.1.3).
- Die Zuordnung erfolgt über eine **kuratierte Liste** (unten) sowie über die manuelle Markierung
  bei eigenen Lebensmitteln.
- Die Liste wird **ohne besondere Kennzeichnung** in der App geführt (keine Hinweise, die den
  Anwender verunsichern).

### 5.4.2 Kuratierte 0‑Punkte-Liste (MVP)

Aufnahmekriterium: natürliche, unverarbeitete Grundlebensmittel mit niedriger Energiedichte bzw.
hohem Protein-/Wassergehalt, die typischerweise nicht abgewogen werden müssen. Enthalten sind u. a.:

- **Gemüse:** die meisten nicht-stärkehaltigen Gemüse (z. B. Tomate, Gurke, Paprika, Brokkoli,
  Karotte, Zucchini, Salate, Spinat, Zwiebel, Pilze).
- **Obst:** die meisten frischen Obstsorten (z. B. Apfel, Banane, Beeren, Orange, Birne, Trauben)
  – ganze Frucht, nicht als Saft.
- **Eier.**
- **Mageres Geflügel ohne Haut** (Hähnchen-/Putenbrust).
- **Fisch und Meeresfrüchte** (natur, ohne Panade/Öl; Thunfisch in eigenem Saft, Garnelen).
- **Skyr natur.**
- **Hülsenfrüchte** (Linsen, Bohnen, Kichererbsen, Erbsen) – natur, gekocht oder als Konserve
  abgetropft.
- **Tomaten- und Gemüsekonserven ohne Zusätze** (gehackte Tomaten, Passata, Mais natur).
- **Naturjoghurt/Magerquark fettarm, ohne Zucker.**
- **Tofu natur.**
- **Süßkartoffel wird NICHT als 0‑Punkte geführt** (stärkehaltig – Beispiel für eine bewusste
  Ausnahme). Ebenso bewusst **nicht** 0‑Punkte: Hähnchenschenkel (mit Haut), Tomatenmark
  (konzentriert), Avocado (fettreich), Kartoffeln, Nudeln und Reis.

### 5.4.3 Abgrenzung & zusammengesetzte Produkte

- **Keine reine Namens-/Kategorieübereinstimmung:** Ein Produkt ist nur dann 0‑Punkte, wenn es den
  Kriterien tatsächlich entspricht. „Hähnchen paniert" oder „Obst in Sirup" sind **nicht** 0‑Punkte.
- **Zusätzliche Zutaten werden getrennt bewertet:** Öl, Butter, Käse, Zucker o. Ä. werden als
  eigene Einträge erfasst und normal bewertet, auch wenn eine Hauptzutat 0‑Punkte ist (z. B. Salat
  = 0 Punkte, aber Dressing/Öl zählt).
- **Verarbeitungsgrad entscheidet:** natur vs. zubereitet/verarbeitet macht den Unterschied.

### 5.4.4 Pflege & Erweiterbarkeit

- Die Liste wird als kuratierte Datendatei geführt und ist versioniert (Dok. 06, Seed-Version),
  sodass sie mit App-Updates ergänzt werden kann.
- Nutzer können bei eigenen Lebensmitteln `countsAsZero` selbst setzen.

## 5.5 Datenqualität

- Jedes Lebensmittel führt einen Qualitätsstatus (`complete`/`incomplete`, abgeleitet aus den
  Nährwerten).
- Fehlende Werte sind in der UI erkennbar; die Punktelogik behandelt sie wie in Dok. 04, 4.1.4
  beschrieben.
- Internet-/Fremddaten gelten nicht automatisch als korrekt oder zur Portion passend; Herkunft und
  Zustand bleiben über `source`/`sourceRef` nachvollziehbar.

## 5.6 Rezepte

- Ein Rezept ist ein eigenes Lebensmittel (Kategorie „Rezepte", Basis g) mit Zutatenliste
  (`Food.recipe`, Dok. 03). Zutaten sind Basis- oder eigene Lebensmittel mit Grammangabe;
  ml-Zutaten werden mit 1 ml ≈ 1 g angesetzt. Rezepte werden nicht verschachtelt.
- **Nährwerte je 100 g** = Summe der Zutaten-Nährwerte ÷ Gesamtgewicht. Gesamtgewicht ist die
  Summe der Zutaten oder – falls angegeben – das Gewicht fertig gekocht (Wasseraufnahme/-verlust).
- **0‑Punkte-Zutaten** tragen nur Gewicht bei, keine Nährwerte: Gemüse, Bohnen oder magere
  Hähnchenbrust bleiben auch im Rezept punktefrei, Öl, Hackfleisch oder Käse zählen voll. Ein
  Rezept selbst ist nie pauschal 0‑Punkte.
- **Portionen:** „Portion (1/n)" (Standard) und „Ganzes Rezept".
- Ändern sich Nährwerte einer Zutat, werden alle Rezepte neu berechnet. Bereits gespeicherte
  Tagebucheinträge behalten ihren Snapshot (Dok. 04). Eine Zutat, die in einem Rezept verwendet
  wird, kann nicht gelöscht werden.

## 5.7 Mahlzeit-Vorlagen, Vortag und Mengenvorschlag

- **Vorlage:** Die Einträge einer Mahlzeit werden mit Name gespeichert (Lebensmittel, Menge,
  Portionsbezeichnung). Beim Eintragen lassen sich einzelne Positionen abwählen und Mengen anpassen;
  Punkte werden mit den aktuellen Nährwerten berechnet.
- **Vom Vortag übernehmen:** kopiert die Einträge derselben Mahlzeit des Vortags unverändert
  (inkl. Snapshot und Punkte).
- **Mengenvorschlag:** Wird ein Lebensmittel erneut gewählt, ist die zuletzt verwendete Menge
  und Einheit vorausgewählt; ohne Historie gilt die Standardportion.
- **Speichern und weiter:** speichert den Eintrag und kehrt zur Suche zurück, die Mahlzeit bleibt
  erhalten – für Mahlzeiten aus mehreren Lebensmitteln.
- Wird ein Lebensmittel gelöscht, wird es aus Vorlagen entfernt; leere Vorlagen entfallen.
- **Übersicht:** Der Bereich „Rezepte & Vorlagen" (Dok. 02.4) listet alle Vorlagen mit Inhalt und
  aktuellen Punkten sowie alle Rezepte mit Punkten pro Portion.

## 5.8 Barcode-Produkte

- Der Nutzer kann einen Barcode mit der Kamera erfassen oder manuell eingeben. Unterstützt werden
  EAN-8 sowie EAN-/UPC-/GTIN-Codes mit 12 bis 14 Ziffern; gleichwertige UPC-A/EAN-Darstellungen
  werden normalisiert.
- Vor dem Abruf wird der lokale Open Food Facts-Bestand geprüft. Nur unbekannte Codes lösen einen
  einzelnen API-v3-Abruf aus. Erfolgreiche Produkte und zugehörige Portionen werden lokal
  gespeichert und in Sicherungen aufgenommen; es gibt keine automatische Aktualisierung.
- Produktname und Energieangabe sind erforderlich. kJ werden in kcal umgerechnet, wenn kcal
  fehlen. Andere fehlende oder ungültige Nährwerte bleiben unvollständig markiert.
- Herstellerportionen und Packungsgrößen werden übernommen, sofern Menge und Einheit verwertbar
  sind. Ergänzende Alltagseinheiten sind ausdrücklich als Schätzung gekennzeichnet und bearbeitbar.
- Beim Abruf werden Barcode und technische Verbindungsdaten an Open Food Facts übertragen; keine
  Profil- oder Tagebuchdaten. Die Kameraaufnahmen werden lokal verarbeitet.
