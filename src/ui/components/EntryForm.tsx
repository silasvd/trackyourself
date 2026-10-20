import { useState } from 'react';
import type { Dataset, DiaryEntry, Food, Meal } from '../../domain/types';
import { foodPoints } from '../../domain/points';
import { portionAmount } from '../../domain/portions';
import { meals, number, suggestedMeal } from '../../app/format';
import { Field } from './Form';

export function PointLabel({
  entry,
}: {
  entry: Pick<DiaryEntry, 'foodSnapshot' | 'amount'>;
}) {
  const result = foodPoints(entry.foodSnapshot, entry.amount);
  return (
    <>
      <strong>{result.points} Punkte</strong>
      {result.status === 'unavailable' && (
        <small>Punkte nicht berechenbar · unvollständig</small>
      )}
      {result.status === 'incomplete' && (
        <small>Geschätzt / unvollständig</small>
      )}
    </>
  );
}

export function EntryForm({
  food,
  entry,
  data,
  date,
  save,
  busy,
  onClose,
}: {
  food?: Food;
  entry?: DiaryEntry;
  data: Dataset;
  date: string;
  save: (next: Dataset) => Promise<boolean>;
  busy: boolean;
  onClose: () => void;
}) {
  const snapshot = entry?.foodSnapshot ?? food!;
  const available = data.portions.filter(
    (portion) => portion.foodId === food?.id && portion.grams !== null,
  );
  const defaultPortion = available.find(
    (portion) => portion.id === food?.defaultPortionId,
  );
  const [unit, setUnit] = useState(entry ? '' : (defaultPortion?.id ?? ''));
  const [quantity, setQuantity] = useState(
    entry?.amount ?? (defaultPortion ? 1 : 100),
  );
  const [meal, setMeal] = useState<Meal>(
    entry?.meal ?? suggestedMeal(new Date().getHours()),
  );
  const selectedPortion = available.find((portion) => portion.id === unit);
  const amount = selectedPortion
    ? portionAmount(selectedPortion, quantity)!
    : quantity;
  const valid = Number.isFinite(amount) && amount >= 0;
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const stamp = new Date().toISOString();
        const next: DiaryEntry = {
          id: entry?.id ?? crypto.randomUUID(),
          date,
          meal,
          foodId: entry?.foodId ?? food!.id,
          foodSnapshot: {
            name: snapshot.name,
            per100: { ...snapshot.per100 },
            basis: snapshot.basis,
            countsAsZero: snapshot.countsAsZero,
            dataQuality: snapshot.dataQuality,
          },
          amount,
          portionLabel: selectedPortion?.label ?? null,
          points: foodPoints(snapshot, amount).points,
          createdAt: entry?.createdAt ?? stamp,
          updatedAt: stamp,
        };
        if (
          await save({
            ...data,
            diaryEntries: [
              ...data.diaryEntries.filter((value) => value.id !== next.id),
              next,
            ],
            foods: data.foods.map((value) =>
              value.id === next.foodId
                ? { ...value, lastUsedAt: stamp }
                : value,
            ),
          })
        )
          onClose();
      }}
    >
      <h3>{snapshot.name}</h3>
      <label>
        Mahlzeit
        <select
          value={meal}
          onChange={(event) => {
            const value = event.target.value;
            if (
              value === 'breakfast' ||
              value === 'lunch' ||
              value === 'dinner' ||
              value === 'snack'
            )
              setMeal(value);
          }}
        >
          {Object.entries(meals).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Einheit
        <select
          value={unit}
          onChange={(event) => {
            setUnit(event.target.value);
            setQuantity(event.target.value ? 1 : 100);
          }}
        >
          <option value="">{snapshot.basis}</option>
          {available.map((portion) => (
            <option key={portion.id} value={portion.id}>
              {portion.label} ({portion.grams} {snapshot.basis})
            </option>
          ))}
        </select>
      </label>
      <Field
        label="Menge"
        type="number"
        min="0"
        step="any"
        required
        value={Number.isNaN(quantity) ? '' : quantity}
        onChange={(event) => setQuantity(event.target.valueAsNumber)}
      />
      <output aria-live="polite">
        {valid ? (
          <>
            {number(amount)} {snapshot.basis} ·{' '}
            <PointLabel entry={{ foodSnapshot: snapshot, amount }} />
          </>
        ) : (
          'Bitte eine nicht-negative Menge eingeben.'
        )}
      </output>
      <div className="actions">
        <button className="primary" disabled={busy || !valid}>
          Eintrag speichern
        </button>
        {entry && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (
                await save({
                  ...data,
                  diaryEntries: data.diaryEntries.filter(
                    (value) => value.id !== entry.id,
                  ),
                })
              )
                onClose();
            }}
          >
            Eintrag löschen
          </button>
        )}
      </div>
    </form>
  );
}
