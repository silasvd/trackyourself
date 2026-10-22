import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deleteDB } from 'idb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/App';
import { databaseName, openDatabase, Repository } from '../../src/data/db';
import { DaySummary } from '../../src/ui/components/DaySummary';
import { EntryForm, PointLabel } from '../../src/ui/components/EntryForm';
import { WeightChart } from '../../src/ui/components/WeightChart';
import { dataset, diary, oats, stamp, weight } from '../fixtures';
import { serializeBackup } from '../../src/data/backup';
import type { Dataset, Food, MealTemplate } from '../../src/domain/types';
import { baseSeed } from '../../src/data/seed';
import { foodPoints } from '../../src/domain/points';
import { recipeFood } from '../../src/domain/recipes';

beforeEach(async () => {
  const repository = new Repository(await openDatabase());
  await repository.replace(dataset());
  repository.close();
});
afterEach(async () => {
  cleanup();
  await deleteDB(databaseName);
});

async function start() {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Dein Tag' });
  return user;
}
async function stored() {
  const repository = new Repository(await openDatabase());
  const data = await repository.read();
  repository.close();
  return data;
}
async function seed(data: Dataset) {
  const repository = new Repository(await openDatabase());
  await repository.replace(data);
  repository.close();
}
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: true }), {
    target: { value },
  });
}

