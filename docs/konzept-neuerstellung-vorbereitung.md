# Vorbereitung zur Konzept-Neuerstellung

> **Status:** Arbeitsgrundlage, keine abschließende Spezifikation. Dieses Dokument sammelt die bisher im Gespräch festgehaltenen Anforderungen, Annahmen und offenen Fragen. Es dient als Ausgangspunkt für ein neu zu erstellendes Konzept.
>
> **Entwicklungsrichtung:** Die App wird voraussichtlich von Grund auf neu entwickelt. Der bestehende Copilot-Branch ist als Informationsquelle betrachtet worden, aber nicht als verbindliche technische Basis für die Neuentwicklung vorgesehen.

## 1. Produktidee und Ziel

TrackYourself soll eine schlanke, moderne und persönliche App zur Erfassung von Lebensmitteln, SmartPoints, Aktivitäten und Gewicht werden. Als fachliche Orientierung dient WW Freestyle / Blau aus dem Jahr 2019. Die App soll keine vollständige Kopie der WW-Plattform sein, sondern eine einfache Tracking-App mit schneller Eingabe und Offline-Nutzung.

Zentrale Ziele:

- Lebensmittel und Aktivitäten mit wenigen Schritten erfassen.
- SmartPoints sowie Tages- und Wochenübersicht verständlich darstellen.
- Gewicht dokumentieren, ohne täglichen Wiegezwang.
- Bereits gespeicherte Daten und Kernfunktionen offline verfügbar machen.
- Den Funktionsumfang zunächst bewusst klein und wartbar halten.

Die historische Genauigkeit der WW-Regeln muss noch geprüft werden; bisherige Formeln und Regeln sind nicht als offiziell oder abschließend validiert anzusehen.

## 2. Bisher festgehaltene Leitentscheidungen

- **SmartPoints:** Eine Formel reicht für den Anfang. Die bereits besprochene Formel A bleibt als vorläufige Berechnung erhalten.
- **Basislebensmittel:** Häufige Grundnahrungsmittel sollen ohne Barcode auswählbar sein, etwa Kartoffeln, Nudeln und Reis.
- **Dashboard:** Es soll übersichtlich, schnell erfassbar und auf die wesentlichen Tagesinformationen und schnelle Eingaben fokussiert sein.
- **Speicherung:** Lokale Speicherung reicht zunächst. Ein Server, Nutzerkonto und geräteübergreifende Synchronisierung sind keine MVP-Voraussetzung.
- **Neuentwicklung:** Die App wird voraussichtlich von Grund auf neu entwickelt. Der Copilot-Branch dient höchstens als Referenz für bereits erprobte Ideen und bekannte Grenzen.

## 3. Punkte- und Budgetsystem

### 3.1 SmartPoints für Lebensmittel

Vorläufige Formel auf Basis der Nährwerte pro 100 g bzw. 100 ml:

`P = kcal × 0,0305 + gesättigte Fette (g) × 0,275 + Zucker (g) × 0,12 − Protein (g) × 0,098`

Der Wert wird proportional auf die tatsächlich verzehrte Menge umgerechnet. Noch festzulegen und zu testen sind Rundung, Mindestwert, Verhalten bei negativen Ergebnissen sowie der Umgang mit fehlenden oder unzuverlässigen Nährwerten. Die Formel ist eine Arbeitshypothese, keine bestätigte Rekonstruktion der historischen WW-Originalformel.

### 3.2 Persönliches Tagesbudget

Das Tagesbudget soll sich an der historischen Freestyle-/Blau-Berechnung orientieren und persönliche Angaben wie Alter, Geschlecht, Größe und Gewicht berücksichtigen; weitere Faktoren sind zu prüfen. Die genaue historische Formel, benötigte Angaben, Wertebereiche und Grenzfälle sind noch zu recherchieren und zu entscheiden.

### 3.3 Wochenextras und Tagesreste

Als gewünschte historische Orientierung wurde festgehalten:

- Bis zu vier ungenutzte Tagespunkte können pro Tag in das Wochenbudget übernommen werden.
- Darüber hinaus ungenutzte Tagespunkte verfallen.
- Wochenextras können flexibel innerhalb der Woche eingesetzt werden.
- Zum Wochenwechsel wird das Wochenbudget zurückgesetzt.

