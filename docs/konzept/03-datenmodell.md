# 03 – Datenmodell

Alle Daten liegen lokal auf dem Gerät (IndexedDB, Dok. 06). Dieses Kapitel beschreibt die
fachlichen Entitäten, ihre Felder und Beziehungen – unabhängig von konkreten Speicherdetails.

## 3.1 Überblick der Entitäten

| Entität | Zweck |
| --- | --- |
| `Profile` | Persönliche Angaben und Budgeteinstellungen (genau ein Datensatz). |
| `Food` | Lebensmittel (Basisliste, eigene, zuletzt verwendete) und Rezepte. |
| `Portion` | Wiederverwendbare Portionsgröße zu einem Lebensmittel. |
| `DiaryEntry` | Ein Tagebucheintrag (Lebensmittel + Portion + Menge + Mahlzeit + Datum). |
| `ActivityEntry` | Eine erfasste Aktivität. |
| `WeightEntry` | Ein Gewichtseintrag. |
| `MealTemplate` | Gespeicherte Mahlzeit (Vorlage) aus mehreren Lebensmitteln. |
| `AppMeta` | Technische Metadaten (Schemaversion, Seed-Status). |

Geldwerte gibt es nicht; alle Mengen sind metrisch (g, ml, kg, cm, Minuten).

## 3.2 `Profile`

| Feld | Typ | Beschreibung |
| --- | --- | --- |
| `id` | string | Fester Schlüssel, z. B. `"singleton"`. |
| `sex` | `"male" \| "female"` | Geschlecht (für Budgetberechnung). |
| `breastfeeding` | boolean | Stillen (für Budgetberechnung). |
| `age` | number (Jahre) | Alter. |
| `activityLevel` | 0\|1\|2\|3 | 0 = keine, 1 = wenig, 2 = durchschnittlich, 3 = schwer. |
| `heightCm` | number | Körpergröße in cm. |
| `weightKg` | number | Aktuelles Gewicht in kg (für Budget; Gewichtsverlauf separat). |
| `dailyBudgetOverride` | number \| null | Manuell gesetztes Tagesbudget; `null` = automatisch. |
| `weeklyBudgetOverride` | number \| null | Manuell gesetztes Wochenbudget; `null` = automatisch. |
| `weekStartsOn` | number | Wochenstarttag; fest `1` (Montag) im MVP. |
| `createdAt` / `updatedAt` | ISO-Datum | Zeitstempel. |

Das effektive Budget ergibt sich aus Override (falls gesetzt) oder aus der Berechnung in Dok. 04.

## 3.3 `Food`