describe('dashboard and capture', () => {
  it('shows storage failures inside the active dialog and permits a safe retry', async () => {
    const user = await start();
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken auswählen' }),
    );
    vi.spyOn(Repository.prototype, 'replace').mockRejectedValueOnce(
      new Error('Speicher voll'),
    );
    await user.click(screen.getByRole('button', { name: 'Eintrag speichern' }));
    expect(
      await within(screen.getByRole('dialog')).findByRole('alert'),
    ).toHaveTextContent('Speicher voll');
    expect((await stored()).diaryEntries).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Eintrag speichern' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect((await stored()).diaryEntries).toHaveLength(1);
  });
  it('shows daily-only remaining and weekly extras separately, with text for overages', () => {
    render(
      <DaySummary
        daily={24}
        weekly={34}
        entries={[diary({ points: 30 })]}
        date="2026-10-20"
        today="2026-10-20"
      />,
    );
    const daily = screen.getByRole('region', { name: 'Tagespunkte' });
    expect(within(daily).getByText('0')).toBeVisible();
    expect(
      within(daily).getByText('6 Punkte aus Wochenextras verbraucht.'),
    ).toBeVisible();
    expect(
      screen.getByRole('region', { name: 'Wochenextras' }),
    ).toHaveTextContent('Verbleibend32');
    cleanup();
    render(
      <DaySummary
        daily={0}
        weekly={0}
        entries={[diary({ points: 60 })]}
        date="2026-10-20"
        today="2026-10-20"
      />,
    );
    expect(
      screen.getByText('Wochenextras um 60 Punkte überschritten.'),
    ).toBeVisible();
  });
  it('known standard food takes exactly three clicks, remains after remount and edits/deletes', async () => {
    const user = await start();
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken auswählen' }),
    );
    expect(screen.getByLabelText('Einheit')).toHaveValue('oats-portion');
    expect(screen.getByLabelText('Menge', { exact: true })).toHaveValue(1);
    expect(screen.getByText('6 Punkte')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Eintrag speichern' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect((await stored()).diaryEntries).toHaveLength(1);
    cleanup();
    await start();
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken bearbeiten' }),
    );
    change('Menge', '100');
    await user.selectOptions(screen.getByLabelText('Mahlzeit'), 'lunch');
    await user.click(screen.getByRole('button', { name: 'Eintrag speichern' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect((await stored()).diaryEntries[0]).toMatchObject({
      amount: 100,
      points: 11,
      meal: 'lunch',
    });
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken bearbeiten' }),
    );
    await user.click(screen.getByRole('button', { name: 'Eintrag löschen' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect((await stored()).diaryEntries).toHaveLength(0);
  });
  it('validates amount and displays incomplete nutrient uncertainty', async () => {
    const save = vi.fn().mockResolvedValue(false);
    const onClose = vi.fn();
    render(
      <EntryForm
        food={oats}
        data={dataset()}
        date="2026-10-20"
        save={save}
        busy={false}
        onClose={onClose}
      />,
    );
    change('Menge', '-1');
    expect(
      screen.getByText('Bitte eine nicht-negative Menge eingeben.'),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Eintrag speichern' }),
    ).toBeDisabled();
    change('Menge', '');
    expect(
      screen.getByRole('button', { name: 'Eintrag speichern' }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Einheit'), {
      target: { value: '' },
    });
    expect(screen.getByLabelText('Menge')).toHaveValue(100);
    await userEvent.click(
      screen.getByRole('button', { name: 'Eintrag speichern' }),
    );
    expect(save).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    cleanup();
    render(
      <PointLabel
        entry={{
          foodSnapshot: { ...oats, per100: { ...oats.per100, kcal: null } },
          amount: 100,
        }}
      />,
    );
    expect(screen.getByText(/Punkte nicht berechenbar/)).toBeVisible();
    cleanup();
    render(
      <PointLabel
        entry={{
          foodSnapshot: { ...oats, per100: { ...oats.per100, protein: null } },
          amount: 100,
        }}
      />,
    );
    expect(screen.getByText('Geschätzt / unvollständig')).toBeVisible();
  });
  it('favorites, filters, search, portion selection and dismiss/back navigation', async () => {
    const user = await start();
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken: Favorit' }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Haferflocken: Favorit' }),
      ).toHaveAttribute('aria-pressed', 'true'),
    );
    await user.selectOptions(screen.getByLabelText('Auswahl'), 'favorites');
    expect(
      screen.getByRole('button', { name: 'Haferflocken auswählen' }),
    ).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Auswahl'), 'recent');
    expect(screen.getByText('Keine Lebensmittel gefunden.')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Auswahl'), 'base');
    expect(screen.getByText('Keine Lebensmittel gefunden.')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Auswahl'), 'custom');
    change('Lebensmittel suchen', 'NICHT VORHANDEN');
    expect(screen.getByText('Keine Lebensmittel gefunden.')).toBeVisible();
    change('Lebensmittel suchen', 'Hafer');
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken auswählen' }),
    );
    await user.selectOptions(screen.getByLabelText('Einheit'), '');
    await user.selectOptions(screen.getByLabelText('Einheit'), 'oats-portion');
    change('Menge', '2');
    expect(screen.getByText(/100 g/)).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Zurück zur Auswahl' }),
    );
    await user.click(screen.getByRole('button', { name: 'Schließen' }));
    await user.click(screen.getByRole('button', { name: 'Vorheriger Tag' }));
    await user.click(screen.getByRole('button', { name: 'Nächster Tag' }));
    await user.click(screen.getByRole('button', { name: 'Heute' }));
    change('Tag auswählen', '2026-10-19');
    expect(screen.getByLabelText('Tag auswählen')).toHaveValue('2026-10-19');
  });
});