Noch zu definieren sind Wochenbeginn, genaue Verbuchung, Reihenfolge von Tagesbudget und Wochenextras, Verhalten bei rückwirkenden Änderungen sowie Tage ohne Einträge.

### 3.4 ZeroPoints

ZeroPoints sind eine separate Regel und kein Ergebnis der normalen Nährwertformel. Grundlage soll, soweit möglich, die historische Lebensmittelliste von WW Freestyle / Blau aus 2019 sein.

Offen sind Vollständigkeit und Herkunft der Liste, eventuelle Programmvoraussetzungen und der Umgang mit zusammengesetzten Produkten. Zutaten wie Öl, Butter oder Käse sollen separat erfasst und bewertet werden können, auch wenn eine Hauptzutat ZeroPoints hat. Eine einfache Kategorie- oder Namensübereinstimmung reicht nicht als belastbare Einstufung.

### 3.5 FitPoints und Aktivitäten

Aktivitäten sollen manuell mit Aktivität, Dauer und Intensität erfasst werden. Beispiele sind Gehen, Radfahren und Hausarbeit. FitPoints bleiben von SmartPoints getrennt. Eine optionale Anrechnung auf das Essensbudget kann später geprüft werden.

Die originale WW-Formel ist nicht als verfügbar oder validiert vorauszusetzen. Eine transparente Näherung kann geprüft werden, muss jedoch als solche gekennzeichnet sein. Automatische Bewegungserkennung, GPS und Fitnessgeräte-Anbindung sind zunächst nicht vorgesehen.

## 4. Lebensmittel erfassen und verwalten

### 4.1 Erfassungswege

1. **Basislebensmittel:** Lokale Referenzliste häufiger allgemeiner Lebensmittel mit Nährwerten, damit Grundnahrungsmittel ohne Barcode ausgewählt werden können.
2. **Verpackte Produkte:** Barcode-Suche über Open Food Facts, sofern eine Internetverbindung verfügbar ist.
3. **Eigene/manuelle Lebensmittel:** Nutzer können Lebensmittel mit Nährwerten anlegen und wiederverwenden.

Die Basisliste soll häufige Zutaten und Grundnahrungsmittel abdecken, zum Beispiel Kartoffeln, Nudeln, Reis, Haferflocken, Brot, Eier, Milchprodukte, Obst, Gemüse, Hülsenfrüchte, Fleisch, Fisch, Öle und typische Grundzutaten.

Es wurde noch keine konkrete Datenquelle oder lizenzgeprüfte Liste ausgewählt. Öffentliche Nährwertdatenbanken und eine kuratierte Startliste kommen als Ansätze infrage. Quelle, Lizenz, Region, Aktualität, Zubereitungszustand (roh/gekocht) und Zuverlässigkeit müssen berücksichtigt und nachvollziehbar bleiben. Internetdaten sind nicht automatisch korrekt oder passend für jede Portion.

### 4.2 Datenqualität und Portionen

Lebensmittel sollen soweit verfügbar Name, Kategorie, Nährwerte je 100 g/ml, Datenquelle und Qualitätsstatus enthalten. Fehlende Werte müssen erkennbar sein. Aus unvollständigen Nährwerten sollen keine scheinbar exakten Punktewerte entstehen.

Portionen sollen Gramm und Milliliter sowie passende Alltagseinheiten unterstützen, etwa Stück, Becher, Scheibe, Riegel oder Packung. Sinnvolle Standardportionen und eigene, wiederverwendbare Portionsgrößen sollen möglich sein. Eine Umrechnung in Gramm soll nur bei belastbarer Gewichtsangabe erfolgen.

### 4.3 Wiederverwendung

Favoriten, zuletzt verwendete Lebensmittel, eigene Produkte und gespeicherte Portionen sollen die tägliche Eingabe beschleunigen. Einträge sollen bearbeitet und gelöscht werden können.

## 5. Ernährungstagebuch

