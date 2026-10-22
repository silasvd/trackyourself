import { newId } from '../../app/id';
import { useState } from 'react';
import { meals, number } from '../../app/format';
import { foodPoints } from '../../domain/points';
import { entriesFromItems, markUsed } from '../../domain/templates';
import type { Dataset, Meal, MealTemplate } from '../../domain/types';

export function TemplateForm({
  template,
  data,
  date,
  save,
  busy,
  onDone,
}: {
  template: MealTemplate;
  data: Dataset;
  date: string;
  save: (next: Dataset) => Promise<boolean>;
  busy: boolean;
  onDone: () => void;
}) {
  const [meal, setMeal] = useState<Meal>(template.meal);
  const [items, setItems] = useState(() =>
    template.items.map((item, index) => ({ ...item, index, checked: true })),
  );
  const chosen = items.filter((item) => item.checked);
  const valid =
    chosen.length > 0 &&
    chosen.every((item) => Number.isFinite(item.amount) && item.amount > 0);
  const total = chosen.reduce((sum, item) => {
    const food = data.foods.find((value) => value.id === item.foodId);
    return sum + (food && valid ? foodPoints(food, item.amount).points : 0);
  }, 0);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const stamp = new Date().toISOString();
        const entries = entriesFromItems(chosen, data.foods, {
          date,
          meal,
          stamp,
          id: () => newId(),
        });
        if (
          await save({
            ...data,
            diaryEntries: [...data.diaryEntries, ...entries],
            foods: markUsed(
              data.foods,
              entries.map((entry) => entry.foodId),
              stamp,
            ),
          })
        )
          onDone();
      }}
    >
      <h3>{template.name}</h3>
      <label>
        Mahlzeit
        <select
          value={meal}
          onChange={(event) => setMeal(event.target.value as Meal)}
        >
          {Object.entries(meals).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <ul className="template-items">
        {items.map((item) => {
          const food = data.foods.find((value) => value.id === item.foodId)!;
          const update = (change: Partial<typeof item>) =>
            setItems(
              items.map((value) =>
                value.index === item.index ? { ...value, ...change } : value,
              ),
            );
          return (
            <li key={item.index}>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) =>
                    update({ checked: event.target.checked })
                  }
                />
                {food.name}
              </label>
              <label>
                {`Menge ${food.name} (${food.basis})`}
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={!item.checked}
                  value={Number.isNaN(item.amount) ? '' : item.amount}
                  onChange={(event) =>
                    update({
                      amount: event.target.valueAsNumber,
                      portionLabel: null,
                    })
                  }
                />
              </label>
              {item.portionLabel && <small>{item.portionLabel}</small>}
            </li>
          );
        })}
      </ul>
      <output aria-live="polite">
        {valid
          ? `${chosen.length} Lebensmittel · ${number(total)} Punkte`
          : 'Bitte mindestens ein Lebensmittel mit positiver Menge wählen.'}
      </output>
      <div className="actions">
        <button className="primary" disabled={busy || !valid}>
          Vorlage eintragen
        </button>
      </div>
    </form>
  );
}