describe('quick capture, templates and recipes', () => {
  const oatDrink = baseSeed.foods.find((food) => food.id === 'bls4-C660000')!;
  it('searches synonyms, adds several foods in a row and suggests the last amount', async () => {
    const data = dataset();
    data.foods.push(oatDrink);
    data.portions.push(
      baseSeed.portions.find((portion) => portion.foodId === oatDrink.id)!,
    );
    await seed(data);
    const user = await start();
    await user.click(
      screen.getByRole('button', { name: 'Zu Abendessen hinzufügen' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken auswählen' }),
    );
    expect(screen.getByLabelText('Mahlzeit')).toHaveValue('dinner');
    change('Menge', '2');
    await user.click(
      screen.getByRole('button', { name: 'Speichern und weiter' }),
    );
    expect(
      await screen.findByText('Haferflocken zu Abendessen hinzugefügt.'),
    ).toHaveAttribute('role', 'status');
    change('Lebensmittel suchen', 'hafermilch');
    expect(
      screen.queryByRole('button', { name: 'Haferflocken auswählen' }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', {
        name: 'Hafermilch (Haferdrink), ungesüßt auswählen',
      }),
    );
    expect(screen.getByLabelText('Mahlzeit')).toHaveValue('dinner');
    expect(
      screen.queryByText(/wie bei deinem letzten/),
    ).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Einheit'), '');
    change('Menge', '300');
    await user.click(screen.getByRole('button', { name: 'Eintrag speichern' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    const saved = await stored();
    expect(saved.diaryEntries.map((entry) => entry.meal)).toEqual([
      'dinner',
      'dinner',
    ]);
    expect(saved.foods.filter((food) => food.lastUsedAt !== null)).toHaveLength(
      2,
    );
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken auswählen' }),
    );
    expect(
      screen.getByText('Menge wie bei deinem letzten Eintrag.'),
    ).toBeVisible();
    expect(screen.getByLabelText('Einheit')).toHaveValue('oats-portion');
    expect(screen.getByLabelText('Menge', { exact: true })).toHaveValue(2);
    await user.click(
      screen.getByRole('button', { name: 'Zurück zur Auswahl' }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Hafermilch (Haferdrink), ungesüßt auswählen',
      }),
    );
    expect(screen.getByLabelText('Einheit')).toHaveValue('');
    expect(screen.getByLabelText('Menge', { exact: true })).toHaveValue(300);
    await user.click(
      screen.getByRole('button', { name: 'Zurück zur Auswahl' }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Hafermilch (Haferdrink), ungesüßt: bearbeiten',
      }),
    );
    expect(
      screen.getByText(/Bereits auffindbar unter: Hafermilch/),
    ).toBeVisible();
    change('Weitere Suchbegriffe (durch Komma getrennt)', 'Oatly, Oatly , ');
    await user.click(
      screen.getByRole('button', { name: 'Lebensmittel speichern' }),
    );
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
    expect(
      (await stored()).foods.find((food) => food.id === oatDrink.id)?.aliases,
    ).toEqual(['Oatly']);
    change('Lebensmittel suchen', 'oatly');
    expect(
      screen.getByRole('button', {
        name: 'Hafermilch (Haferdrink), ungesüßt auswählen',
      }),
    ).toBeVisible();
  });
  it('copies a meal from the previous day and saves, applies and deletes templates', async () => {
    const data = dataset();
    data.diaryEntries = [diary()];
    await seed(data);
    const user = await start();
    change('Tag auswählen', '2026-10-21');
    expect(
      screen.queryByRole('button', { name: 'Frühstück als Vorlage speichern' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: 'Mittagessen vom Vortag übernehmen',
      }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Frühstück vom Vortag übernehmen' }),
    );
    await screen.findByRole('button', { name: 'Haferflocken bearbeiten' });
    expect(
      (await stored()).diaryEntries.filter(
        (entry) => entry.date === '2026-10-21',
      ),
    ).toEqual([
      expect.objectContaining({ meal: 'breakfast', amount: 50, points: 6 }),
    ]);
    await user.click(
      screen.getByRole('button', { name: 'Frühstück als Vorlage speichern' }),
    );
    await user.click(screen.getByRole('button', { name: 'Schließen' }));
    await user.click(
      screen.getByRole('button', { name: 'Frühstück als Vorlage speichern' }),
    );
    expect(screen.getByLabelText('Name der Vorlage')).toHaveValue('Frühstück');
    change('Name der Vorlage', 'Mein Porridge');
    await user.click(screen.getByRole('button', { name: 'Vorlage speichern' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect((await stored()).mealTemplates).toEqual([
      expect.objectContaining({
        name: 'Mein Porridge',
        meal: 'breakfast',
        items: [{ foodId: 'oats', amount: 50, portionLabel: 'Schale' }],
      }),
    ]);
    change('Tag auswählen', '2026-10-25');
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    change('Lebensmittel suchen', 'zzz');
    expect(
      screen.queryByRole('region', { name: 'Mahlzeit-Vorlagen' }),
    ).not.toBeInTheDocument();
    change('Lebensmittel suchen', 'hafer');
    await user.click(
      screen.getByRole('button', { name: 'Vorlage Mein Porridge auswählen' }),
    );
    expect(screen.getByText('Schale')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(
      '1 Lebensmittel · 6 Punkte',
    );
    change('Menge Haferflocken (g)', '100');
    expect(screen.queryByText('Schale')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('11 Punkte');
    await user.click(screen.getByLabelText('Haferflocken'));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Bitte mindestens ein Lebensmittel',
    );
    expect(
      screen.getByRole('button', { name: 'Vorlage eintragen' }),
    ).toBeDisabled();
    await user.click(screen.getByLabelText('Haferflocken'));
    await user.selectOptions(screen.getByLabelText('Mahlzeit'), 'lunch');
    await user.click(screen.getByRole('button', { name: 'Vorlage eintragen' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    const applied = (await stored()).diaryEntries.filter(
      (entry) => entry.date === '2026-10-25',
    );
    expect(applied).toEqual([
      expect.objectContaining({
        meal: 'lunch',
        amount: 100,
        points: 11,
        portionLabel: null,
      }),
    ]);
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    await user.selectOptions(screen.getByLabelText('Auswahl'), 'templates');
    expect(
      screen.queryByRole('button', { name: 'Haferflocken auswählen' }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Vorlage Mein Porridge löschen' }),
    );
    expect(
      await screen.findByText(/Noch keine passenden Vorlagen/),
    ).toBeVisible();
    expect((await stored()).mealTemplates).toEqual([]);
  });
  it('creates and edits recipes, recalculates them and guards ingredient deletion', async () => {
    const cinnamon: Food = {
      ...oats,
      id: 'cinnamon',
      name: 'Zimt',
      defaultPortionId: null,
    };
    const template = (id: string, foodIds: string[]): MealTemplate => ({
      id,
      name: id,
      meal: 'snack',
      items: foodIds.map((foodId) => ({
        foodId,
        amount: 10,
        portionLabel: null,
      })),
      createdAt: stamp,
      updatedAt: stamp,
    });
    const data = dataset();
    data.foods.push(cinnamon);
    data.mealTemplates = [
      template('nur-hafer', ['oats']),
      template('gemischt', ['oats', 'cinnamon']),
      template('nur-zimt', ['cinnamon']),
    ];
    await seed(data);
    const user = await start();
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    await user.click(screen.getByRole('button', { name: 'Rezept anlegen' }));
    expect(screen.getByText(/Name, mindestens eine Zutat/)).toBeVisible();
    expect(screen.getByText('Noch keine Zutaten.')).toBeVisible();
    change('Name des Rezepts', 'Overnight Oats');
    change('Zutat suchen', 'xyz');
    expect(screen.getByText('Keine passende Zutat gefunden.')).toBeVisible();
    change('Zutat suchen', 'hafer');
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken als Zutat hinzufügen' }),
    );
    expect(screen.getByLabelText('Haferflocken: Menge (g)')).toHaveValue(50);
    change('Zutat suchen', 'zimt');
    await user.click(
      screen.getByRole('button', { name: 'Zimt als Zutat hinzufügen' }),
    );
    expect(screen.getByLabelText('Zimt: Menge (g)')).toHaveValue(100);
    await user.click(screen.getByRole('button', { name: 'Zimt entfernen' }));
    change('Haferflocken: Menge (g)', '200');
    change('Anzahl Portionen', '2');
    const preview = () =>
      within(screen.getByRole('dialog', { name: 'Rezept anlegen' })).getByRole(
        'status',
      );
    expect(preview()).toHaveTextContent(
      'Gesamt 200 g · Portion 100 g · 11 Punkte pro Portion',
    );
    change('Gewicht fertig gekocht (g, optional)', '400');
    expect(preview()).toHaveTextContent(
      'Gesamt 400 g · Portion 200 g · 11 Punkte pro Portion',
    );
    change('Anzahl Portionen', '');
    expect(
      screen.getByRole('button', { name: 'Rezept speichern' }),
    ).toBeDisabled();
    change('Anzahl Portionen', '2');
    await user.click(screen.getByRole('button', { name: 'Rezept speichern' }));
    expect(
      await screen.findByRole('heading', { name: 'Overnight Oats' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Einheit')).toHaveDisplayValue(
      'Portion (1/2) (200 g)',
    );
    await user.click(screen.getByRole('button', { name: 'Eintrag speichern' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    let saved = await stored();
    const recipe = saved.foods.find((food) => food.recipe)!;
    expect(recipe).toMatchObject({
      name: 'Overnight Oats',
      category: 'Rezepte',
      per100: { kcal: 185 },
      recipe: {
        ingredients: [{ foodId: 'oats', grams: 200 }],
        servings: 2,
        yieldGrams: 400,
      },
    });
    expect(saved.diaryEntries[0]).toMatchObject({ amount: 200, points: 11 });
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken: bearbeiten' }),
    );
    change('Energie (kcal)', '740');
    await user.click(
      screen.getByRole('button', { name: 'Lebensmittel speichern' }),
    );
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
    saved = await stored();
    expect(saved.foods.find((food) => food.id === recipe.id)?.per100.kcal).toBe(
      370,
    );
    expect(saved.diaryEntries[0].points).toBe(11);
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken: löschen' }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      '„Haferflocken“ wird in „Overnight Oats“ verwendet.',
    );
    expect((await stored()).foods).toHaveLength(3);
    await user.selectOptions(screen.getByLabelText('Auswahl'), 'recipes');
    expect(screen.getByText('Rezept · 1 Zutaten')).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Overnight Oats: bearbeiten' }),
    );
    expect(screen.getByLabelText('Name des Rezepts')).toHaveValue(
      'Overnight Oats',
    );
    change('Name des Rezepts', 'Overnight Oats XL');
    await user.click(screen.getByRole('button', { name: 'Rezept speichern' }));
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
    await user.click(
      screen.getByRole('button', { name: 'Overnight Oats XL: bearbeiten' }),
    );
    await user.click(
      within(
        screen.getByRole('dialog', { name: 'Rezept bearbeiten' }),
      ).getByRole('button', { name: 'Schließen' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Overnight Oats XL: löschen' }),
    );
    await waitFor(async () =>
      expect((await stored()).foods.some((food) => food.recipe)).toBe(false),
    );
    await user.selectOptions(screen.getByLabelText('Auswahl'), 'all');
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken: löschen' }),
    );
    await waitFor(async () =>
      expect((await stored()).foods.map((food) => food.id)).toEqual([
        'cinnamon',
      ]),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect((await stored()).mealTemplates).toEqual([
      expect.objectContaining({
        id: 'gemischt',
        items: [expect.objectContaining({ foodId: 'cinnamon' })],
      }),
      template('nur-zimt', ['cinnamon']),
    ]);
  });
  it('lists recipes and templates in their own view to log, rename, edit and delete', async () => {
    const user = await start();
    await user.click(
      screen.getByRole('button', { name: 'Rezepte & Vorlagen' }),
    );
    expect(
      screen.getByRole('heading', { name: 'Rezepte & Vorlagen' }),
    ).toBeVisible();
    expect(screen.getByText(/Noch keine Rezepte/)).toBeVisible();
    expect(screen.getByText(/Noch keine Vorlagen/)).toBeVisible();
    cleanup();

    const data = dataset();
    const built = recipeFood(
      { ...oats, id: 'recipe', name: 'Overnight Oats', category: 'Rezepte' },
      {
        ingredients: [{ foodId: 'oats', grams: 100 }],
        servings: 2,
        yieldGrams: null,
      },
      data.foods,
    );
    data.foods.push(built.food);
    data.portions.push(...built.portions);
    data.mealTemplates = [
      {
        id: 'porridge',
        name: 'Porridge',
        meal: 'breakfast',
        items: [{ foodId: 'oats', amount: 50, portionLabel: 'Schale' }],
        createdAt: stamp,
        updatedAt: stamp,
      },
    ];
    await seed(data);
    const next = await start();
    await next.click(
      screen.getByRole('button', { name: 'Rezepte & Vorlagen' }),
    );
    expect(screen.getByText('Overnight Oats')).toBeVisible();
    expect(
      screen.getByText(
        `2 Portionen · 50 g · ${foodPoints(built.food, 50).points} Punkte pro Portion`,
      ),
    ).toBeVisible();
    expect(screen.getByText('Haferflocken')).toBeVisible();
    expect(
      screen.getByText(
        `Frühstück · 1 Lebensmittel · ${foodPoints(oats, 50).points} Punkte`,
      ),
    ).toBeVisible();
    expect(screen.getByText('Haferflocken 50 g')).toBeVisible();

    await next.click(
      screen.getByRole('button', { name: 'Vorlage Porridge umbenennen' }),
    );
    change('Name der Vorlage', 'Porridge mit Zimt');
    await next.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(async () =>
      expect((await stored()).mealTemplates[0].name).toBe('Porridge mit Zimt'),
    );

    await next.click(
      screen.getByRole('button', {
        name: 'Vorlage Porridge mit Zimt eintragen',
      }),
    );
    await next.click(screen.getByRole('button', { name: 'Vorlage eintragen' }));
    expect(
      await screen.findByText(/„Porridge mit Zimt“ am .* eingetragen\./),
    ).toHaveAttribute('role', 'status');
    expect((await stored()).diaryEntries).toEqual([
      expect.objectContaining({
        foodId: 'oats',
        meal: 'breakfast',
        amount: 50,
      }),
    ]);

    await next.click(
      screen.getByRole('button', { name: 'Rezept Overnight Oats bearbeiten' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Rezept bearbeiten' }),
    ).toBeVisible();
    await next.click(screen.getByRole('button', { name: 'Schließen' }));
    await next.click(
      screen.getByRole('button', { name: 'Rezept Overnight Oats löschen' }),
    );
    await next.click(
      screen.getByRole('button', { name: 'Vorlage Porridge mit Zimt löschen' }),
    );
    await waitFor(async () => {
      const saved = await stored();
      expect(saved.foods.map((food) => food.id)).toEqual(['oats']);
      expect(saved.portions.map((portion) => portion.foodId)).toEqual(['oats']);
      expect(saved.mealTemplates).toEqual([]);
    });
  });
});

describe('all settings, food, activity and weight forms', () => {
  it('profile calculations, all inputs, overrides and explicit save errors', async () => {
    const user = await start();
    await user.click(
      screen.getByRole('button', { name: 'Profil/Einstellungen' }),
    );
    await user.selectOptions(screen.getByLabelText('Geschlecht'), 'female');
    await user.click(screen.getByLabelText('Stillen'));
    change('Alter (Jahre)', '30');
    change('Größe (cm)', '165');
    change('Gewicht fürs Budget (kg)', '70');
    await user.selectOptions(screen.getByLabelText('Aktivitätsniveau'), '2');
    expect(screen.getByText('34 Tagespunkte')).toBeVisible();
    change('Tagesbudget', '30');
    change('Wochenbudget', '40');
    await user.click(screen.getByRole('button', { name: 'Profil speichern' }));
    expect(await screen.findByText('Profil gespeichert.')).toBeVisible();
    expect((await stored()).profile).toMatchObject({
      dailyBudgetOverride: 30,
      weeklyBudgetOverride: 40,
    });
    change('Tagesbudget', '');
    change('Wochenbudget', '');
    await user.click(screen.getByRole('button', { name: 'Profil speichern' }));
    await waitFor(async () =>
      expect((await stored()).profile?.dailyBudgetOverride).toBeNull(),
    );
    vi.spyOn(Repository.prototype, 'replace').mockRejectedValueOnce(
      new Error('Speicher voll'),
    );
    change('Tagesbudget', '99');
    await user.click(screen.getByRole('button', { name: 'Profil speichern' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Speicher voll');
    expect((await stored()).profile?.dailyBudgetOverride).toBeNull();
  });
  it('creates, modifies and deletes foods and reusable portions without altering diary snapshots', async () => {
    const user = await start();
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    await user.click(
      screen.getByRole('button', { name: 'Eigenes Lebensmittel anlegen' }),
    );
    change('Name', 'Mein Drink');
    change('Kategorie', 'Getränke');
    await user.selectOptions(screen.getByLabelText('Nährwertbasis'), 'ml');
    change('Energie (kcal)', '50');
    change('Gesättigte Fette (g)', '1');
    change('Zucker (g)', '2');
    change('Protein (g)', '3');
    await user.click(
      screen.getByLabelText('Als 0-Punkte-Lebensmittel bewerten'),
    );
    change('Portion 1: Bezeichnung', 'Glas');
    change('Portion 1: Menge', '250');
    await user.click(
      screen.getByRole('button', { name: 'Portion hinzufügen' }),
    );
    change('Portion 2: Bezeichnung', 'Unbekannt');
    await user.click(
      screen.getByRole('button', { name: 'Lebensmittel speichern' }),
    );
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
    expect(screen.getByLabelText('Einheit')).toHaveDisplayValue(
      'Glas (250 ml)',
    );
    expect(
      screen.queryByRole('option', { name: /Unbekannt/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Eintrag speichern' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    await user.click(
      screen.getByRole('button', { name: 'Mein Drink: bearbeiten' }),
    );
    change('Name', 'Mein neuer Drink');
    change('Portion 1: Menge', '');
    await user.click(
      screen.getByRole('button', { name: 'Portion 2 entfernen' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Portion 1 entfernen' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Portion hinzufügen' }),
    );
    change('Portion 1: Bezeichnung', 'Flasche');
    change('Portion 1: Menge', '500');
    await user.click(screen.getByLabelText('Standard'));
    await user.click(
      screen.getByRole('button', { name: 'Lebensmittel speichern' }),
    );
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
    await user.click(
      screen.getByRole('button', { name: 'Mein neuer Drink: löschen' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Mein neuer Drink: bearbeiten' }),
      ).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(
      screen.getByRole('button', { name: 'Mein Drink bearbeiten' }),
    ).toBeVisible();
    expect((await stored()).diaryEntries[0].foodSnapshot.name).toBe(
      'Mein Drink',
    );
  });
  it('captures, edits, cancels and deletes activities without budget effects', async () => {
    const user = await start();
    await user.click(
      screen.getByRole('button', { name: /0 Aktivitätspunkte/ }),
    );
    change('Aktivität', 'Gehen');
    change('Dauer (Minuten)', '45');
    expect(screen.getByText('3 Aktivitätspunkte')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Intensität'), 'high');
    await user.click(
      screen.getByRole('button', { name: 'Aktivität speichern' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Gehen bearbeiten' }),
    );
    change('Aktivität', 'Radfahren');
    await user.selectOptions(screen.getByLabelText('Intensität'), 'low');
    await user.click(
      screen.getByRole('button', { name: 'Aktivität speichern' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Radfahren bearbeiten' }),
    );
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    await user.click(screen.getByRole('button', { name: 'Radfahren löschen' }));
    await waitFor(() =>
      expect(screen.getByText('Noch keine Aktivitäten erfasst.')).toBeVisible(),
    );
    await user.click(screen.getByRole('button', { name: 'Tag' }));
    expect(
      within(screen.getByRole('region', { name: 'Tagespunkte' })).getAllByText(
        '36',
      ),
    ).toHaveLength(2);
  });
  it('captures irregular weights and supports edit/delete and accessible daily chart', async () => {
    const user = await start();
    await user.click(screen.getByRole('button', { name: /Noch kein Gewicht/ }));
    expect(screen.getByText(/Noch keine Gewichtseinträge/)).toBeVisible();
    change('Datum', '2026-10-01');
    change('Gewicht (kg)', '82');
    await user.click(screen.getByRole('button', { name: 'Gewicht speichern' }));
    await screen.findByRole('table');
    change('Datum', '2026-10-20');
    change('Gewicht (kg)', '79');
    await user.click(screen.getByRole('button', { name: 'Gewicht speichern' }));
    expect((await screen.findAllByText('-3 kg'))[0]).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Gewicht vom 2026-10-20 bearbeiten' }),
    );
    change('Gewicht (kg)', '78');
    await user.click(screen.getByRole('button', { name: 'Gewicht speichern' }));
    expect((await screen.findAllByText('-4 kg'))[0]).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Gewicht vom 2026-10-20 bearbeiten' }),
    );
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    await user.click(
      screen.getByRole('button', { name: 'Gewicht vom 2026-10-20 löschen' }),
    );
    await waitFor(() =>
      expect(screen.queryByText('-4 kg')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(/Gewichtsdiagramm/);
  });
  it('weight changes are relative to first and previous daily measurement', () => {
    render(
      <WeightChart
        entries={[
          weight('2026-10-01', 82),
          weight('2026-10-15', 81),
          weight('2026-10-20', 79),
        ]}
      />,
    );
    expect(screen.getByText('-3 kg')).toBeVisible();
    expect(screen.getByText('-2 kg')).toBeVisible();
  });
});

describe('backups and first start', () => {
  it('rejects malformed imports, requires confirmation, cancels and restores entire data', async () => {
    const user = await start();
    await user.click(
      screen.getByRole('button', { name: 'Profil/Einstellungen' }),
    );
    const input = screen.getByLabelText('Daten importieren');
    const file = (text: string) => {
      const value = new File([text], 'backup.json', {
        type: 'application/json',
      });
      Object.defineProperty(value, 'text', { value: async () => text });
      return value;
    };
    await user.upload(input, file('broken'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Import abgewiesen',
    );
    const restored = dataset();
    restored.profile!.dailyBudgetOverride = 77;
    const json = serializeBackup(restored, new Date(stamp));
    await user.upload(input, file(json));
    expect(await screen.findByRole('dialog')).toHaveAccessibleName(
      'Sicherung wiederherstellen',
    );
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect((await stored()).profile?.dailyBudgetOverride).toBeNull();
    await user.upload(input, file(json));
    await user.click(
      await screen.findByRole('button', { name: 'Daten ersetzen' }),
    );
    expect(
      await screen.findByText('Sicherung vollständig wiederhergestellt.'),
    ).toBeVisible();
    expect(screen.getByLabelText('Tagesbudget', { exact: true })).toHaveValue(
      77,
    );
    expect((await stored()).profile?.dailyBudgetOverride).toBe(77);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: 'Daten exportieren' }));
    expect(
      screen.getByText('Sicherung zum Download bereitgestellt.'),
    ).toBeVisible();
    await user.upload(
      input,
      file(serializeBackup({ ...dataset(), profile: null }, new Date(stamp))),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Daten ersetzen' }),
    );
    await screen.findByText('Sicherung vollständig wiederhergestellt.');
    expect(screen.getByLabelText('Tagesbudget', { exact: true })).toHaveValue(
      null,
    );
    expect(screen.getByText(/Willkommen! Richte/)).toBeVisible();
  });
  it('handles empty profile and startup storage failure explicitly', async () => {
    const repository = new Repository(await openDatabase());
    await repository.replace({ ...dataset(), profile: null });
    repository.close();
    const user = await start();
    expect(screen.getByText('Willkommen bei TrackYourself')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Profil einrichten' }));
    expect(screen.getByText(/Willkommen! Richte/)).toBeVisible();
    cleanup();
    vi.spyOn(Repository.prototype, 'seed').mockRejectedValueOnce(
      new Error('Zugriff verweigert'),
    );
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Lokaler Speicher nicht verfügbar: Zugriff verweigert',
    );
  });
  it('warns on blocked storage upgrades', async () => {
    await start();
    window.dispatchEvent(new CustomEvent('storage-blocked'));
    expect(await screen.findByRole('alert')).toHaveTextContent('anderen Tab');
  });
});

it('propagates failed diary deletion without pretending success', async () => {
  const save = vi
    .fn<(data: Dataset) => Promise<boolean>>()
    .mockResolvedValue(false);
  const close = vi.fn();
  render(
    <EntryForm
      entry={diary()}
      data={dataset()}
      date="2026-10-20"
      save={save}
      busy={false}
      onClose={close}
    />,
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Eintrag löschen' }),
  );
  expect(close).not.toHaveBeenCalled();
});
