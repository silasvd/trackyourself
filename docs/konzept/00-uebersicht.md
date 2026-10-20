# TrackYourself – Umsetzungskonzept

> **Status:** Verbindliches Umsetzungskonzept für die Neuentwicklung. Dieses Dokument und die
> verlinkten Teildokumente bilden gemeinsam die Spezifikation für das erste lieferbare Produkt
> (MVP) und die geplanten Ausbaustufen.

TrackYourself ist eine schlanke, offlinefähige App zur Erfassung von Lebensmitteln, Punkten,
Aktivitäten und Gewicht. Die Berechnung basiert auf einem einfachen, eigenständigen Punktemodell.

## Dokumentenübersicht

| Nr. | Dokument | Inhalt |
| --- | --- | --- |
| 00 | **Übersicht** (dieses Dokument) | Einstieg, Begriffe, Grundregeln, Lesereihenfolge |
| 01 | [Produktvision & Scope](01-produktvision-und-scope.md) | Ziele, MVP-Abgrenzung, Nicht-Ziele |
| 02 | [Nutzerflows & Dashboard](02-nutzerflows-und-dashboard.md) | Abläufe, Dashboard-Aufbau, Bedienbarkeit |
| 03 | [Datenmodell](03-datenmodell.md) | Entitäten, Felder, lokale Speicherung |
| 04 | [Punkte- & Budgetlogik](04-punkte-und-budgetlogik.md) | Formeln, Rundung, Rechenbeispiele, Edge Cases |
| 05 | [Lebensmittel & Datenquellen](05-lebensmittel-und-datenquellen.md) | BLS 4.0, Portionen, 0‑Punkte‑Liste |
| 06 | [Offline-Architektur](06-offline-architektur.md) | Persistenz, Caching, Datensicherheit |
| 07 | [Technische Architektur](07-technische-architektur.md) | Stack, Schichten, Projektstruktur |
| 08 | [Testkonzept](08-testkonzept.md) | Teststrategie, konkrete Testfälle, CI |
| 09 | [MVP-Backlog & Roadmap](09-mvp-backlog-und-roadmap.md) | Arbeitspakete, Reihenfolge, Ausbaustufen |

Empfohlene Lesereihenfolge: 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09.

## Begriffe (verbindlich)

Diese Begriffe werden in der gesamten App (UI) und in allen Dokumenten einheitlich verwendet.

| Begriff | Bedeutung |
| --- | --- |
| **Punkte** | Bewertungseinheit eines Lebensmittels bzw. einer Mahlzeit (siehe Dok. 04). |
| **Tagespunkte / Tagesbudget** | Persönlich berechnetes Punktebudget pro Tag. |
| **Wochenpunkte / Wochenextras** | Zusätzliches, flexibel über die Woche einsetzbares Budget. |
| **Tagesreste** | Nicht verbrauchte Tagespunkte, die begrenzt ins Wochenbudget übertragen werden. |
| **Aktivitätspunkte** | Punkte aus körperlicher Aktivität. Werden im MVP nur angezeigt (kein Verrechnen mit dem Essensbudget). |
| **0‑Punkte‑Lebensmittel** | Lebensmittel, die unabhängig von der Nährwertformel mit 0 Punkten bewertet werden. |
| **Verbleibend** | Noch verfügbare **Tagespunkte** des aktuellen Tages. Wochenextras werden getrennt ausgewiesen (siehe Dok. 02/04). |

> **Namenskonvention:** Es werden ausschließlich die oben genannten, neutralen Begriffe
> verwendet. Markennamen oder markenrechtlich geschützte Programm-/Feature-Bezeichnungen kommen
> weder in der App noch in der Dokumentation vor.

## Grundregeln auf einen Blick

1. **Punkte Lebensmittel:** Nährwertformel (Dok. 04), Ergebnis **immer aufgerundet** auf ganze
   Punkte. 0‑Punkte‑Lebensmittel bleiben 0. Negative Werte werden auf 0 gekappt.
2. **Tagesbudget:** Wird aus den Profilangaben berechnet (Dok. 04) und kann vom Nutzer jederzeit
   manuell überschrieben werden – ohne zusätzliche Hinweise.
3. **Wochenextras:** Fester Wochenwert plus bis zu 4 übertragene Tagesreste pro Tag.
   Wochenstart ist **Montag**.
4. **Sprache:** UI und Dokumentation auf Deutsch; Quelltext und Code-Kommentare auf Englisch.
5. **Datenhaltung:** Vollständig lokal auf dem Gerät (IndexedDB). Kein Server, kein Konto, kein
   geräteübergreifender Sync im MVP.
6. **Barrierefreiheit:** Information nie allein über Farbe. Zahlen und Beschriftungen sind führend.
