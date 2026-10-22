import { describe, expect, it } from 'vitest';
import { baseAliases, baseBlsNames, baseSeed } from '../../src/data/seed';
import { foodPoints } from '../../src/domain/points';
import {
  recipeFood,
  recipeNutrients,
  recipePortions,
  recipesUsing,
  recipeWeight,
  refreshRecipes,
  withoutFood,
} from '../../src/domain/recipes';
import { normalize, searchFoods } from '../../src/domain/search';
import {
  copyEntries,
  entriesFromItems,
  lastEntryFor,
  markUsed,
  templateFromEntries,
  templatePoints,
} from '../../src/domain/templates';
import type { Food, Recipe } from '../../src/domain/types';
import { dataset, diary, oats, stamp } from '../fixtures';

function food(id: string, name: string, extra: Partial<Food> = {}): Food {
  return { ...oats, id, name, defaultPortionId: null, ...extra };
}
const names = (foods: Food[]) => foods.map((value) => value.name);

describe('S1–S9 search', () => {
  const pasta = food('pasta', 'Teigwaren eifrei, gekocht');
  const salad = food('salad', 'Nudelsalat', { category: null });
  const potato = food('potato', 'Kartoffel geschält, gekocht', {
    aliases: ['Salzkartoffeln'],
  });
  const milk = food('milk', 'Milch');
  const all = [pasta, salad, potato, milk];
  const aliases = new Map([['pasta', ['Nudeln gekocht', 'Nudeln', 'Pasta']]]);

  it('S1 normalizes case, umlauts, ß, diacritics and punctuation', () => {
    expect(normalize('  Süßkartoffel, Crème-fraîche! ÄÖÜ ')).toBe(
      'suesskartoffel creme fraiche aeoeue',
    );
    expect(searchFoods([potato], 'KARTOFFEL GESCHAELT')).toEqual([potato]);
  });
  it('S2 finds foods by synonyms from the base list and user search terms', () => {
    expect(searchFoods(all, 'Nudeln', aliases)[0]).toBe(pasta);
    expect(searchFoods(all, 'salzkartoffeln')).toEqual([potato]);
    expect(searchFoods(all, 'Nudeln')).toEqual([salad]);
  });
  it('S3 matches plurals and inflected forms by stemming', () => {
    expect(searchFoods(all, 'Kartoffeln')).toEqual([potato]);
    expect(searchFoods(all, 'Milche')).toEqual([milk]);
    expect(searchFoods([food('t', 'Tomate roh')], 'Tomaten')).toHaveLength(1);
    expect(searchFoods([food('q', 'Quark')], 'quark')).toHaveLength(1);
  });
  it('S4 requires every token, in any order, and ignores spacing', () => {
    expect(searchFoods(all, 'gekocht kartoffel')).toEqual([potato]);
    expect(searchFoods(all, 'kartoffel roh')).toEqual([]);
    expect(searchFoods([food('h', 'Hafer Flocken')], 'haferflocken')).toEqual([
      expect.objectContaining({ id: 'h' }),
    ]);
  });
  it('S5 tolerates one typo in longer words but not in short ones', () => {
    const broccoli = food('b', 'Brokkoli roh');
    expect(searchFoods([broccoli], 'Brokoli')).toEqual([broccoli]);
    expect(searchFoods([broccoli], 'Brokkolli')).toEqual([broccoli]);
    expect(searchFoods([broccoli], 'Brikkoli')).toEqual([broccoli]);
    expect(searchFoods([milk], 'Milchh')).toEqual([milk]);
    expect(searchFoods([milk], 'Milk')).toEqual([]);
    expect(searchFoods([broccoli], 'Brxxkoli')).toEqual([]);
    expect(searchFoods([food('x', 'ab')], 'abcdefg')).toEqual([]);
  });
  it('S6 short tokens only match word beginnings', () => {
    const egg = food('egg', 'Ei gekocht');
    const rice = food('rice', 'Reis');
    expect(searchFoods([egg, rice], 'Ei')).toEqual([egg]);
  });
  it('S7 ranks exact name, exact synonym, name prefix, synonym prefix, word starts, inner matches', () => {
    const exact = food('1', 'Nudel');
    const synonym = food('2', 'Spirelli', { aliases: ['Nudel'] });
    const prefix = food('3', 'Nudel mit Sauce');
    const synonymPrefix = food('4', 'Fusilli', { aliases: ['Nudel lang'] });
    const word = food('5', 'Pasta Nudeln');
    const inner = food('6', 'Bandnudel');
    const category = food('7', 'Weizenmehl Type 405', { category: 'Nudel' });
    expect(
      searchFoods(
        [category, inner, word, synonymPrefix, prefix, synonym, exact],
        'nudel',
      ),
    ).toEqual([exact, synonym, prefix, synonymPrefix, word, inner, category]);
  });
  it('S8 prefers favorites, then shorter names, then alphabetical order', () => {
    const a = food('a', 'Apfel roh');
    const b = food('b', 'Apfel Saft', { isFavorite: true });
    const c = food('c', 'Apfel', { category: 'Obst' });
    expect(names(searchFoods([a, b, c], 'apfe'))).toEqual([
      'Apfel Saft',
      'Apfel',
      'Apfel roh',
    ]);
    expect(names(searchFoods([a, food('z', 'Apfel rot')], 'apfel r'))).toEqual([
      'Apfel roh',
      'Apfel rot',
    ]);
  });
  it('S9 without query lists favorites first, then alphabetically', () => {
    expect(
      names(searchFoods([milk, salad, { ...pasta, isFavorite: true }], '  ')),
    ).toEqual(['Teigwaren eifrei, gekocht', 'Milch', 'Nudelsalat']);
  });
});

