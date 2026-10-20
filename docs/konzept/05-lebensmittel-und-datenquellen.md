# 05 – Lebensmittel & Datenquellen

## 5.1 Erfassungswege

1. **Basislebensmittel:** Eine mit der App ausgelieferte, lokale Referenzliste häufiger
   Grundnahrungsmittel mit Nährwerten. Damit sind Grundnahrungsmittel ohne Internet und ohne
   Barcode sofort auswählbar.
2. **Eigene Lebensmittel:** Nutzer legen Lebensmittel mit Nährwerten selbst an und verwenden sie
   wieder (Flow B, Dok. 02).
3. **Online-/Barcode-Suche:** **nicht im MVP** (spätere Ausbaustufe, Dok. 09).

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
- **Zubereitungszustand:** Wo relevant, wird roh/gekocht im Namen kenntlich gemacht (z. B. „Reis,
  gekocht"), da sich Nährwerte je 100 g unterscheiden.

### 5.2.2 Abdeckung der Startliste (Richtwert)

Die Startliste deckt gängige Grundzutaten ab, u. a.: Kartoffeln, Nudeln, Reis, Haferflocken, Brot,
Eier, Milch, Joghurt, Käse, Obst (Apfel, Banane, Beeren …), Gemüse (Karotte, Tomate, Zwiebel,
Brokkoli …), Hülsenfrüchte (Linsen, Bohnen, Kichererbsen), Fleisch (Hähnchenbrust, Rind, Schwein),
Fisch (Lachs, Thunfisch), Öle/Fette (Olivenöl, Butter) und typische Grundzutaten (Zucker, Mehl).
Zielgröße MVP: rund 50–80 Einträge, erweiterbar.

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
- **Fisch und Meeresfrüchte** (natur, ohne Panade/Öl).
- **Hülsenfrüchte** (Linsen, Bohnen, Kichererbsen, Erbsen) – natur, gekocht.
- **Naturjoghurt/Magerquark fettarm, ohne Zucker.**
- **Tofu natur.**
- **Mais (natur), Süßkartoffel wird NICHT als 0‑Punkte geführt** (stärkehaltig – Beispiel für eine
  bewusste Ausnahme).

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
