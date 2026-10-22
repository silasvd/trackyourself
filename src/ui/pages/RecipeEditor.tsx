import { newId } from '../../app/id';
import { useState } from 'react';
import { number } from '../../app/format';
import { baseAliases } from '../../data/seed';
import { foodPoints } from '../../domain/points';
import { recipeFood, recipeWeight } from '../../domain/recipes';
import { searchFoods } from '../../domain/search';
import type { Dataset, Food, RecipeIngredient } from '../../domain/types';
import { Field, Modal } from '../components/Form';

export function RecipeEditor({
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
  const [name, setName] = useState(food?.name ?? '');
  const [servings, setServings] = useState(food?.recipe?.servings ?? 4);
  const [yieldGrams, setYieldGrams] = useState(
    food?.recipe?.yieldGrams ?? Number.NaN,
  );
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    food?.recipe?.ingredients ?? [],
  );
  const [query, setQuery] = useState('');
  const candidates = query.trim()
    ? searchFoods(
        data.foods.filter((value) => !value.recipe && value.id !== id),
        query,
        baseAliases,
      ).slice(0, 8)
    : [];
  const recipe = {
    ingredients,
    servings,
    yieldGrams: Number.isNaN(yieldGrams) ? null : yieldGrams,
  };
  const valid =
    name.trim() !== '' &&
    ingredients.length > 0 &&
    ingredients.every(
      (value) => Number.isFinite(value.grams) && value.grams > 0,
    ) &&
    Number.isInteger(servings) &&
    servings >= 1 &&
    (recipe.yieldGrams === null ||
      (Number.isFinite(recipe.yieldGrams) && recipe.yieldGrams > 0));
  const stamp = new Date().toISOString();
  const built = valid
    ? recipeFood(
        {
          id,
          name: name.trim(),
          category: 'Rezepte',
          basis: 'g',
          countsAsZero: false,
          source: 'custom',
          sourceRef: null,
          isFavorite: food?.isFavorite ?? false,
          lastUsedAt: food?.lastUsedAt ?? null,
          ...(food?.aliases ? { aliases: food.aliases } : {}),
          createdAt: food?.createdAt ?? stamp,
          updatedAt: stamp,
        },
        recipe,
        data.foods,
      )
    : null;
  const serving = built?.portions[0];
  const foodName = (foodId: string) =>
    data.foods.find((value) => value.id === foodId)?.name ?? foodId;
  return (
    <Modal
      title={food ? 'Rezept bearbeiten' : 'Rezept anlegen'}
      onClose={onClose}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!built) return;
          if (
            await save({
              ...data,
              foods: [
                ...data.foods.filter((value) => value.id !== id),
                built.food,
              ],
              portions: [
                ...data.portions.filter((value) => value.foodId !== id),
                ...built.portions,
              ],
            })
          )
            onSaved(built.food);
        }}
      >
        <Field
          label="Name des Rezepts"
          data-autofocus
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Field
          label="Anzahl Portionen"
          type="number"
          min="1"
          step="1"
          required
          value={Number.isNaN(servings) ? '' : servings}
          onChange={(event) => setServings(event.target.valueAsNumber)}
        />
        <Field
          label="Gewicht fertig gekocht (g, optional)"
          type="number"
          min="0"
          step="any"
          value={Number.isNaN(yieldGrams) ? '' : yieldGrams}
          onChange={(event) => setYieldGrams(event.target.valueAsNumber)}
        />
        <p>
          Ohne Endgewicht zählt die Summe der Zutaten. Wiege den fertigen Topf,
          wenn beim Kochen viel Wasser verdampft oder aufgenommen wird. Für
          Hackfleischsoße z. B. die Hackfleischmenge der ganzen Packung sowie
          die übrigen Zutaten erfassen und die Anzahl gleich großer Portionen
          angeben. Anschließend im Tagebuch „Portion“ wählen: Bei 500 g
          Hackfleisch und 4 Portionen entfallen 125 g auf jede Portion, ohne das
          Fleisch aus der Soße herauswiegen zu müssen.
        </p>
        <fieldset>
          <legend>Zutaten</legend>
          {!ingredients.length && <p>Noch keine Zutaten.</p>}
          {ingredients.map((ingredient, index) => (
            <div
              className="portion-row ingredient-row"
              key={`${ingredient.foodId}-${index}`}
            >
              <span>
                <strong>{foodName(ingredient.foodId)}</strong> (g)
              </span>
              <input
                aria-label={`${foodName(ingredient.foodId)}: Menge (g)`}
                type="number"
                min="0"
                step="any"
                required
                value={Number.isNaN(ingredient.grams) ? '' : ingredient.grams}
                onChange={(event) =>
                  setIngredients(
                    ingredients.map((value, position) =>
                      position === index
                        ? { ...value, grams: event.target.valueAsNumber }
                        : value,
                    ),
                  )
                }
              />
              <button
                type="button"
                aria-label={`${foodName(ingredient.foodId)} entfernen`}
                onClick={() =>
                  setIngredients(
                    ingredients.filter(
                      (_value, position) => position !== index,
                    ),
                  )
                }
              >
                Entfernen
              </button>
            </div>
          ))}
          <label>
            Zutat suchen
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="z. B. Hackfleisch, Kidneybohnen …"
            />
          </label>
          {query.trim() !== '' && !candidates.length && (
            <p>Keine passende Zutat gefunden.</p>
          )}
          <ul className="food-list">
            {candidates.map((candidate) => {
              const portion = data.portions.find(
                (value) => value.id === candidate.defaultPortionId,
              );
              return (
                <li key={candidate.id}>
                  <button
                    type="button"
                    className="food-select"
                    aria-label={`${candidate.name} als Zutat hinzufügen`}
                    onClick={() => {
                      setIngredients([
                        ...ingredients,
                        { foodId: candidate.id, grams: portion?.grams ?? 100 },
                      ]);
                      setQuery('');
                    }}
                  >
                    <strong>{candidate.name}</strong>
                    <small>{candidate.category ?? 'Eigene Lebensmittel'}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
        <output aria-live="polite">
          {built && serving ? (
            <>
              Gesamt {number(recipeWeight(recipe))} g · Portion{' '}
              {number(serving.grams!)} g ·{' '}
              <strong>
                {foodPoints(built.food, serving.grams!).points} Punkte pro
                Portion
              </strong>
              {built.food.dataQuality === 'incomplete' && (
                <small> · Nährwerte unvollständig</small>
              )}
            </>
          ) : (
            'Name, mindestens eine Zutat mit Menge und Portionen angeben.'
          )}
        </output>
        <button className="primary" disabled={busy || !built}>
          Rezept speichern
        </button>
      </form>
    </Modal>
  );
}