describe('C1–C5 base catalog', () => {
  const top = (query: string) =>
    searchFoods(baseSeed.foods, query, baseAliases)[0]?.name;
  it('C1 finds common household terms with a sensible first hit', () => {
    expect(top('Nudeln')).toBe('Nudeln, gekocht');
    expect(top('Spaghetti')).toBe('Nudeln, gekocht');
    expect(top('Kartoffeln')).toBe('Kartoffeln, gekocht');
    expect(top('Hafermilch')).toBe('Hafermilch (Haferdrink), ungesüßt');
    expect(top('Hackfleisch')).toMatch(/hackfleisch/i);
    expect(top('Haferflocken')).toBe('Haferflocken');
    expect(top('Porridge')).toMatch(/^Porridge/);
    expect(top('Chili con carne')).toBe('Chili con carne');
    expect(top('Möhren')).toBe('Karotte (Möhre)');
    expect(top('Brokoli')).toBe('Brokkoli');
    expect(top('Reis')).toBe('Reis, gekocht');
    expect(top('Eier')).toMatch(/^Ei, /);
    expect(top('Kaffee')).toBe('Kaffee schwarz');
  });
  it('C2 covers prepared states and complete dishes', () => {
    const all = (query: string) =>
      names(searchFoods(baseSeed.foods, query, baseAliases));
    expect(all('Kartoffel gekocht').length).toBeGreaterThanOrEqual(2);
    expect(all('Hackfleisch').length).toBeGreaterThanOrEqual(3);
    for (const dish of ['Bolognese', 'Lasagne', 'Pizza', 'Gulasch', 'Rührei'])
      expect(all(dish).length).toBeGreaterThan(0);
  });
  it('C3 every base food is found by its own name and has a usable portion', () => {
    for (const value of baseSeed.foods) {
      expect(searchFoods(baseSeed.foods, value.name, baseAliases)[0]).toBe(
        value,
      );
      expect(
        baseSeed.portions.find((p) => p.id === value.defaultPortionId)?.grams,
      ).toBeGreaterThan(0);
    }
  });
  it('C4 provides search terms for every base food', () => {
    expect(baseAliases.size).toBe(baseSeed.foods.length);
    expect(
      baseSeed.foods.filter((value) => !baseAliases.get(value.id)?.length),
    ).toEqual([]);
  });
  it('C5 shows unique everyday names and keeps the BLS designation searchable', () => {
    const shown = baseSeed.foods.map((value) => value.name);
    expect(new Set(shown).size).toBe(shown.length);
    expect(shown).not.toContain('Teigwaren eifrei, gekocht');
    expect(shown).not.toContain('Eierteigwaren gekocht');
    expect(shown).toContain('Eiernudeln, gekocht');
    expect(baseBlsNames.size).toBe(baseSeed.foods.length);
    for (const value of baseSeed.foods) {
      const original = baseBlsNames.get(value.id)!;
      expect(searchFoods(baseSeed.foods, original, baseAliases)).toContain(
        value,
      );
    }
  });
});

