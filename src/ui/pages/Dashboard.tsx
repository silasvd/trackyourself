import { newId } from '../../app/id';
import { useState } from 'react';
import { budgets } from '../../domain/budget';
import { shiftDate } from '../../domain/dates';
import { weightHistory } from '../../domain/weight';
import { displayDate, meals, number } from '../../app/format';
import { copyEntries, templateFromEntries } from '../../domain/templates';
import type { Dataset, DiaryEntry, Meal } from '../../domain/types';
import { DaySummary } from '../components/DaySummary';
import { Field, Modal } from '../components/Form';
import { EntryForm, PointLabel } from '../components/EntryForm';
import { FoodPicker } from './FoodPicker';

export function Dashboard({
  data,
  save,
  busy,
  today,
  date,
  setDate,
  navigate,
}: {
  data: Dataset;
  save: (next: Dataset) => Promise<boolean>;
  busy: boolean;
  today: string;
  date: string;
  setDate: (date: string) => void;
  navigate: (page: 'activity' | 'weight' | 'profile') => void;
}) {
  const [adding, setAdding] = useState<{ meal?: Meal } | null>(null);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [saving, setSaving] = useState<Meal | null>(null);
  const budget = data.profile ? budgets(data.profile) : null;
  const dailyEntries = data.diaryEntries.filter((entry) => entry.date === date);
  const previousDay = shiftDate(date, -1);
  const previousEntries = data.diaryEntries.filter(
    (entry) => entry.date === previousDay,
  );
  const activity = data.activityEntries
    .filter((entry) => entry.date === date)
    .reduce((sum, entry) => sum + entry.activityPoints, 0);
  const latestWeight = weightHistory(data.weightEntries).last;
  return (
    <>
      <h1 className="sr-only">Dein Tag</h1>
      <div className="date-navigation">
        <button
          aria-label="Vorheriger Tag"
          onClick={() => setDate(shiftDate(date, -1))}
        >
          ←
        </button>
        <label className="date-field">
          <span className="sr-only">Tag auswählen</span>
          <input
            type="date"
            required
            value={date}
            onChange={(event) => {
              if (event.target.value) setDate(event.target.value);
            }}
          />
        </label>
        <button
          aria-label="Nächster Tag"
          onClick={() => setDate(shiftDate(date, 1))}
        >
          →
        </button>
        <button onClick={() => setDate(today)}>Heute</button>
      </div>
      {budget ? (
        <DaySummary
          daily={budget.daily}
          weekly={budget.weekly}
          entries={data.diaryEntries}
          date={date}
          today={today}
        />
      ) : (
        <section className="card">
          <h2>Willkommen bei TrackYourself</h2>
          <p>Erfasse dein Profil, um dein Tages- und Wochenbudget zu sehen.</p>
          <button className="primary" onClick={() => navigate('profile')}>
            Profil einrichten
          </button>
        </section>
      )}
      <button
        className="primary add-food"
        aria-label="Lebensmittel hinzufügen"
        title="Lebensmittel hinzufügen"
        onClick={() => setAdding({})}
      >
        +
      </button>
      <section className="card">
        <h2>Ernährungstagebuch</h2>
        {!dailyEntries.length && (
          <p>
            Noch keine Einträge am {displayDate(date)}. Füge dein erstes
            Lebensmittel hinzu.
          </p>
        )}
        {(Object.entries(meals) as [Meal, string][]).map(([meal, label]) => {
          const entries = dailyEntries.filter((entry) => entry.meal === meal);
          const previous = previousEntries.filter(
            (entry) => entry.meal === meal,
          );
          return (
            <section key={meal} className="meal" aria-label={label}>
              <h3>
                {label}
                <span>
                  {entries.reduce((sum, entry) => sum + entry.points, 0)} Punkte
                </span>
              </h3>
              <div className="meal-actions">
                <button
                  aria-label={`Zu ${label} hinzufügen`}
                  onClick={() => setAdding({ meal })}
                >
                  + {label}
                </button>
                {previous.length > 0 && (
                  <button
                    aria-label={`${label} vom Vortag übernehmen`}
                    disabled={busy}
                    onClick={() =>
                      void save({
                        ...data,
                        diaryEntries: [
                          ...data.diaryEntries,
                          ...copyEntries(previous, {
                            date,
                            stamp: new Date().toISOString(),
                            id: () => newId(),
                          }),
                        ],
                      })
                    }
                  >
                    Vom Vortag übernehmen
                  </button>
                )}
                {entries.some((entry) =>
                  data.foods.some((food) => food.id === entry.foodId),
                ) && (
                  <button
                    aria-label={`${label} als Vorlage speichern`}
                    onClick={() => setSaving(meal)}
                  >
                    Als Vorlage speichern
                  </button>
                )}
              </div>
              <ul className="entry-list">
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      className="diary-entry"
                      aria-label={`${entry.foodSnapshot.name} bearbeiten`}
                      onClick={() => setEditing(entry)}
                    >
                      <span>
                        <strong>{entry.foodSnapshot.name}</strong>
                        <small>
                          {number(entry.amount)} {entry.foodSnapshot.basis}
                          {entry.portionLabel ? ` · ${entry.portionLabel}` : ''}
                        </small>
                      </span>
                      <span>
                        <PointLabel entry={entry} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </section>
      <div className="tiles">
        <button className="card" onClick={() => navigate('activity')}>
          <strong>{activity} Aktivitätspunkte</strong>
          <small>Nur Anzeige · Aktivität öffnen</small>
        </button>
        <button className="card" onClick={() => navigate('weight')}>
          <strong>
            {latestWeight
              ? `${number(latestWeight.weightKg)} kg`
              : 'Noch kein Gewicht'}
          </strong>
          <small>Gewichtsverlauf öffnen</small>
        </button>
      </div>
      {adding && (
        <FoodPicker
          data={data}
          date={date}
          save={save}
          busy={busy}
          initialMeal={adding.meal}
          onClose={() => setAdding(null)}
        />
      )}
      {saving && (
        <Modal title="Als Vorlage speichern" onClose={() => setSaving(null)}>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const name = String(
                new FormData(event.currentTarget).get('name'),
              ).trim();
              const template = templateFromEntries(
                {
                  id: newId(),
                  name,
                  meal: saving,
                  stamp: new Date().toISOString(),
                },
                dailyEntries.filter((entry) => entry.meal === saving),
                data.foods,
              );
              if (
                await save({
                  ...data,
                  mealTemplates: [...data.mealTemplates, template],
                })
              )
                setSaving(null);
            }}
          >
            <p>
              Speichert alle Lebensmittel und Mengen von {meals[saving]} am{' '}
              {displayDate(date)}. Beim Eintragen werden aktuelle Nährwerte
              verwendet.
            </p>
            <Field
              label="Name der Vorlage"
              name="name"
              data-autofocus
              required
              defaultValue={meals[saving]}
            />
            <button className="primary" disabled={busy}>
              Vorlage speichern
            </button>
          </form>
        </Modal>
      )}
      {editing && (
        <Modal title="Eintrag bearbeiten" onClose={() => setEditing(null)}>
          <EntryForm
            entry={editing}
            data={data}
            date={date}
            save={save}
            busy={busy}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}
