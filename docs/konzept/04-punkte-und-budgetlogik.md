# 04 – Punkte- & Budgetlogik

Dieses Kapitel ist die verbindliche Rechenspezifikation. Alle hier beschriebenen Regeln werden
durch automatische Tests abgesichert (Dok. 08). Alle Formeln sind eigenständig und bewusst einfach
gehalten.

## 4.1 Punkte eines Lebensmittels

### 4.1.1 Grundformel (je 100 g bzw. 100 ml)

```
P100 = kcal × 0,0305
     + gesättigte_Fette_g × 0,275
     + Zucker_g × 0,12
     − Protein_g × 0,098
```

- Alle Nährwerte beziehen sich auf 100 g (feste Stoffe) bzw. 100 ml (Flüssigkeiten).
- Das Ergebnis `P100` ist ein Zwischenwert mit Nachkommastellen (noch nicht gerundet).

### 4.1.2 Umrechnung auf die Portion

```
P_roh = P100 × (Menge_in_g_oder_ml / 100)
```

`Menge_in_g_oder_ml` ist die tatsächlich verzehrte Menge (nach Portionsumrechnung, Dok. 05).

### 4.1.3 Rundung, Mindestwert, Vorzeichen (verbindlich)

Reihenfolge der Regeln:

1. **0‑Punkte‑Lebensmittel:** Ist `Food.countsAsZero = true`, sind die Punkte **immer 0** –
   unabhängig von Menge und Nährwerten. Keine weitere Rechnung.
2. **Negativ auf 0 kappen:** Ist `P_roh < 0`, gilt `P_roh = 0`. (Tritt in der Praxis kaum auf, wird
   aber definiert.)
3. **Aufrunden:** Der verbleibende Wert wird **immer auf die nächste ganze Zahl aufgerundet**
   (`ceil`). Dadurch lässt sich nicht durch sehr kleine Mengen „schummeln".
   - Beispiel: `P_roh = 0,1 → 1`; `P_roh = 3,0 → 3`; `P_roh = 3,01 → 4`.
   - Sonderfall: `P_roh = 0` (exakt) ⇒ Ergebnis `0`.

Der so ermittelte Wert wird als `DiaryEntry.points` gespeichert. **Die Aufrundung erfolgt je
Eintrag** (nicht erst in der Tagessumme).

### 4.1.4 Fehlende oder unvollständige Nährwerte

- Fehlt mindestens einer der vier Werte (`kcal`, `satFat`, `sugar`, `protein`), gilt das
  Lebensmittel als `dataQuality = "incomplete"`.
- Für die Berechnung werden fehlende Werte **nicht** stillschweigend als 0 angenommen. Stattdessen:
  - Fehlt `kcal`, kann **kein** Punktewert berechnet werden. Der Eintrag wird mit dem Hinweis
    „Punkte nicht berechenbar" markiert und zählt mit 0 in die Tagessumme, erkennbar als unvollständig.
  - Fehlen nur Begleitwerte (`satFat`, `sugar` oder `protein`), wird der fehlende Summand als 0
    behandelt, der Eintrag aber als „geschätzt/unvollständig" gekennzeichnet.
- Ziel: Aus unvollständigen Daten entstehen keine scheinbar exakten Werte; die Unsicherheit bleibt
  sichtbar.

### 4.1.5 Rechenbeispiele Lebensmittel

| Beispiel | Nährwerte /100 g | Menge | P100 | P_roh | Punkte |
| --- | --- | --- | --- | --- | --- |
| Haferflocken | 370 kcal; satFat 1,3; Zucker 1,0; Protein 13,5 | 50 g | 370·0,0305 + 1,3·0,275 + 1,0·0,12 − 13,5·0,098 = **10,37** | 5,18 | **6** |
| Olivenöl | 884 kcal; satFat 14; Zucker 0; Protein 0 | 10 g | 884·0,0305 + 14·0,275 = **30,82** | 3,08 | **4** |
| Apfel (0‑Punkte) | — | 150 g | — | — | **0** |
| Magerquark | 67 kcal; satFat 0,1; Zucker 4,0; Protein 12 | 200 g | 67·0,0305 + 0,1·0,275 + 4·0,12 − 12·0,098 = **1,36** | 2,72 | **3** |

