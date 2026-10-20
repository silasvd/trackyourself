# 02 – Nutzerflows & Dashboard

## 2.1 Primäre Nutzerflows

### Flow A – Lebensmittel eintragen (wichtigster Flow)

1. Start auf dem Dashboard.
2. Aktion **„Hinzufügen"** antippen (prominent, immer sichtbar).
3. Mahlzeit wählen (Vorauswahl nach Tageszeit: morgens → Frühstück usw.).
4. Lebensmittel finden über:
   - Favoriten,
   - zuletzt verwendet,
   - Basisliste,
   - Suche (Freitext über Basis-, eigene und zuletzt verwendete Lebensmittel),
   - „Eigenes Lebensmittel anlegen".
5. Portion wählen (Standardportion vorausgewählt; Menge in g/ml oder Alltagseinheit anpassbar).
6. Punkte werden live berechnet und angezeigt.
7. **Speichern** → zurück zum Dashboard, der Tagesstatus aktualisiert sich sofort.

**Zielvorgabe:** aus dem Dashboard heraus mit höchstens drei Interaktionen bis zum gespeicherten
Eintrag (bei bereits bekanntem Lebensmittel mit Standardportion).

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

## 2.2 Dashboard – Aufbau

Das Dashboard beantwortet drei Fragen auf einen Blick:
1. Wie groß ist mein Tagesbudget?
2. Wie viel habe ich verbraucht und wie viel bleibt?
3. Wie füge ich mit möglichst wenigen Schritten ein Lebensmittel hinzu?

Informationshierarchie (von oben nach unten):

1. **Kopf:** aktuelles Datum und Datumsnavigation (vor/zurück, „heute").
2. **Tagesstatus:** gut lesbare Zahlen für Budget, verbraucht und verbleibend. Ein Ring/Balken
   ergänzt die Zahlen visuell, ersetzt sie aber nie.
3. **Wochenstatus:** kompakt – Wochenextras gesamt, davon verbraucht/verbleibend, inkl. bereits
   übertragener Tagesreste.
4. **Primäraktion „Hinzufügen":** prominent und dauerhaft erreichbar, mit schneller Mahlzeitenwahl.
5. **Schnellzugriff:** Favoriten, zuletzt verwendet, Basisliste.
6. **Heutige Einträge:** nach Mahlzeiten gruppiert, je Eintrag Name, Portion und Punkte; direkte
   Bearbeitung/Löschung.
7. **Sekundärbereiche (kompakt):** Aktivität des Tages und letzter Gewichtswert als kleine Kacheln
   mit Absprung in die jeweiligen Bereiche.

### Bedeutung von „verbleibend" (verbindlich)

- „Verbleibend" bezeichnet **ausschließlich die restlichen Tagespunkte** des aktuellen Tages.
- Wochenextras werden **getrennt** ausgewiesen und nicht in „verbleibend" eingerechnet.
- Aktivitätspunkte beeinflussen im MVP weder „verbleibend" noch das Wochenbudget.

## 2.3 Bedienbarkeit & Barrierefreiheit

- **Mobile first:** einspaltiges Layout, große Tap-Ziele (mind. 44×44 px), Daumen­reichweite
  beachten.
- **Kein Farbzwang:** Status wird immer zusätzlich durch Text/Zahl vermittelt; Rot/Grün nie allein.
- **Kontraste:** Zielwert WCAG 2.1 AA für Text und Bedienelemente.
- **Semantik:** sinnvolle Überschriftenstruktur, Beschriftungen für alle Eingaben, Fokus-Reihenfolge
  logisch, Bedienung per Tastatur möglich.
- **Fehlertoleranz:** Eingaben validieren, verständliche Fehlermeldungen in Textform.
- **Übersichtlichkeit:** Diagramme und Statistiken überladen die Tagesübersicht nicht; Details
  liegen in den jeweiligen Bereichen.

## 2.4 Navigationsstruktur

Untere Navigationsleiste (mobil) mit vier Bereichen:

1. **Tag** (Dashboard/Tagebuch)
2. **Aktivität**
3. **Gewicht**
4. **Profil/Einstellungen**

Die Primäraktion „Hinzufügen" ist aus dem Tag-Bereich und als zentraler Button erreichbar.
