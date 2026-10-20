import { dayStatus, weeklyStatus } from '../../domain/weekly';
import type { DiaryEntry } from '../../domain/types';

export function DaySummary({
  daily,
  weekly,
  entries,
  date,
  today,
}: {
  daily: number;
  weekly: number;
  entries: DiaryEntry[];
  date: string;
  today: string;
}) {
  const consumed = entries
    .filter((entry) => entry.date === date)
    .reduce((sum, entry) => sum + entry.points, 0);
  const day = dayStatus(daily, consumed);
  const week = weeklyStatus(entries, daily, weekly, date, today);
  return (
    <>
      <section className="day-summary" aria-label="Tagespunkte">
        <div className="remaining">
          <span>Verbleibend</span>
          <strong>{day.remaining}</strong>
          <span>Tagespunkte</span>
        </div>
        <dl>
          <div>
            <dt>Tagesbudget</dt>
            <dd>{daily}</dd>
          </div>
          <div>
            <dt>Verbraucht</dt>
            <dd>{consumed}</dd>
          </div>
        </dl>
        <progress
          max={Math.max(1, daily)}
          value={Math.min(daily, consumed)}
          aria-label="Verbrauchte Tagespunkte"
        />
        {day.extrasUsed > 0 && (
          <p>{day.extrasUsed} Punkte aus Wochenextras verbraucht.</p>
        )}
      </section>
      <section className="card weekly" aria-label="Wochenextras">
        <h2>Wochenextras</h2>
        <dl className="stats">
          <div>
            <dt>Gesamt</dt>
            <dd>{week.total}</dd>
          </div>
          <div>
            <dt>Verbraucht</dt>
            <dd>{week.used}</dd>
          </div>
          <div>
            <dt>Verbleibend</dt>
            <dd>{week.remaining}</dd>
          </div>
        </dl>
        <small>
          Davon {week.transferred} übertragene Tagesreste · Woche ab{' '}
          {week.start}
        </small>
        {week.remaining < 0 && (
          <p>Wochenextras um {-week.remaining} Punkte überschritten.</p>
        )}
      </section>
    </>
  );
}
