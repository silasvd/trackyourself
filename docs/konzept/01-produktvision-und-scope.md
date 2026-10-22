# 01 – Produktvision & Scope

## 1.1 Zweck

TrackYourself ist eine persönliche App zur Erfassung von Lebensmitteln, Aktivitäten und Gewicht.
Sie berechnet Lebensmittelpunkte und Tages-/Wochenbudgets mit dem in Kapitel 04 beschriebenen
Modell. Nutzerdaten werden lokal gespeichert; die Kernfunktionen sind nach dem Laden offline
nutzbar.

## 1.2 Nutzung & Plattform

- Die App ist als Progressive Web App umgesetzt und kann über unterstützte Browser installiert
  werden.
- Die Oberfläche funktioniert auf mobilen und größeren Bildschirmen.
- Die Anwendung ist für eine einzelne Person ausgelegt; Profile und Tagebuchdaten werden nicht
  zwischen Geräten synchronisiert.

## 1.3 Implementierter Umfang

Das erste lieferbare Produkt umfasst:

1. **Profil & Budget**
   - Profilangaben erfassen (Geschlecht, Stillen, Alter, Aktivitätsniveau, Größe, Gewicht).
   - Tages- und Wochenbudget automatisch berechnen (Dok. 04).
   - Budget manuell überschreibbar.
2. **Lebensmittel**
   - Mitgelieferte Basisliste häufiger Grundnahrungsmittel (Dok. 05).
   - Eigene Lebensmittel anlegen, bearbeiten, löschen.
   - Favoriten und zuletzt verwendete Lebensmittel.
   - Portionsauswahl in Gramm/ml und einfachen Alltagseinheiten (Dok. 05).
3. **Ernährungstagebuch**
   - Lebensmittel einem Datum und einer Mahlzeit (Frühstück, Mittagessen, Abendessen, Snacks)
     zuordnen.
   - Einträge bearbeiten/löschen, frühere Tage öffnen und korrigieren.
   - Punkte je Eintrag, Mahlzeit und Tag anzeigen.
4. **Punkte- & Budgetanzeige**
   - Tagesbudget, verbrauchte und verbleibende Tagespunkte.
   - Wochenextras inkl. übertragener Tagesreste (Wochenstart Montag).
5. **Aktivitäten**
   - Manuell erfassen (Aktivität, Dauer, Intensität); Aktivitätspunkte werden **nur angezeigt**.
6. **Gewicht**
   - Gewicht mit Datum erfassen (unregelmäßig möglich), Verlauf als Diagramm, Veränderung seit dem
     ersten und seit dem letzten Eintrag.
7. **Dashboard** als Tagesübersicht mit Datumsauswahl, Tages-/Wochenstatus, Ernährungstagebuch,
   Schnellaktionen zum Hinzufügen/Scannen sowie Aktivitäts- und Gewichtskacheln.
8. **Offline-Nutzung** der gespeicherten Daten und Kernfunktionen nach dem Laden der App (Dok. 06).
9. **Datenexport/-import** als lokale JSON-Sicherung mit Validierung und Bestätigung.
10. **Barcode-Erfassung** mit Kamera oder manueller Eingabe; gezielter Abruf unbekannter Produkte
    von Open Food Facts und lokaler Produktcache.
11. **PWA** mit installierbarer App-Shell und Offline-Start.
12. **Bedienbarkeit:** beschriftete Formulare, Tastaturbedienung und textuelle Statusanzeigen.

Die Details in den folgenden Kapiteln beschreiben diese vorhandenen Funktionen. Nicht vorhandene
Ausbauideen werden außerhalb der Produktdokumentation als Issues nachverfolgt.
