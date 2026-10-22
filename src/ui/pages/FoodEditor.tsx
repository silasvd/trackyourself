import { newId } from '../../app/id';
import { useState } from 'react';
import type { Dataset, Food, Portion } from '../../domain/types';
import { nutrientQuality } from '../../domain/points';
import { refreshRecipes } from '../../domain/recipes';
import { baseAliases } from '../../data/seed';
import { Field, Modal } from '../components/Form';

export function FoodEditor({
  food,
  data,
  save,
  busy,
  onClose,
  onSaved,
}: {
  food?: Food;
  data: Dataset;
  save: (next: Dataset) => Promise<boolean>;
  busy: boolean;
  onClose: () => void;
  onSaved: (food: Food) => void;
}) {
  const [id] = useState(() => food?.id ?? newId());
  const [portions, setPortions] = useState<Portion[]>(() =>
    food
      ? data.portions.filter((portion) => portion.foodId === id)
      : [
          {
            id: newId(),
            foodId: id,
            label: 'Portion',
            grams: 100,
            scope: 'food',
            isDefault: true,
          },
        ],
  );
  const [defaultId, setDefaultId] = useState<string | null>(
    food?.defaultPortionId ?? portions[0]?.id ?? null,
  );
  return (
    <Modal
      title={food ? 'Lebensmittel bearbeiten' : 'Eigenes Lebensmittel anlegen'}
      onClose={onClose}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const nullable = (name: string) =>
            fields.get(name) === '' ? null : Number(fields.get(name));
          const per100 = {
            kcal: nullable('kcal'),
            satFat: nullable('satFat'),
            sugar: nullable('sugar'),
            protein: nullable('protein'),
          };
          const stamp = new Date().toISOString();
          const aliases = [
            ...new Set(
              String(fields.get('aliases'))
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            ),
          ];
          const next: Food = {
            id,
            name: String(fields.get('name')).trim(),
            category: String(fields.get('category')).trim() || null,
            per100,
            basis: fields.get('basis') === 'ml' ? 'ml' : 'g',
            countsAsZero: fields.get('zero') === 'on',
            source: food?.source ?? 'custom',
            sourceRef: food?.sourceRef ?? null,
            dataQuality: nutrientQuality(per100),
            defaultPortionId: defaultId,
            isFavorite: food?.isFavorite ?? false,
            lastUsedAt: food?.lastUsedAt ?? null,
            ...(aliases.length ? { aliases } : {}),
            createdAt: food?.createdAt ?? stamp,
            updatedAt: stamp,
          };
          // Recipes using this food are recalculated with its new values.
          const updated = refreshRecipes(
            [...data.foods.filter((value) => value.id !== id), next],
            [
              ...data.portions.filter((value) => value.foodId !== id),
              ...portions.map((portion) => ({
                ...portion,
                isDefault: portion.id === defaultId,
              })),
            ],
          );
          if (await save({ ...data, ...updated })) onSaved(next);
        }}
      >
        <Field
          label="Name"
          name="name"
          required
          defaultValue={food?.name ?? ''}
        />
        <Field
          label="Kategorie"
          name="category"
          defaultValue={food?.category ?? ''}
        />
        <Field
          label="Weitere Suchbegriffe (durch Komma getrennt)"
          name="aliases"
          defaultValue={food?.aliases?.join(', ') ?? ''}
          placeholder="z. B. Nudeln, Pasta"
        />
        {food && baseAliases.get(food.id)?.length ? (
          <p className="hint">
            Bereits auffindbar unter: {baseAliases.get(food.id)!.join(', ')}
          </p>
        ) : null}
        <label>
          Nährwertbasis
          <select name="basis" defaultValue={food?.basis ?? 'g'}>
            <option value="g">je 100 g</option>
            <option value="ml">je 100 ml</option>
          </select>
        </label>
        <p>
          Fehlende Nährwerte leer lassen. Ohne Energie sind Punkte nicht
          berechenbar; andere fehlende Werte ergeben eine Schätzung.
        </p>
        <div className="form-grid">
          <Field
            label="Energie (kcal)"
            name="kcal"
            type="number"
            min="0"
            step="any"
            defaultValue={food?.per100.kcal ?? ''}
          />
          <Field
            label="Gesättigte Fette (g)"
            name="satFat"
            type="number"
            min="0"
            step="any"
            defaultValue={food?.per100.satFat ?? ''}
          />
          <Field
            label="Zucker (g)"
            name="sugar"
            type="number"
            min="0"
            step="any"
            defaultValue={food?.per100.sugar ?? ''}
          />
          <Field
            label="Protein (g)"
            name="protein"
            type="number"
            min="0"
            step="any"
            defaultValue={food?.per100.protein ?? ''}
          />
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            name="zero"
            defaultChecked={food?.countsAsZero ?? false}
          />
          Als 0-Punkte-Lebensmittel bewerten
        </label>
        <fieldset>
          <legend>Wiederverwendbare Portionen</legend>
          <p>
            Umrechnungsmenge in g/ml. Ohne Menge ist die Portion nicht
            auswählbar.
          </p>
          {portions.map((portion, index) => (
            <div className="portion-row" key={portion.id}>
              <Field
                label="Bezeichnung"
                aria-label={`Portion ${index + 1}: Bezeichnung`}
                placeholder="z. B. Scheibe"
                required
                value={portion.label}
                onChange={(event) =>
                  setPortions(
                    portions.map((value) =>
                      value.id === portion.id
                        ? { ...value, label: event.target.value }
                        : value,
                    ),
                  )
                }
              />
              <Field
                label="Menge in g/ml"
                aria-label={`Portion ${index + 1}: Menge`}
                type="number"
                min="0.1"
                step="any"
                value={portion.grams ?? ''}
                onChange={(event) =>
                  setPortions(
                    portions.map((value) =>
                      value.id === portion.id
                        ? {
                            ...value,
                            grams:
                              event.target.value === ''
                                ? null
                                : event.target.valueAsNumber,
                          }
                        : value,
                    ),
                  )
                }
              />
              <label className="checkbox">
                <input
                  type="radio"
                  name="defaultPortion"
                  checked={defaultId === portion.id}
                  onChange={() => setDefaultId(portion.id)}
                />
                Standard
              </label>
              <button
                type="button"
                aria-label={`Portion ${index + 1} entfernen`}
                onClick={() => {
                  setPortions(
                    portions.filter((value) => value.id !== portion.id),
                  );
                  if (defaultId === portion.id) setDefaultId(null);
                }}
              >
                Entfernen
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setPortions([
                ...portions,
                {
                  id: newId(),
                  foodId: id,
                  label: '',
                  grams: null,
                  scope: 'food',
                  isDefault: false,
                },
              ])
            }
          >
            Portion hinzufügen
          </button>
        </fieldset>
        <button className="primary" disabled={busy}>
          Lebensmittel speichern
        </button>
      </form>
    </Modal>
  );
}
