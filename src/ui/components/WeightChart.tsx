import { weightHistory } from '../../domain/weight';
import type { WeightEntry } from '../../domain/types';
import { displayDate, number } from '../../app/format';

export function WeightChart({ entries }: { entries: WeightEntry[] }) {
  const history = weightHistory(entries);
  if (!history.last)
    return <p>Noch keine Gewichtseinträge. Erfasse deinen ersten Wert.</p>;
  const values = history.daily.map((entry) => entry.weightKg);
  const low = Math.min(...values) - 1;
  const high = Math.max(...values) + 1;
  const start = Date.parse(history.daily[0].date);
  const span = Math.max(86400000, Date.parse(history.last.date) - start);
  const points = history.daily.map((entry) => ({
    x: 35 + ((Date.parse(entry.date) - start) / span) * 330,
    y: 160 - ((entry.weightKg - low) / (high - low)) * 130,
  }));
  return (
    <section aria-label="Gewichtsverlauf">
      <dl className="stats">
        <div>
          <dt>Letzter Wert</dt>
          <dd>{number(history.last.weightKg)} kg</dd>
        </div>
        <div>
          <dt>Seit erstem Wert</dt>
          <dd>{number(history.sinceFirst!)} kg</dd>
        </div>
        <div>
          <dt>Seit letztem Wert</dt>
          <dd>
            {history.sincePrevious === null
              ? '–'
              : `${number(history.sincePrevious)} kg`}
          </dd>
        </div>
      </dl>
      <svg
        role="img"
        aria-label="Gewichtsdiagramm; Werte stehen in der Tabelle darunter"
        viewBox="0 0 400 200"
      >
        <text x="5" y="20">
          {number(high)} kg
        </text>
        <text x="5" y="185">
          {number(low)} kg
        </text>
        <polyline
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        {points.map((point, index) => (
          <circle
            key={history.daily[index].id}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="currentColor"
          />
        ))}
      </svg>
      <table>
        <caption>Tageswerte (zuletzt erfasster Wert je Datum)</caption>
        <thead>
          <tr>
            <th>Datum</th>
            <th>Gewicht</th>
          </tr>
        </thead>
        <tbody>
          {history.daily.map((entry) => (
            <tr key={entry.id}>
              <td>{displayDate(entry.date)}</td>
              <td>{number(entry.weightKg)} kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
