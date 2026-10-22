import { newId } from '../../app/id';
import { useState } from 'react';
import type { Dataset, DiaryEntry, Food, Meal } from '../../domain/types';
import { foodPoints } from '../../domain/points';
import { portionAmount } from '../../domain/portions';
import { lastEntryFor, markUsed, snapshotOf } from '../../domain/templates';
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
  initialMeal,
  onContinue,
}: {
  food?: Food;
  entry?: DiaryEntry;
  data: Dataset;
  date: string;
  save: (next: Dataset) => Promise<boolean>;
  busy: boolean;
  onClose: () => void;
  initialMeal?: Meal;
  onContinue?: (meal: Meal, name: string) => void;
}) {
  const snapshot = entry?.foodSnapshot ?? food!;
  const available = data.portions.filter(
    (portion) => portion.foodId === food?.id && portion.grams !== null,
  );
  const defaultPortion = available.find(
    (portion) => portion.id === food?.defaultPortionId,
  );
  const [suggestion] = useState(() => {
    if (entry) return { unit: '', quantity: entry.amount, previous: false };
    const last = lastEntryFor(food!.id, data.diaryEntries);
    if (!last)
      return {
        unit: defaultPortion?.id ?? '',
        quantity: defaultPortion ? 1 : 100,
        previous: false,
      };
    const portion = available.find(
      (value) => value.label === last.portionLabel,
    );
    return portion
      ? {
          unit: portion.id,
          quantity: Math.round((last.amount / portion.grams!) * 100) / 100,
          previous: true,
        }
      : { unit: '', quantity: last.amount, previous: true };
  });
  const [unit, setUnit] = useState(suggestion.unit);
  const [quantity, setQuantity] = useState(suggestion.quantity);
  const [meal, setMeal] = useState<Meal>(
    entry?.meal ?? initialMeal ?? suggestedMeal(new Date().getHours()),
  );
  const selectedPortion = available.find((portion) => portion.id === unit);
  const amount = selectedPortion
    ? portionAmount(selectedPortion, quantity)!
    : quantity;
  const valid = Number.isFinite(amount) && amount >= 0;
  async function submit(continuing: boolean) {
    const stamp = new Date().toISOString();
    const next: DiaryEntry = {
      id: entry?.id ?? newId(),
      date,
      meal,
      foodId: entry?.foodId ?? food!.id,
      foodSnapshot: snapshotOf(snapshot),
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
        foods: markUsed(data.foods, [next.foodId], stamp),
      })
    ) {
      if (continuing && onContinue) onContinue(meal, snapshot.name);
      else onClose();
    }
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(false);
      }}
    >
      <h3>{snapshot.name}</h3>
      {suggestion.previous && (
        <p className="hint">Menge wie bei deinem letzten Eintrag.</p>
      )}
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
        {onContinue && (
          <button
            type="button"
            disabled={busy || !valid}
            onClick={() => void submit(true)}
          >
            Speichern und weiter
          </button>
        )}
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