describe('R1–R7 recipes', () => {
  const beef = food('beef', 'Hackfleisch', {
    per100: { kcal: 200, satFat: 6, sugar: 0, protein: 20 },
  });
  const beans = food('beans', 'Kidneybohnen', {
    countsAsZero: true,
    per100: { kcal: 100, satFat: 0, sugar: 1, protein: 8 },
  });
  const sauce = food('sauce', 'Sauce', {
    per100: { kcal: 50, satFat: null, sugar: 5, protein: 1 },
    dataQuality: 'incomplete',
  });
  const recipe: Recipe = {
    ingredients: [
      { foodId: 'beef', grams: 500 },
      { foodId: 'beans', grams: 500 },
    ],
    servings: 4,
    yieldGrams: null,
  };
  const foods = [beef, beans, sauce];

  it('R1 total weight is the ingredient sum or the weighed final yield', () => {
    expect(recipeWeight(recipe)).toBe(1000);
    expect(recipeWeight({ ...recipe, yieldGrams: 800 })).toBe(800);
  });
  it('R2 zero-point ingredients add weight but no points', () => {
    expect(recipeNutrients(recipe, foods)).toEqual({
      kcal: 100,
      satFat: 3,
      sugar: 0,
      protein: 10,
    });
    expect(recipeNutrients({ ...recipe, yieldGrams: 800 }, foods).kcal).toBe(
      125,
    );
  });
  it('R3 a missing nutrient of a counted ingredient stays unknown', () => {
    const withSauce = {
      ...recipe,
      ingredients: [...recipe.ingredients, { foodId: 'sauce', grams: 100 }],
    };
    expect(recipeNutrients(withSauce, foods).satFat).toBeNull();
    expect(
      recipeNutrients(
        {
          ...withSauce,
          ingredients: [...withSauce.ingredients, { foodId: 'beef', grams: 1 }],
        },
        foods,
      ).satFat,
    ).toBeNull();
    expect(() =>
      recipeNutrients(
        { ...recipe, ingredients: [{ foodId: 'gone', grams: 1 }] },
        foods,
      ),
    ).toThrow('unbekanntes Lebensmittel');
  });
  it('R4 creates a serving portion as default and a whole-recipe portion', () => {
    expect(recipePortions('chili', recipe)).toEqual({
      defaultPortionId: 'chili-serving',
      portions: [
        expect.objectContaining({
          id: 'chili-serving',
          label: 'Portion (1/4)',
          grams: 250,
          isDefault: true,
        }),
        expect.objectContaining({
          id: 'chili-whole',
          label: 'Ganzes Rezept',
          grams: 1000,
          isDefault: false,
        }),
      ],
    });
    expect(recipePortions('one', { ...recipe, servings: 1 }).portions).toEqual([
      expect.objectContaining({ label: 'Portion', grams: 1000 }),
    ]);
  });
  it('R5 a recipe portion costs the same points as its ingredients share', () => {
    const { food: chili } = recipeFood(food('chili', 'Chili'), recipe, foods);
    expect(chili).toMatchObject({
      countsAsZero: false,
      basis: 'g',
      dataQuality: 'complete',
      defaultPortionId: 'chili-serving',
      recipe,
    });
    expect(foodPoints(chili, 250).points).toBe(
      Math.ceil(foodPoints(beef, 125).points),
    );
  });
  it('R6 recalculates recipes after ingredient changes and leaves other foods untouched', () => {
    const built = recipeFood(food('chili', 'Chili'), recipe, foods);
    const changed = { ...beef, per100: { ...beef.per100, kcal: 400 } };
    const result = refreshRecipes(
      [changed, beans, built.food],
      [...built.portions, { ...built.portions[0], id: 'x', foodId: 'beef' }],
    );
    expect(result.foods[0]).toBe(changed);
    expect(result.foods[2].per100.kcal).toBe(200);
    expect(result.portions).toHaveLength(3);
  });
  it('R7 identifies recipes that use a food', () => {
    const built = recipeFood(food('chili', 'Chili'), recipe, foods);
    expect(recipesUsing('beef', [...foods, built.food])).toEqual([built.food]);
    expect(recipesUsing('sauce', [...foods, built.food])).toEqual([]);
  });
});