> Zwischenwerte sind gerundet dargestellt; maßgeblich ist die ungerundete Rechnung bis zum finalen
> Aufrunden.

## 4.2 Tagesbudget (Punkte pro Tag)

### 4.2.1 Berechnung

Das Tagesbudget wird aus den Profilangaben berechnet. Die Logik (Reihenfolge der Summanden):

```
budget = 0
budget += (Geschlecht männlich) ? 8 : 2
budget += (Stillen) ? 10 : 0

// Alter (Jahre)
if      Alter < 27  budget += 4
else if Alter < 38  budget += 3
else if Alter < 48  budget += 2
else if Alter < 58  budget += 1
// sonst + 0

// Aktivitätsniveau: 0=keine, 1=wenig, 2=durchschnittlich, 3=schwer
budget += [0, 2, 4, 6][Aktivitätsniveau]

// Größe (cm)
if      Größe < 155   budget += 0
else if Größe <= 179  budget += 1   // 155–179 cm
else                  budget += 2   // > 179 cm

// Grundwert
budget += 8

// Gewicht (kg)
if Gewicht > 45  budget += (Gewicht − 45) / 4

tagesbudget = runde(budget)   // kaufmännisch auf ganze Punkte
```

Erläuterung der Aktivitätsstufen (für die UI):
- **keine** – keinerlei Bewegung.
- **wenig** – überwiegend sitzend („Bürotätigkeit").
- **durchschnittlich** – viel Bewegung am Arbeitsplatz oder bis zu 30 Min. Sport/Tag.
- **schwer** – mehr als 30 Min. Sport/Tag oder körperlich anstrengende Arbeit.

> Hinweis zur Größengrenze: Der Bereich 155–179 cm ergibt +1, über 179 cm ergibt +2. Die
> Grenze bei 179 cm ist eindeutig geschlossen (keine Lücke).

### 4.2.2 Wochenpunkte (Wochenextras-Grundwert)

```
wochen_grundwert = runde(budget × 1,4)
```

- `budget` ist der **ungerundete** Tageswert aus 4.2.1 (vor der kaufmännischen Rundung des
  Tagesbudgets), damit kleine Rundungseffekte sich nicht aufschaukeln.
- Das Ergebnis wird auf ganze Punkte gerundet.

### 4.2.3 Manuelles Überschreiben

- `Profile.dailyBudgetOverride` bzw. `weeklyBudgetOverride` ersetzen – falls gesetzt – den
  berechneten Wert vollständig.
- Das Überschreiben erfolgt über ein einfaches Zahlenfeld, **ohne** zusätzliche Hinweise oder
  Warnungen.

### 4.2.4 Rechenbeispiel Budget

Profil: männlich, nicht stillend, 34 Jahre, Aktivität „wenig" (1), 185 cm, 95 kg.

```
8 (männlich)
+ 0 (nicht stillend)
+ 3 (Alter 34 → <38)
+ 2 (Aktivität 1)
+ 2 (Größe 185 > 179)
+ 8 (Grundwert)
+ 12,5 ((95 − 45) / 4)
= 35,5  (ungerundet)

Tagesbudget  = runde(35,5)        = 36
Wochenpunkte = runde(35,5 × 1,4)  = runde(49,7) = 50
```

Weiteres Beispiel: weiblich, nicht stillend, 30 Jahre, Aktivität „durchschnittlich" (2), 165 cm,
70 kg → `2 + 0 + 3 + 4 + 1 + 8 + 6,25 = 24,25` → Tagesbudget **24**, Wochenpunkte **34**.

## 4.3 Tagesreste & Wochenextras

### 4.3.1 Wochenmodell

- **Wochenstart:** Montag (`weekStartsOn = 1`). Eine Woche umfasst Montag–Sonntag.
- **Wochenextras gesamt** eines laufenden Zeitraums =
  `wochen_grundwert` + Summe der übertragenen Tagesreste der bereits abgeschlossenen Tage dieser
  Woche.

### 4.3.2 Tagesreste (Übertrag)

- Am Ende eines Tages werden **nicht verbrauchte Tagespunkte** ermittelt:
  `tagesrest = max(0, tagesbudget − verbrauchte_tagespunkte)`.
- Davon werden **bis zu 4 Punkte** in das Wochenbudget übertragen:
  `übertrag = min(4, tagesrest)`.
- Darüber hinausgehende Reste **verfallen**.
- Ein Tag mit **ohne Einträge** hat `verbrauchte_tagespunkte = 0` und überträgt daher genau
  `min(4, tagesbudget)` (in der Praxis 4) – es sei denn, der Tag liegt in der Zukunft (siehe unten).

### 4.3.3 Verbrauchsreihenfolge

Beim Eintragen von Lebensmitteln wird in dieser Reihenfolge abgebucht:

1. **Tagesbudget** des jeweiligen Tages.
2. **Wochenextras** (Grundwert + bereits übertragene Tagesreste), sobald das Tagesbudget
   überschritten ist.

Aktivitätspunkte werden im MVP **nicht** verrechnet.

### 4.3.4 Zeitliche Abgrenzung

- **Vergangene Tage** (vor heute): gelten als abgeschlossen; ihr Übertrag ist fix und fließt in die
  Wochenextras ein.
- **Heutiger Tag:** noch nicht abgeschlossen; sein möglicher Übertrag wird **nicht** vorab gutgeschrieben
  (erst am Tageswechsel). Verbrauch des heutigen Tages bucht zuerst Tagesbudget, dann die bereits
  vorhandenen Wochenextras.
- **Zukünftige Tage:** erzeugen keinen Übertrag.

### 4.3.5 Rückwirkende Änderungen

- Wird ein vergangener Tag nachträglich geändert (Flow D), werden dessen `verbrauchte_tagespunkte`,
  `tagesrest` und `übertrag` **neu berechnet**.
- Daraus folgt eine Neuberechnung der Wochenextras der betroffenen Woche. Die Logik ist rein
  ableitend (aus den gespeicherten Einträgen), sodass jede Anzeige stets konsistent aus den Rohdaten
  entsteht und rückwirkende Korrekturen automatisch korrekt sind.

### 4.3.6 Rechenbeispiel Woche

Tagesbudget 24, Wochen-Grundwert 34. Verlauf Mo–Mi (Do heute):

| Tag | Verbraucht | Tagesrest | Übertrag (max 4) |
| --- | --- | --- | --- |
| Mo | 22 | 2 | 2 |
| Di | 24 | 0 | 0 |
| Mi | 10 | 14 | 4 (Rest 10 verfällt) |

Wochenextras am Do (heute) = 34 + (2 + 0 + 4) = **40** verfügbar (abzüglich bereits aus Extras
verbrauchter Punkte der Woche).

## 4.4 Aktivitätspunkte (nur Anzeige)

Transparente, eigenständige Näherung auf Basis von Dauer und Intensität:

```
aktivitätspunkte = runde( Dauer_min / 60 × faktor(intensität) )
faktor: low = 2, medium = 4, high = 6
```

- Beispiel: 45 Min. „medium" → `0,75 × 4 = 3` → **3** Aktivitätspunkte.
- Aktivitätspunkte werden ausschließlich angezeigt und im MVP nicht mit dem Essensbudget verrechnet.

## 4.5 Rundungs- und Formatregeln (Zusammenfassung)

| Wert | Regel |
| --- | --- |
| Punkte je Eintrag | immer **aufrunden** (`ceil`) auf ganze Zahl; 0‑Punkte = 0; negativ → 0 |
| Tagesbudget | kaufmännisch runden auf ganze Zahl |
| Wochen-Grundwert | `runde(ungerundetes_tagesbudget × 1,4)` |
| Übertrag Tagesrest | `min(4, max(0, tagesbudget − verbraucht))` |
| Aktivitätspunkte | kaufmännisch runden auf ganze Zahl |
| Anzeige Summen | ganze Punkte; keine Nachkommastellen in der UI |
