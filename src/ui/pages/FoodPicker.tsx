import { useState } from 'react';
import { baseAliases } from '../../data/seed';
import { recipesUsing, withoutFood } from '../../domain/recipes';
import { normalize, searchFoods } from '../../domain/search';
import type { Dataset, Food, Meal, MealTemplate } from '../../domain/types';
import { meals } from '../../app/format';
import { Modal } from '../components/Form';
import { EntryForm } from '../components/EntryForm';
import { TemplateForm } from '../components/TemplateForm';
import { FoodEditor } from './FoodEditor';
import { RecipeEditor } from './RecipeEditor';

export function FoodPicker({
  data,
  date,
  save,
  busy,
  onClose,
  initialMeal,
}: {
  data: Dataset;
  date: string;
  save: (next: Dataset) => Promise<boolean>;
  busy: boolean;
  onClose: () => void;
  initialMeal?: Meal;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Food | null>(null);
  const [template, setTemplate] = useState<MealTemplate | null>(null);
  const [editing, setEditing] = useState<Food | 'new' | null>(null);
  const [recipe, setRecipe] = useState<Food | 'new' | null>(null);
  const [meal, setMeal] = useState(initialMeal);
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');
  const pool = data.foods.filter(
    (food) =>
      filter === 'all' ||
      (filter === 'favorites' && food.isFavorite) ||
      (filter === 'recent' && food.lastUsedAt !== null) ||
      (filter === 'recipes' && food.recipe !== undefined) ||
      (filter === 'custom' && food.source === 'custom') ||
      (filter === 'base' && food.source === 'base'),
  );
  const foods =
    filter === 'templates'
      ? []
      : filter === 'recent' && !query.trim()
        ? pool.sort((a, b) =>
            (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? ''),
          )
        : searchFoods(pool, query, baseAliases);
  const term = normalize(query);
  const templates =
    filter === 'all' || filter === 'templates'
      ? data.mealTemplates
          .filter(
            (value) =>
              !term ||
              normalize(
                [
                  value.name,
                  ...value.items.map(
                    (item) =>
                      data.foods.find((food) => food.id === item.foodId)
                        ?.name ?? '',
                  ),
                ].join(' '),
              ).includes(term),
          )
          .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      : [];
  function remove(food: Food) {
    const users = recipesUsing(food.id, data.foods);
    if (users.length) {
      setProblem(
        `„${food.name}“ wird in ${users.map((value) => `„${value.name}“`).join(', ')} verwendet. Entferne die Zutat zuerst aus dem Rezept.`,
      );
      return;
    }
    setProblem('');
    void save(withoutFood(data, food.id));
  }
  return (
    <>
      <Modal title="Lebensmittel hinzufügen" onClose={onClose}>
        {selected || template ? (
          <>
            <button
              onClick={() => {
                setSelected(null);
                setTemplate(null);
              }}
            >
              Zurück zur Auswahl
            </button>
            {selected && (
              <EntryForm
                food={selected}
                data={data}
                date={date}
                save={save}
                busy={busy}
                onClose={onClose}
                initialMeal={meal}
                onContinue={(next, name) => {
                  setMeal(next);
                  setNotice(`${name} zu ${meals[next]} hinzugefügt.`);
                  setSelected(null);
                  setQuery('');
                }}
              />
            )}
            {template && (
              <TemplateForm
                template={template}
                data={data}
                date={date}
                save={save}
                busy={busy}
                onDone={onClose}
              />
            )}
          </>
        ) : (
          <>
            {notice && (
              <p role="status" className="notice">
                {notice}
              </p>
            )}
            <label>
              Lebensmittel suchen
              <input
                data-autofocus
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="z. B. Nudeln, Hafermilch, Hackfleisch …"
              />
            </label>
            <label>
              Auswahl
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">Alle Lebensmittel</option>
                <option value="favorites">Favoriten</option>
                <option value="recent">Zuletzt verwendet</option>
                <option value="templates">Mahlzeit-Vorlagen</option>
                <option value="recipes">Rezepte</option>
                <option value="base">Basisliste</option>
                <option value="custom">Eigene Lebensmittel</option>
              </select>
            </label>
            <div className="actions">
              <button onClick={() => setEditing('new')}>
                Eigenes Lebensmittel anlegen
              </button>
              <button onClick={() => setRecipe('new')}>Rezept anlegen</button>
            </div>
            {problem && <p role="alert">{problem}</p>}
            {templates.length > 0 && (
              <section aria-label="Mahlzeit-Vorlagen">
                <h3>Vorlagen</h3>
                <ul className="food-list">
                  {templates.map((value) => (
                    <li key={value.id}>
                      <button
                        className="food-select"
                        aria-label={`Vorlage ${value.name} auswählen`}
                        onClick={() => setTemplate(value)}
                      >
                        <strong>{value.name}</strong>
                        <small>
                          Vorlage · {meals[value.meal]} · {value.items.length}{' '}
                          Lebensmittel
                        </small>
                      </button>
                      <button
                        aria-label={`Vorlage ${value.name} löschen`}
                        disabled={busy}
                        onClick={() =>
                          void save({
                            ...data,
                            mealTemplates: data.mealTemplates.filter(
                              (item) => item.id !== value.id,
                            ),
                          })
                        }
                      >
                        Löschen
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {filter === 'templates' && !templates.length && (
              <p>
                Noch keine passenden Vorlagen. Speichere eine Mahlzeit im
                Tagebuch über „Als Vorlage speichern“.
              </p>
            )}
            {filter !== 'templates' && !foods.length && (
              <p>Keine Lebensmittel gefunden.</p>
            )}
            <ul className="food-list">
              {foods.map((food) => (
                <li key={food.id}>
                  <button
                    className="food-select"
                    aria-label={`${food.name} auswählen`}
                    onClick={() => setSelected(food)}
                  >
                    <strong>{food.name}</strong>
                    <small>
                      {food.recipe
                        ? `Rezept · ${food.recipe.ingredients.length} Zutaten`
                        : (food.category ?? 'Eigene Lebensmittel')}
                      {food.dataQuality === 'incomplete'
                        ? ' · Nährwerte unvollständig'
                        : ''}
                    </small>
                  </button>
                  <button
                    className="favorite"
                    aria-label={`${food.name}: Favorit`}
                    aria-pressed={food.isFavorite}
                    disabled={busy}
                    onClick={() =>
                      void save({
                        ...data,
                        foods: data.foods.map((value) =>
                          value.id === food.id
                            ? {
                                ...value,
                                isFavorite: !value.isFavorite,
                                updatedAt: new Date().toISOString(),
                              }
                            : value,
                        ),
                      })
                    }
                  >
                    {food.isFavorite ? '★' : '☆'}
                  </button>
                  <button
                    aria-label={`${food.name}: bearbeiten`}
                    onClick={() =>
                      food.recipe ? setRecipe(food) : setEditing(food)
                    }
                  >
                    Bearbeiten
                  </button>
                  {food.source === 'custom' && (
                    <button
                      aria-label={`${food.name}: löschen`}
                      disabled={busy}
                      onClick={() => remove(food)}
                    >
                      Löschen
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>
      {editing && (
        <FoodEditor
          food={editing === 'new' ? undefined : editing}
          data={data}
          save={save}
          busy={busy}
          onClose={() => setEditing(null)}
          onSaved={(food) => {
            if (editing === 'new') setSelected(food);
            setEditing(null);
          }}
        />
      )}
      {recipe && (
        <RecipeEditor
          food={recipe === 'new' ? undefined : recipe}
          data={data}
          save={save}
          busy={busy}
          onClose={() => setRecipe(null)}
          onSaved={(food) => {
            if (recipe === 'new') setSelected(food);
            setRecipe(null);
          }}
        />
      )}
    </>
  );
}
