import { newId } from '../../app/id';
import { useState } from 'react';
import { activityPoints } from '../../domain/activity';
import { localDate } from '../../domain/dates';
import type { ActivityEntry, Dataset, Intensity } from '../../domain/types';
import { displayDate } from '../../app/format';
import { Field } from '../components/Form';

export function ActivityPage({
  data,
  save,
  busy,
}: {
  data: Dataset;
  save: (next: Dataset) => Promise<boolean>;
  busy: boolean;
}) {
  const [entry, setEntry] = useState<ActivityEntry | null>(null);
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState<Intensity>('medium');
  const [key, setKey] = useState(0);
  return (
    <section className="card">
      <h1>Aktivität</h1>
      <p>
        Aktivitätspunkte werden nur angezeigt und nicht mit deinem Essensbudget
        verrechnet.
      </p>
      <form
        key={key}
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const stamp = new Date().toISOString();
          const next: ActivityEntry = {
            id: entry?.id ?? newId(),
            date: String(form.get('date')),
            activityType: String(form.get('activityType')).trim(),
            durationMin: duration,
            intensity,
            activityPoints: activityPoints(duration, intensity),
            createdAt: entry?.createdAt ?? stamp,
            updatedAt: stamp,
          };
          if (
            await save({
              ...data,
              activityEntries: [
                ...data.activityEntries.filter((value) => value.id !== next.id),
                next,
              ],
            })
          ) {
            setEntry(null);
            setKey((value) => value + 1);
            setDuration(30);
            setIntensity('medium');
          }
        }}
      >
        <Field
          label="Datum"
          name="date"
          type="date"
          required
          defaultValue={entry?.date ?? localDate(new Date())}
        />
        <Field
          label="Aktivität"
          name="activityType"
          required
          defaultValue={entry?.activityType ?? ''}
          placeholder="z. B. Gehen, Radfahren"
        />
        <Field
          label="Dauer (Minuten)"
          type="number"
          required
          min="1"
          step="1"
          value={Number.isNaN(duration) ? '' : duration}
          onChange={(event) => setDuration(event.target.valueAsNumber)}
        />
        <label>
          Intensität
          <select
            value={intensity}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'low' || value === 'medium' || value === 'high')
                setIntensity(value);
            }}
          >
            <option value="low">Niedrig</option>
            <option value="medium">Mittel</option>
            <option value="high">Hoch</option>
          </select>
        </label>
        <output aria-live="polite">
          {Number.isFinite(duration)
            ? activityPoints(duration, intensity)
            : '–'}{' '}
          Aktivitätspunkte
        </output>
        <div className="actions">
          <button className="primary" disabled={busy}>
            Aktivität speichern
          </button>
          {entry && (
            <button
              type="button"
              onClick={() => {
                setEntry(null);
                setKey((value) => value + 1);
              }}
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>
      <h2>Erfasste Aktivitäten</h2>
      {!data.activityEntries.length && <p>Noch keine Aktivitäten erfasst.</p>}
      <ul className="entry-list">
        {[...data.activityEntries]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((value) => (
            <li key={value.id}>
              <div>
                <strong>{value.activityType}</strong>
                <small>
                  {displayDate(value.date)} · {value.durationMin} Min. ·{' '}
                  {value.activityPoints} Punkte
                </small>
              </div>
              <div className="actions">
                <button
                  disabled={busy}
                  aria-label={`${value.activityType} bearbeiten`}
                  onClick={() => {
                    setEntry(value);
                    setDuration(value.durationMin);
                    setIntensity(value.intensity);
                    setKey((current) => current + 1);
                  }}
                >
                  Bearbeiten
                </button>
                <button
                  disabled={busy}
                  aria-label={`${value.activityType} löschen`}
                  onClick={() =>
                    void save({
                      ...data,
                      activityEntries: data.activityEntries.filter(
                        (item) => item.id !== value.id,
                      ),
                    })
                  }
                >
                  Löschen
                </button>
              </div>
            </li>
          ))}
      </ul>
    </section>
  );
}
