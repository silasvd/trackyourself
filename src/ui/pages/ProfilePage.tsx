import { useState } from 'react';
import { budgets } from '../../domain/budget';
import type { Dataset, Profile } from '../../domain/types';
import { Field } from '../components/Form';
import { Settings } from './Settings';

function defaultProfile(): Profile {
  const stamp = new Date().toISOString();
  return {
    id: 'singleton',
    sex: 'female',
    breastfeeding: false,
    age: 30,
    activityLevel: 1,
    heightCm: 165,
    weightKg: 70,
    dailyBudgetOverride: null,
    weeklyBudgetOverride: null,
    weekStartsOn: 1,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export function ProfilePage({
  data,
  save,
  busy,
}: {
  data: Dataset;
  save: (next: Dataset) => Promise<boolean>;
  busy: boolean;
}) {
  const [profile, setProfile] = useState<Profile>(
    () => data.profile ?? defaultProfile(),
  );
  const [saved, setSaved] = useState(false);
  const result = budgets(profile);
  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setSaved(false);
    setProfile((previous) => ({ ...previous, [key]: value }));
  }
  return (
    <>
      <section className="card">
        <h1>Profil & Budget</h1>
        {!data.profile && (
          <p>Willkommen! Richte dein persönliches Budget ein.</p>
        )}
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setSaved(
              await save({
                ...data,
                profile: { ...profile, updatedAt: new Date().toISOString() },
              }),
            );
          }}
        >
          <label>
            Geschlecht
            <select
              value={profile.sex}
              onChange={(event) =>
                update('sex', event.target.value === 'male' ? 'male' : 'female')
              }
            >
              <option value="female">Weiblich</option>
              <option value="male">Männlich</option>
            </select>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={profile.breastfeeding}
              onChange={(event) =>
                update('breastfeeding', event.target.checked)
              }
            />
            Stillen
          </label>
          <div className="form-grid">
            <Field
              label="Alter (Jahre)"
              type="number"
              required
              min="0"
              step="1"
              value={Number.isNaN(profile.age) ? '' : profile.age}
              onChange={(event) => update('age', event.target.valueAsNumber)}
            />
            <Field
              label="Größe (cm)"
              type="number"
              required
              min="1"
              step="0.1"
              value={Number.isNaN(profile.heightCm) ? '' : profile.heightCm}
              onChange={(event) =>
                update('heightCm', event.target.valueAsNumber)
              }
            />
            <Field
              label="Gewicht fürs Budget (kg)"
              type="number"
              required
              min="1"
              step="0.1"
              value={Number.isNaN(profile.weightKg) ? '' : profile.weightKg}
              onChange={(event) =>
                update('weightKg', event.target.valueAsNumber)
              }
            />
          </div>
          <label>
            Aktivitätsniveau
            <select
              value={profile.activityLevel}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (value === 0 || value === 1 || value === 2 || value === 3)
                  update('activityLevel', value);
              }}
            >
              <option value="0">Keine – keinerlei Bewegung</option>
              <option value="1">Wenig – überwiegend sitzend</option>
              <option value="2">
                Durchschnittlich – viel Bewegung oder bis 30 Min. Sport/Tag
              </option>
              <option value="3">
                Schwer – körperliche Arbeit oder über 30 Min. Sport/Tag
              </option>
            </select>
          </label>
          <div className="form-grid">
            <Field
              label="Tagesbudget"
              type="number"
              min="0"
              step="1"
              placeholder={String(result.daily)}
              value={profile.dailyBudgetOverride ?? ''}
              onChange={(event) =>
                update(
                  'dailyBudgetOverride',
                  event.target.value === '' ? null : event.target.valueAsNumber,
                )
              }
            />
            <Field
              label="Wochenbudget"
              type="number"
              min="0"
              step="1"
              placeholder={String(result.weekly)}
              value={profile.weeklyBudgetOverride ?? ''}
              onChange={(event) =>
                update(
                  'weeklyBudgetOverride',
                  event.target.value === '' ? null : event.target.valueAsNumber,
                )
              }
            />
          </div>
          <p aria-live="polite">
            Dein Budget:{' '}
            <strong>
              {Number.isFinite(result.daily) ? result.daily : '–'} Tagespunkte
            </strong>{' '}
            · {Number.isFinite(result.weekly) ? result.weekly : '–'}{' '}
            Wochenextras
          </p>
          <button className="primary" disabled={busy}>
            Profil speichern
          </button>
          {saved && <p role="status">Profil gespeichert.</p>}
        </form>
      </section>
      <Settings
        data={data}
        save={save}
        busy={busy}
        onRestore={(restored) => {
          setProfile(restored.profile ?? defaultProfile());
          setSaved(false);
        }}
      />
    </>
  );
}
