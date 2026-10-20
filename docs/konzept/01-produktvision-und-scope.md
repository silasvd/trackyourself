# 01 – Produktvision & Scope

## 1.1 Vision

TrackYourself ist eine schlanke, moderne und persönliche App, mit der eine einzelne Person im
Alltag schnell erfassen kann, was sie isst, wie viel sie sich bewegt und wie sich ihr Gewicht
entwickelt. Die App bewertet Lebensmittel mit einem einfachen Punktemodell und zeigt verständlich,
wie viel vom Tages- und Wochenbudget noch übrig ist. Kernfunktionen stehen offline zur Verfügung.

Leitsätze:

- **Schnelle Erfassung vor Funktionsfülle.** Ein Eintrag soll mit wenigen Schritten gelingen.
- **Verständlichkeit vor Präzision.** Klare Zahlen und eine nachvollziehbare Logik sind wichtiger
  als wissenschaftliche Exaktheit. Eine kleine Ungenauigkeit der Formeln ist akzeptabel.
- **Lokal und privat.** Die Daten bleiben auf dem Gerät.
- **Klein und wartbar.** Der Funktionsumfang bleibt bewusst fokussiert.

## 1.2 Zielnutzer & Plattform

- **Zielnutzer:** Einzelperson, die ihre Ernährung und ihr Gewicht eigenständig verfolgen möchte.
- **Primäre Plattform:** Progressive Web App (PWA), installierbar auf dem Smartphone.
- **Primäre Geräte/Browser:** aktuelle mobile Browser (iOS Safari, Android Chrome); zusätzlich
  nutzbar auf dem Desktop (aktuelle Chromium-/Firefox-/Safari-Versionen). Keine Unterstützung für
  veraltete Browser.
- **Ausrichtung:** „Mobile first", einhändige Bedienung, große Tap-Ziele.

## 1.3 MVP-Umfang (verbindlich)

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
7. **Dashboard** als zentrale Tagesübersicht (Dok. 02).
8. **Offline-Nutzung** aller gespeicherten Daten und Kernfunktionen (Dok. 06).
9. **Datenexport/-import** als lokale Sicherung (JSON-Datei) – bewusst früh im MVP, um
   Datenverlust vorzubeugen.

## 1.4 Später geplant (nicht im MVP)

- Barcode-Scan und Online-Produktsuche (z. B. Open Food Facts).
- Anrechnung von Aktivitätspunkten auf das Essensbudget (optional, abschaltbar).
- Automatische Budget-Nachführung bei Gewichtsänderung.
- Erweiterte Statistiken/Auswertungen über die Tages-/Wochenansicht hinaus.
- Cloud-Backup oder geräteübergreifende Synchronisierung.

## 1.5 Nicht geplant

- Rezepte, Rezeptplanung, Wochenmenüs, Einkaufslisten.
- Community- und Social-Funktionen.
- KI-basierte Ernährungsempfehlungen.
- Automatische Bewegungserfassung, GPS, Fitnessgeräte-Anbindung.
- Gamification (Abzeichen, Streaks).
- Mehrere Punkteprogramme parallel.
- Nutzerkonten und Serverbackend.

## 1.6 Erfolgskriterien für das MVP

- Ein Lebensmittel lässt sich vom Dashboard aus in höchstens drei Interaktionen (Antippen →
  auswählen → Portion bestätigen) eintragen.
- Tages- und Wochenstatus sind ohne Scrollen auf dem Dashboard erkennbar.
- Die App startet und funktioniert vollständig offline (nach erstem Laden).
- Alle Berechnungen sind durch automatische Tests abgedeckt (Dok. 08).
- Ein vollständiger Export/Import stellt alle Nutzerdaten identisch wieder her.
