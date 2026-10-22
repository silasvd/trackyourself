import { useState } from 'react';
import { displayDate, meals, number } from '../../app/format';
import { foodPoints } from '../../domain/points';
import { withoutFood } from '../../domain/recipes';
import { templatePoints } from '../../domain/templates';
import type { Dataset, Food, MealTemplate } from '../../domain/types';
import { Field, Modal } from '../components/Form';
import { TemplateForm } from '../components/TemplateForm';
import { RecipeEditor } from './RecipeEditor';

const byName = <T extends { name: string }>(a: T, b: T) =>
  a.name.localeCompare(b.name, 'de');

export function LibraryPage({
  data,
  date,
  save,
  busy,
}: {
  data: Dataset;
  date: string;
  save: (next: Dataset) => Promise<boolean>;
  busy: boolean;
}) {
  const [recipe, setRecipe] = useState<Food | 'new' | null>(null);
  const [using, setUsing] = useState<MealTemplate | null>(null);
  const [renaming, setRenaming] = useState<MealTemplate | null>(null);
  const [notice, setNotice] = useState('');
  const recipes = data.foods.filter((food) => food.recipe).sort(byName);
  const templates = [...data.mealTemplates].sort(byName);
  const foodName = (foodId: string) =>
    data.foods.find((food) => food.id === foodId)?.name ?? 'Gelöscht';
  return (
    <>
      <section className="card" aria-labelledby="recipes-heading">
        <h1>Rezepte &amp; Vorlagen</h1>
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        <div className="section-heading">
          <h2 id="recipes-heading">Rezepte</h2>
          <button onClick={() => setRecipe('new')}>Rezept anlegen</button>
        </div>
        {!recipes.length && (
          <p>
            Noch keine Rezepte. Ein Rezept fasst mehrere Zutaten zusammen und
            wird danach wie ein Lebensmittel pro Portion eingetragen.
          </p>
        )}
        <ul className="food-list library-list">
          {recipes.map((food) => {
            const portion = data.portions.find(
              (value) => value.id === food.defaultPortionId,
            );
            const grams = portion?.grams ?? null;
            return (
              <li key={food.id}>
                <div className="library-item">
                  <strong>{food.name}</strong>
                  <small>
                    {food.recipe!.servings} Portionen
                    {grams !== null &&
                      ` · ${number(grams)} g · ${foodPoints(food, grams).points} Punkte pro Portion`}
                  </small>
                  <small>
                    {food
                      .recipe!.ingredients.map((value) =>
                        foodName(value.foodId),
                      )
                      .join(', ')}
                  </small>
                </div>
                <button
                  aria-label={`Rezept ${food.name} bearbeiten`}
                  onClick={() => setRecipe(food)}
                >
                  Bearbeiten
                </button>
                <button
                  aria-label={`Rezept ${food.name} löschen`}
                  disabled={busy}
                  onClick={() => void save(withoutFood(data, food.id))}
                >
                  Löschen
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="card" aria-labelledby="templates-heading">
        <h2 id="templates-heading">Mahlzeit-Vorlagen</h2>
        {!templates.length && (
          <p>
            Noch keine Vorlagen. Speichere eine Mahlzeit im Tagebuch über „Als
            Vorlage speichern“.
          </p>
        )}
        <ul className="food-list library-list">
          {templates.map((template) => (
            <li key={template.id}>
              <div className="library-item">
                <strong>{template.name}</strong>
                <small>
                  {meals[template.meal]} · {template.items.length} Lebensmittel
                  · {number(templatePoints(template, data.foods))} Punkte
                </small>
                <small>
                  {template.items
                    .map((item) => {
                      const food = data.foods.find(
                        (value) => value.id === item.foodId,
                      );
                      return `${foodName(item.foodId)} ${number(item.amount)} ${food?.basis ?? 'g'}`;
                    })
                    .join(', ')}
                </small>
              </div>
              <button
                className="primary"
                aria-label={`Vorlage ${template.name} eintragen`}
                onClick={() => {
                  setNotice('');
                  setUsing(template);
                }}
              >
                Eintragen
              </button>
              <button
                aria-label={`Vorlage ${template.name} umbenennen`}
                onClick={() => setRenaming(template)}
              >
                Umbenennen
              </button>
              <button
                aria-label={`Vorlage ${template.name} löschen`}
                disabled={busy}
                onClick={() =>
                  void save({
                    ...data,
                    mealTemplates: data.mealTemplates.filter(
                      (value) => value.id !== template.id,
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
      {recipe && (
        <RecipeEditor
          food={recipe === 'new' ? undefined : recipe}
          data={data}
          save={save}
          busy={busy}
          onClose={() => setRecipe(null)}
          onSaved={() => setRecipe(null)}
        />
      )}
      {using && (
        <Modal
          title={`Vorlage eintragen am ${displayDate(date)}`}
          onClose={() => setUsing(null)}
        >
          <TemplateForm
            template={using}
            data={data}
            date={date}
            save={save}
            busy={busy}
            onDone={() => {
              setNotice(`„${using.name}“ am ${displayDate(date)} eingetragen.`);
              setUsing(null);
            }}
          />
        </Modal>
      )}
      {renaming && (
        <Modal title="Vorlage umbenennen" onClose={() => setRenaming(null)}>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const name = String(
                new FormData(event.currentTarget).get('name'),
              ).trim();
              if (
                name &&
                (await save({
                  ...data,
                  mealTemplates: data.mealTemplates.map((value) =>
                    value.id === renaming.id ? { ...value, name } : value,
                  ),
                }))
              )
                setRenaming(null);
            }}
          >
            <Field
              label="Name der Vorlage"
              name="name"
              data-autofocus
              required
              defaultValue={renaming.name}
            />
            <button className="primary" disabled={busy}>
              Speichern
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