describe('T1–T7 templates and quick capture', () => {
  const salt = food('salt', 'Salz');
  it('T1 builds templates from meal entries and skips deleted foods', () => {
    const template = templateFromEntries(
      { id: 't', name: ' Frühstück ', meal: 'breakfast', stamp },
      [diary(), diary({ id: 'gone', foodId: 'deleted' })],
      [oats],
    );
    expect(template).toEqual({
      id: 't',
      name: 'Frühstück',
      meal: 'breakfast',
      items: [{ foodId: 'oats', amount: 50, portionLabel: 'Schale' }],
      createdAt: stamp,
      updatedAt: stamp,
    });
  });
  it('T2 applies templates with current nutrient data and recalculated points', () => {
    let next = 0;
    const changed = { ...oats, per100: { ...oats.per100, kcal: 740 } };
    const entries = entriesFromItems(
      [
        { foodId: 'oats', amount: 100, portionLabel: null },
        { foodId: 'deleted', amount: 10, portionLabel: null },
      ],
      [changed],
      { date: '2026-10-21', meal: 'lunch', stamp, id: () => `n${next++}` },
    );
    expect(entries).toEqual([
      expect.objectContaining({
        id: 'n0',
        date: '2026-10-21',
        meal: 'lunch',
        amount: 100,
        points: foodPoints(changed, 100).points,
        foodSnapshot: expect.objectContaining({ per100: changed.per100 }),
      }),
    ]);
  });
  it('T3 copies entries to another day with their original snapshot', () => {
    const original = diary();
    const [copy] = copyEntries([original], {
      date: '2026-10-21',
      stamp: '2026-10-21T08:00:00.000Z',
      id: () => 'copy',
    });
    expect(copy).toEqual({
      ...original,
      id: 'copy',
      date: '2026-10-21',
      createdAt: '2026-10-21T08:00:00.000Z',
      updatedAt: '2026-10-21T08:00:00.000Z',
    });
    expect(copy.foodSnapshot).not.toBe(original.foodSnapshot);
  });
  it('T4 finds the most recently saved entry of a food', () => {
    const older = diary({ id: 'a', updatedAt: '2026-10-19T08:00:00.000Z' });
    const newer = diary({ id: 'b', updatedAt: '2026-10-21T08:00:00.000Z' });
    expect(
      lastEntryFor('oats', [older, newer, diary({ id: 'c', foodId: 'x' })])?.id,
    ).toBe('b');
    expect(lastEntryFor('oats', [newer, older])?.id).toBe('b');
    expect(lastEntryFor('salt', [older])).toBeUndefined();
  });
  it('T5 marks only used foods as recently used', () => {
    expect(markUsed([oats, salt], ['salt'], stamp)).toEqual([
      oats,
      { ...salt, lastUsedAt: stamp },
    ]);
  });
  it('T6 sums current template points and counts deleted foods as 0', () => {
    const template = templateFromEntries(
      { id: 't', name: 'Snack', meal: 'snack', stamp },
      [diary(), diary({ id: 'b', amount: 100 })],
      [oats],
    );
    template.items.push({ foodId: 'deleted', amount: 10, portionLabel: null });
    expect(templatePoints(template, [oats])).toBe(
      foodPoints(oats, 50).points + foodPoints(oats, 100).points,
    );
  });
  it('T7 deleting a food removes its portions and template items and drops empty templates', () => {
    const data = dataset();
    data.foods.push(salt);
    const item = (foodId: string) => ({
      foodId,
      amount: 5,
      portionLabel: null,
    });
    const template = (id: string, foodIds: string[]) => ({
      id,
      name: id,
      meal: 'snack' as const,
      items: foodIds.map(item),
      createdAt: stamp,
      updatedAt: stamp,
    });
    const keep = template('salt-only', ['salt']);
    data.mealTemplates = [
      template('oats-only', ['oats']),
      template('mixed', ['oats', 'salt']),
      keep,
    ];
    const next = withoutFood(data, 'oats');
    expect(next.foods).toEqual([salt]);
    expect(next.portions).toEqual([]);
    expect(next.mealTemplates).toEqual([template('mixed', ['salt']), keep]);
    expect(next.mealTemplates[1]).toBe(keep);
    expect(data.foods).toHaveLength(2);
  });
});