Lebensmittel werden einem Datum und einer Mahlzeit zugeordnet. Vorgesehen sind Frühstück, Mittagessen, Abendessen und Zwischenmahlzeiten/Snacks.

Benötigte Funktionen:

- Lebensmittel auswählen, Portion festlegen und schnell eintragen.
- Einträge nachträglich bearbeiten oder löschen.
- Frühere Tage öffnen und korrigieren.
- Punkte je Eintrag, Mahlzeit und Tag anzeigen.
- Verbrauchte und verbleibende Punkte sowie Wochenübersicht nachvollziehen.

## 6. Dashboard und Bedienbarkeit

Das Dashboard ist ein zentrales Produktziel. Es soll auf einen Blick die wichtigsten Fragen beantworten:

1. Wie groß ist mein Tagesbudget?
2. Wie viel habe ich verbraucht und wie viel bleibt?
3. Wie füge ich mit möglichst wenigen Schritten ein Lebensmittel hinzu?

Vorgeschlagene Informationshierarchie:

1. Datum und klarer Tagesstatus.
2. Gut lesbare Zusammenfassung von Budget, verbrauchten und verbleibenden Punkten.
3. Kompakter Wochenstatus mit Wochenbudget/-extras, sobald die Regeln feststehen.
4. Prominente Aktion zum Hinzufügen eines Lebensmittels und schnelle Mahlzeitenauswahl.
5. Schnellzugriff auf Favoriten, zuletzt verwendete und Basislebensmittel; Barcode-Scan als zusätzlicher Weg.
6. Heutige Einträge nach Mahlzeiten gruppiert, mit Name, Portion und Punkten sowie einfacher Bearbeitung/Löschung.
7. Aktivitäts- und Gewichtsinfos als sekundäre, kompakte Bereiche.

Ein Ring oder Balken kann den Tagesstatus zeigen, muss aber durch klare Zahlen und Beschriftungen ergänzt werden. Farben allein dürfen keine Information vermitteln. Diagramme und umfangreiche Statistiken sollen die zentrale Tagesübersicht nicht überladen.

Im neuen Konzept sind die mobile Darstellung, Barrierefreiheit und die Bedeutung von „verbleibend“ (nur Tagesbudget oder auch Wochenextras/Aktivität) eindeutig festzulegen.

## 7. Gewicht dokumentieren

Die Gewichtserfassung soll einfach sein und keinen täglichen Wiegezwang voraussetzen:

- Datum und Gewicht eintragen.
- Beliebig viele und unregelmäßige Einträge speichern.
- Frühere Werte ansehen.
- Gewichtsverlauf als Diagramm darstellen.
- Veränderung seit dem ersten und optional seit dem letzten Eintrag anzeigen.

## 8. Gamification, Abzeichen und Streaks

Leichte Gamification ist erwünscht und soll die regelmäßige Nutzung unterstützen, ohne Druck oder Wettbewerb zu erzeugen:

- **Streaks** zeigen aufeinanderfolgende Tage mit einem Tagebucheintrag. Ein aktiver Tag setzt kein Wiegen voraus.
- **Abzeichen** würdigen nachvollziehbare Nutzungsmeilensteine, zum Beispiel den ersten Eintrag oder regelmäßiges Tracken.
- Die Anzeige bleibt optional und dezent; Streaks und Abzeichen dürfen weder Ernährungsziele noch Gewichtsveränderungen bewerten.
- Ranglisten, Vergleiche mit anderen und Strafen für unterbrochene Streaks sind nicht vorgesehen.

Die genauen Abzeichen, die Definition eines aktiven Tages und die Möglichkeit, Erinnerungen oder Gamification auszuschalten, sind im neuen Konzept festzulegen.

## 9. Offline-Nutzung und lokale Datenspeicherung

Profil, Tagebuch, Basislebensmittel, eigene Produkte, Portionsgrößen, Gewichtsdaten und Berechnungen sollen lokal verfügbar sein. Bereits geladene Produktdaten können lokal zwischengespeichert werden. Neue Produktsuchen über Open Food Facts benötigen normalerweise Internetzugang.

