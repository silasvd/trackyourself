import { useState } from 'react';
import type { Dataset, WeightEntry } from '../../domain/types';
import { localDate } from '../../domain/dates';
import { displayDate, number } from '../../app/format';
import { Field } from '../components/Form';
import { WeightChart } from '../components/WeightChart';

export function WeightPage({
  data,
  save,
  busy,
}: {
  data: Dataset;
  save: (next: Dataset) => Promise<boolean>;
  busy: boolean;
}) {
  const [editing, setEditing] = useState<WeightEntry | null>(null);
  const [key, setKey] = useState(0);
  return (
    <section className="card">
      <h1>Gewicht</h1>
      <form
        key={key}
        onSubmit={async (event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const stamp = new Date().toISOString();
          const entry: WeightEntry = {
            id: editing?.id ?? crypto.randomUUID(),
            date: String(fields.get('date')),
            weightKg: Number(fields.get('weightKg')),
            createdAt: editing?.createdAt ?? stamp,
            updatedAt: stamp,
          };
          if (
            await save({
              ...data,
              weightEntries: [
                ...data.weightEntries.filter((value) => value.id !== entry.id),
                entry,
              ],
            })
          ) {
            setEditing(null);
            setKey((value) => value + 1);
          }
        }}
      >
        <div className="form-grid">
          <Field
            label="Datum"
            name="date"
            type="date"
            required
            defaultValue={editing?.date ?? localDate(new Date())}
          />
          <Field
            label="Gewicht (kg)"
            name="weightKg"
            type="number"
            min="1"
            step="0.1"
            required
            defaultValue={editing?.weightKg ?? ''}
          />
        </div>
        <div className="actions">
          <button className="primary" disabled={busy}>
            Gewicht speichern
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setKey((value) => value + 1);
              }}
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>
      <WeightChart entries={data.weightEntries} />
      <h2>Alle Messungen</h2>
      <ul className="entry-list">
        {[...data.weightEntries]
          .sort(
            (a, b) =>
              b.date.localeCompare(a.date) ||
              b.createdAt.localeCompare(a.createdAt),
          )
          .map((entry) => (
            <li key={entry.id}>
              <div>
                <strong>{number(entry.weightKg)} kg</strong>
                <small>{displayDate(entry.date)}</small>
              </div>
              <div className="actions">
                <button
                  disabled={busy}
                  aria-label={`Gewicht vom ${entry.date} bearbeiten`}
                  onClick={() => {
                    setEditing(entry);
                    setKey((value) => value + 1);
                  }}
                >
                  Bearbeiten
                </button>
                <button
                  disabled={busy}
                  aria-label={`Gewicht vom ${entry.date} löschen`}
                  onClick={() =>
                    void save({
                      ...data,
                      weightEntries: data.weightEntries.filter(
                        (value) => value.id !== entry.id,
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
