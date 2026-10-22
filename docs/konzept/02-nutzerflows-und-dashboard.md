# 02 – Nutzerflows & Dashboard

## 2.1 Primäre Nutzerflows

### Flow A – Lebensmittel eintragen (wichtigster Flow)

1. Start auf dem Dashboard.
2. Aktion **„Hinzufügen"** antippen (runder „+"-Button unten rechts, schwebt über dem Inhalt und
   ist immer sichtbar).
3. Mahlzeit wählen (Vorauswahl nach Tageszeit: morgens → Frühstück usw.; über „+ Mahlzeit" direkt
   an der Mahlzeit ist sie bereits gesetzt).
4. Lebensmittel finden über:
   - Favoriten,
   - zuletzt verwendet,
   - Basisliste,
   - Suche (Freitext über Basis-, eigene Lebensmittel, Rezepte und Vorlagen; findet auch
     Alltagsnamen, Synonyme, Pluralformen und einfache Tippfehler, Dok. 05, 5.2.3),
   - Mahlzeit-Vorlagen und Rezepte (eigene Filter),
   - „Eigenes Lebensmittel anlegen" bzw. „Rezept anlegen" (über „+ Neu" im Dialogkopf und unter
     „Nicht gefunden?" am Listenende).

   Ohne Suchbegriff stehen Favoriten oben, danach zuletzt verwendete, dann alphabetisch. Auf dem
   Smartphone öffnet der Auswahldialog bildschirmfüllend mit schmalem Kopf; das Suchfeld steht ganz
   oben und bleibt beim Scrollen fixiert, Ergebnisse sind einzeilig (Favorit-, Bearbeiten- und
   Löschen-Symbol), damit die Treffer auch bei eingeblendeter Tastatur sichtbar sind. Alle
   Eingabefelder haben mindestens 16 px Schrift, sonst zoomt iOS Safari beim Fokus hinein.
   Die Filter (Alle, Favoriten, Zuletzt, Vorlagen, Rezepte, Eigene, Basisliste) stehen als
   horizontal scrollbare Chip-Leiste unter dem Suchfeld. Sobald ein Suchbegriff eingegeben ist,
   verschwinden Chip-Leiste und „+ Neu"-Menü; ein aktiver Filter bleibt als einzelner Chip
   („Rezepte ×") sichtbar und lässt sich damit aufheben.
5. Portion wählen (zuletzt verwendete Menge vorausgewählt, sonst Standardportion; Menge in g/ml
   oder Alltagseinheit anpassbar).
6. Punkte werden live berechnet und angezeigt.
7. **Speichern** → zurück zum Dashboard, der Tagesstatus aktualisiert sich sofort.
   **Speichern und weiter** → zurück zur Suche, die Mahlzeit bleibt gesetzt (Mahlzeiten aus
   mehreren Lebensmitteln, z. B. Porridge + Hafermilch).

### Flow B – Eigenes Lebensmittel anlegen

1. In Flow A „Eigenes Lebensmittel anlegen".
2. Name, optionale Kategorie, Nährwerte je 100 g/ml (kcal, gesättigte Fette, Zucker, Protein)
   erfassen.
3. Optional als 0‑Punkte‑Lebensmittel markieren.
4. Standardportion(en) definieren.
5. Speichern → Lebensmittel steht dauerhaft zur Wiederverwendung bereit und kann direkt eingetragen
   werden.

### Flow C – Eintrag bearbeiten/löschen

1. Eintrag im Tagebuch/Dashboard antippen.
2. Portion ändern oder Eintrag löschen.
3. Tages- und Wochenstatus aktualisieren sich sofort.

### Flow D – Früheren Tag korrigieren

1. Datum wechseln (Datumsnavigation).
2. Einträge des Tages wie gewohnt bearbeiten/ergänzen.
3. Tagesreste und Wochenextras werden neu berechnet (Dok. 04, Abschnitt rückwirkende Änderungen).

### Flow E – Profil & Budget einrichten

1. Profil öffnen.
2. Angaben erfassen → Budget wird berechnet und angezeigt.
3. Optional Budget manuell überschreiben (einfaches Zahlenfeld, keine Warnhinweise).

### Flow F – Aktivität erfassen

1. Aktivität öffnen → „Hinzufügen".
2. Aktivität, Dauer, Intensität wählen.
3. Aktivitätspunkte werden berechnet und angezeigt (keine Verrechnung mit dem Essensbudget).

### Flow G – Gewicht erfassen

1. Gewicht öffnen → „Hinzufügen".
2. Datum (Vorgabe: heute) und Gewicht eingeben.
3. Verlaufsdiagramm und Veränderungswerte aktualisieren sich.

### Flow H – Sicherung (Export/Import)

1. Einstellungen → „Daten exportieren" erzeugt eine JSON-Datei zum Download.
2. „Daten importieren" liest eine zuvor exportierte Datei und stellt den Stand wieder her
   (mit Bestätigungsdialog, da bestehende Daten ersetzt werden).

### Flow I – Rezept anlegen und eintragen

1. In Flow A „Rezept anlegen".
2. Name, Anzahl Portionen und optional Gewicht fertig gekocht eingeben.
3. Zutaten über die Zutatensuche hinzufügen und Gramm angeben (z. B. Chili: Hackfleisch,
   Kidneybohnen, Tomaten, Zwiebeln, Öl). Gesamtgewicht, Portionsgewicht und Punkte pro Portion
   werden live angezeigt.
4. Speichern → das Rezept ist direkt zum Eintragen ausgewählt (Standard: eine Portion) und steht
   künftig wie ein Lebensmittel zur Verfügung.

### Flow J – Wiederkehrende Mahlzeiten

1. Mahlzeit einmal erfassen → „Als Vorlage speichern" an der Mahlzeit, Name vergeben.
2. Später in Flow A die Vorlage wählen, Mahlzeit prüfen, einzelne Positionen abwählen oder Mengen
   anpassen → „Vorlage eintragen".
3. Alternativ „Vom Vortag übernehmen" an der Mahlzeit: kopiert die Einträge des Vortags mit einer
   Interaktion.
4. Vorlagen und Rezepte sind zusätzlich im Bereich „Rezepte & Vorlagen" aufgelistet; von dort
   lassen sie sich verwalten und Vorlagen direkt am im Tag-Bereich gewählten Datum eintragen.

## 2.2 Dashboard – Aufbau

Das Dashboard beantwortet drei Fragen auf einen Blick:
1. Wie groß ist mein Tagesbudget?
2. Wie viel habe ich verbraucht und wie viel bleibt?
3. Wie füge ich mit möglichst wenigen Schritten ein Lebensmittel hinzu?

Das Dashboard zeigt Datumsnavigation, Tages- und Wochenstatus, eine Aktion zum Hinzufügen, eine
Aktion zum Barcode-Scan, das nach Mahlzeiten gruppierte Tagebuch sowie Kacheln für Aktivität und
den letzten Gewichtswert. Tagebucheinträge lassen sich direkt bearbeiten oder löschen. Favoriten,
zuletzt verwendete Lebensmittel und Basisliste sind im Auswahldialog erreichbar, nicht als eigene
Schnellzugriffsliste auf dem Dashboard.

### Bedeutung von „verbleibend"

- „Verbleibend" bezeichnet **ausschließlich die restlichen Tagespunkte** des aktuellen Tages.
- Wochenextras werden **getrennt** ausgewiesen und nicht in „verbleibend" eingerechnet.
- Aktivitätspunkte beeinflussen im MVP weder „verbleibend" noch das Wochenbudget.

## 2.3 Bedienbarkeit

- Die Oberfläche passt sich mobilen und größeren Ansichten an; Bedienelemente sind für Touch
  ausgelegt.
- Formulare haben beschriftete Eingaben und validieren Werte vor dem Speichern.
- Status- und Fehlerhinweise werden als Text ausgegeben; wichtige Aktionen sind per Tastatur
  bedienbar.
- Der Gewichtsverlauf ist zusätzlich als Tabelle verfügbar.

## 2.4 Navigationsstruktur

Untere Navigationsleiste (mobil) mit fünf Bereichen; die Beschriftungen sind kurz gehalten
(„Rezepte", „Profil"), der vollständige Name ist der zugängliche Name der Schaltfläche:

1. **Tag** (Dashboard/Tagebuch)
2. **Rezepte & Vorlagen** – Übersicht aller Rezepte (Portionen, Punkte pro Portion, Zutaten;
   anlegen, bearbeiten, löschen) und Mahlzeit-Vorlagen (Mahlzeit, Inhalt, aktuelle Punkte;
   am gewählten Tag eintragen, umbenennen, löschen)
3. **Aktivität**
4. **Gewicht**
5. **Profil/Einstellungen**

Die Aktion „Hinzufügen" ist als runder „+"-Button und über „+ Mahlzeit" in jeder Mahlzeit
erreichbar. Ein separater Schnellzugriff für Favoriten, zuletzt verwendete Lebensmittel oder die
Basisliste ist nicht implementiert.