Für das MVP sind Server, Nutzerkonten, Cloud-Backup und geräteübergreifende Synchronisierung nicht vorgesehen. Als Einschränkung muss verständlich sein, dass Daten bei Geräteverlust, Browserdaten-Löschung oder Gerätewechsel verloren gehen können. Lokaler Datenexport/-import oder Backup kann als spätere Schutzfunktion geprüft werden.

Die bisherige Umsetzung speicherte Profildaten, Lebensmittel- und Aktivitätseinträge in IndexedDB. IndexedDB ist eine mögliche Option für die Neuentwicklung, aber noch keine festgelegte Architektur. Service-Worker-Caching der App und dauerhafte Nutzerdatenspeicherung sind unterschiedliche Dinge.

## 10. Zunächst nicht geplant

- Rezepte und Rezeptplanung
- Wochenmenüs und Einkaufslisten
- Community, soziale Funktionen oder Teilen von Tagebüchern
- KI-basierte Ernährungsempfehlungen
- Automatische Bewegungserfassung, GPS oder Fitnessgeräte
- Umfangreiche Statistiken und Analysen
- Mehrere WW-Programme parallel
- Mehrgeräte-Synchronisierung und Serverkonto

## 11. Vorhandener Copilot-Branch als Referenz

Der Branch `copilot/create-pwa-nutrition-points-system` enthält einen React-/TypeScript-/Vite-PWA-Prototyp mit Dashboard, Barcode-Scan, Open-Food-Facts-Abfrage, Portionsauswahl, Aktivitätserfassung, Profil, Diagramm und IndexedDB-Speicherung. Die lokale Datenbank umfasst Profil-, Lebensmittel- und Aktivitätseinträge.

Der Prototyp nutzt Formel A für Lebensmittelpunkte und enthält vereinfachte Tagesbudget- und FitPoints-Berechnungen. Seine ZeroPoints-Erkennung beruht auf einer einfachen Kategorienliste und ist keine vollständige oder verifizierte Freestyle-Liste. Wochenextras, historische Budgetregeln, Gewichtsverlauf und eine vollständige Mahlzeitenstruktur sind nicht vollständig umgesetzt.

Diese Informationen halten bereits untersuchte Ansätze und bekannte Grenzen fest. Der Branch ist weder eine verbindliche Produktvorgabe noch die vorgesehene Codebasis für die Neuentwicklung.

## 12. Offene Entscheidungen und Recherchebedarf

1. Welche Rundungs- und Mindestwertregeln gelten für die beibehaltene SmartPoints-Formel?
2. Welche persönlichen Angaben und historische Regel bestimmen das Tagesbudget?
3. Wie wird die ZeroPoints-Liste zuverlässig und inhaltlich/rechtlich vertretbar bereitgestellt?
4. Welche Nährwertquellen dürfen verwendet werden, mit welcher Lizenz und für welche Region?
5. Wie werden rohe und gekochte Lebensmittel sowie Portionsumrechnungen unterschieden?
6. Wie funktionieren Wochenbeginn, Tagesreste, Wochenextras und rückwirkende Korrekturen genau?
7. Werden FitPoints nur angezeigt oder optional auf ein Budget angerechnet?
8. Welche Aktionen müssen im Dashboard besonders schnell erreichbar sein?
9. Wie können lokale Daten exportiert, importiert und vor versehentlichem Verlust geschützt werden?
10. Welche Plattformen, mobilen Browser und Barrierefreiheitsanforderungen sind MVP-Ziel?
11. Welche Abzeichen, Kriterien für aktive Tage und Optionen zum Abschalten der Gamification sind sinnvoll?

## 13. Vorschlag für die Konzept-Neuerstellung

Das nächste Konzept sollte klar zwischen bestätigten Entscheidungen, vorläufigen Annahmen, zu recherchierenden historischen Regeln und späteren Erweiterungen unterscheiden.

Empfohlene Reihenfolge:

1. Nutzerabläufe und Dashboard-Wireframe definieren.
2. Datenfelder und Lebensmittelquellen festlegen.
3. Punkte- und Budgetregeln mit konkreten Beispielen spezifizieren und testen.
4. Lokales Datenmodell und Offline-Verhalten beschreiben.
5. Erst danach technische Architektur und MVP-Backlog bestimmen.