| Feld | Typ | Beschreibung |
| --- | --- | --- |
| `id` | string (UUID) | Eindeutiger Schlüssel. |
| `name` | string | Anzeigename. |
| `category` | string \| null | Kategorie (z. B. „Gemüse"). |
| `per100.kcal` | number \| null | Energie je 100 g/ml. |
| `per100.satFat` | number \| null | Gesättigte Fette (g) je 100 g/ml. |
| `per100.sugar` | number \| null | Zucker (g) je 100 g/ml. |
| `per100.protein` | number \| null | Protein (g) je 100 g/ml. |
| `basis` | `"g" \| "ml"` | Bezugsgröße der Nährwerte. |
| `countsAsZero` | boolean | `true` ⇒ Punkte immer 0 (Dok. 04/05). |
| `source` | `"base" \| "custom"` | Herkunft: mitgelieferte Basisliste oder selbst angelegt. |
| `sourceRef` | string \| null | Quellenverweis (z. B. BLS-Kennung) für Basisdaten. |
| `dataQuality` | `"complete" \| "incomplete"` | Abgeleitet: sind alle Nährwerte vorhanden? |
| `defaultPortionId` | string \| null | Standardportion. |
| `isFavorite` | boolean | Favoritenkennzeichen. |
| `lastUsedAt` | ISO-Datum \| null | Für „zuletzt verwendet". |
| `aliases` | string[] (optional) | Eigene zusätzliche Suchbegriffe (Dok. 05, 5.2.3). |
| `recipe` | Objekt (optional) | Nur bei Rezepten: `ingredients` (`foodId`, `grams`), `servings`, `yieldGrams` (g \| null). |
| `createdAt` / `updatedAt` | ISO-Datum | Zeitstempel. |

Hinweise:
- Fehlende Nährwerte (`null`) sind erlaubt und müssen in der UI erkennbar sein. Aus unvollständigen
  Werten entstehen keine scheinbar exakten Punkte (Dok. 04, Abschnitt fehlende Werte).
- `countsAsZero` ist unabhängig von den Nährwerten und hat Vorrang.
- Suchbegriffe der Basisliste werden mit der App ausgeliefert und nicht gespeichert; `aliases`
  enthält nur selbst ergänzte Begriffe.
- Bei Rezepten sind `per100` und die Portionen („Portion (1/n)", „Ganzes Rezept") aus den Zutaten
  abgeleitet (Dok. 05, 5.6). Rezepte haben Basis `g`, sind nie `countsAsZero` und enthalten keine
  anderen Rezepte.

## 3.4 `Portion`

| Feld | Typ | Beschreibung |
| --- | --- | --- |
| `id` | string (UUID) | Schlüssel. |
| `foodId` | string | Zugehöriges Lebensmittel (oder global, siehe unten). |
| `label` | string | Anzeigename, z. B. „Scheibe", „Stück", „Becher". |
| `grams` | number \| null | Umrechnung in g/ml; `null`, wenn keine belastbare Angabe existiert. |
| `isDefault` | boolean | Standardportion des Lebensmittels. |
| `scope` | `"food" \| "generic"` | `generic` = allgemeine Einheit (g/ml) ohne Gewicht. |

Regel: Eine Umrechnung einer Alltagseinheit in Gramm erfolgt nur bei belastbarer Gewichtsangabe
(`grams` gesetzt). Fehlt sie, bleibt nur die direkte Eingabe in g/ml.

## 3.5 `DiaryEntry`

| Feld | Typ | Beschreibung |
| --- | --- | --- |
| `id` | string (UUID) | Schlüssel. |
| `date` | string (`YYYY-MM-DD`) | Tag (lokale Zeitzone des Geräts). |
| `meal` | `"breakfast" \| "lunch" \| "dinner" \| "snack"` | Mahlzeit. |
| `foodId` | string | Referenz auf `Food`. |
| `foodSnapshot` | Objekt | Kopie der relevanten Food-Werte zum Zeitpunkt des Eintrags. |
| `portionLabel` | string \| null | Verwendete Portionsbezeichnung. |
| `amount` | number | Menge in g/ml (bereits umgerechnet). |
| `points` | number | Berechnete, aufgerundete Punkte dieses Eintrags (Dok. 04). |
| `createdAt` / `updatedAt` | ISO-Datum | Zeitstempel. |

**Snapshot-Prinzip:** Ein Eintrag speichert die zur Bewertung nötigen Food-Werte als `foodSnapshot`
mit. So bleiben historische Einträge korrekt, auch wenn das Lebensmittel später geändert oder
gelöscht wird. `points` wird beim Speichern/Ändern berechnet und persistiert.

## 3.6 `ActivityEntry`

| Feld | Typ | Beschreibung |
| --- | --- | --- |
| `id` | string (UUID) | Schlüssel. |
| `date` | string (`YYYY-MM-DD`) | Tag. |
| `activityType` | string | z. B. „Gehen", „Radfahren", „Hausarbeit". |
| `durationMin` | number | Dauer in Minuten. |
| `intensity` | `"low" \| "medium" \| "high"` | Intensität. |
| `activityPoints` | number | Berechnete Aktivitätspunkte (nur Anzeige). |
| `createdAt` / `updatedAt` | ISO-Datum | Zeitstempel. |

## 3.7 `WeightEntry`

| Feld | Typ | Beschreibung |
| --- | --- | --- |
| `id` | string (UUID) | Schlüssel. |
| `date` | string (`YYYY-MM-DD`) | Tag des Wiegens. |
| `weightKg` | number | Gewicht in kg. |
| `createdAt` / `updatedAt` | ISO-Datum | Zeitstempel. |

Mehrere, unregelmäßige Einträge sind erlaubt. Bei mehreren Einträgen pro Tag gilt der zuletzt
erfasste als Tageswert für die Diagrammdarstellung.

## 3.8 `MealTemplate`

| Feld | Typ | Beschreibung |
| --- | --- | --- |
| `id` | string (UUID) | Schlüssel. |
| `name` | string | Anzeigename, z. B. „Porridge". |
| `meal` | `"breakfast" \| "lunch" \| "dinner" \| "snack"` | Vorgeschlagene Mahlzeit. |
| `items` | Liste | Mindestens ein Eintrag mit `foodId`, `amount` (g/ml, > 0), `portionLabel`. |
| `createdAt` / `updatedAt` | ISO-Datum | Zeitstempel. |

Vorlagen speichern keinen Snapshot: Beim Eintragen werden Punkte mit den aktuellen Nährwerten
berechnet, die entstehenden Tagebucheinträge erhalten wie gewohnt ihren Snapshot.

## 3.9 `AppMeta`

| Feld | Typ | Beschreibung |
| --- | --- | --- |
| `schemaVersion` | number | Version des lokalen Datenschemas (für Migrationen), aktuell 3. |
| `seededBaseFoodsVersion` | number | Version der eingespielten Basisliste. |

## 3.10 Beziehungen & Integrität

- `DiaryEntry.foodId → Food.id` (mit zusätzlichem `foodSnapshot` als Ausfallsicherung).
- `Portion.foodId → Food.id`.
- `Food.recipe.ingredients[].foodId → Food.id` (kein Rezept); eine verwendete Zutat kann nicht
  gelöscht werden.
- `MealTemplate.items[].foodId → Food.id`; beim Löschen eines Lebensmittels wird es aus Vorlagen
  entfernt, leere Vorlagen entfallen.
- Löschen eines `Food`: bestehende `DiaryEntry` bleiben dank Snapshot gültig; das Lebensmittel
  verschwindet nur aus Auswahl/Favoriten.
- Alle Mengen- und Nährwertfelder sind nicht-negativ; Validierung erfolgt vor dem Speichern.

## 3.11 Export-/Importformat

Der Export (Flow H) umfasst **alle** Entitäten in einer einzigen JSON-Datei:

```
{
  "schemaVersion": <number>,
  "exportedAt": "<ISO-Datum>",
  "profile": { ... },
  "foods": [ ... ],
  "portions": [ ... ],
  "diaryEntries": [ ... ],
  "activityEntries": [ ... ],
  "weightEntries": [ ... ],
  "mealTemplates": [ ... ]
}
```

Der Import prüft `schemaVersion`, validiert die Struktur und ersetzt den bestehenden Datenbestand
nach Bestätigung vollständig. Teil-/Fehlerhafte Dateien werden abgewiesen, ohne vorhandene Daten zu
beschädigen. Sicherungen der Schemaversion 2 (ohne Vorlagen) werden beim Import migriert
(`mealTemplates: []`); geschrieben wird immer Version 3.
