import { deleteDB, openDB } from 'idb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Repository, openDatabase } from '../../src/data/db';
import {
  parseBackup,
  restoreBackup,
  serializeBackup,
} from '../../src/data/backup';
import { validateDataset } from '../../src/data/validation';
import { baseBlsNames, baseSeed, seedVersion } from '../../src/data/seed';
import { recipeFood } from '../../src/domain/recipes';
import { foodPoints } from '../../src/domain/points';
import { snapshotOf } from '../../src/domain/templates';
import { dataset, diary, oats, stamp, weight } from '../fixtures';
import type { Dataset, MealTemplate } from '../../src/domain/types';

const template: MealTemplate = {
  id: 'template',
  name: 'Porridge',
  meal: 'breakfast',
  items: [{ foodId: 'oats', amount: 50, portionLabel: 'Schale' }],
  createdAt: stamp,
  updatedAt: stamp,
};
function withRecipe(data: Dataset): Dataset {
  const built = recipeFood(
    { ...oats, id: 'recipe', name: 'Overnight Oats', category: 'Rezepte' },
    {
      ingredients: [{ foodId: 'oats', grams: 50 }],
      servings: 1,
      yieldGrams: 200,
    },
    data.foods,
  );
  return {
    ...data,
    foods: [...data.foods, built.food],
    portions: [...data.portions, ...built.portions],
  };
}

let repository: Repository;
let name: string;
beforeEach(async () => {
  name = crypto.randomUUID();
  repository = new Repository(await openDatabase(name));
});
afterEach(async () => {
  repository.close();
  await deleteDB(name);
});
describe('D1–D7 persistence', () => {
  it('rolls back all stores when a write throws after stores were cleared', async () => {
    const data = dataset();
    await repository.replace(data);
    const put = vi
      .spyOn(IDBObjectStore.prototype, 'put')
      .mockImplementationOnce(() => {
        throw new DOMException('Speicher voll', 'QuotaExceededError');
      });
    await expect(
      repository.replace({ ...data, profile: { ...data.profile!, age: 40 } }),
    ).rejects.toThrow('Speicher voll');
    put.mockRestore();
    expect(await repository.read()).toEqual(data);
  });
  it('rolls back partially seeded data after an interrupted write', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
      throw new DOMException('Schreibzugriff unterbrochen', 'UnknownError');
    });
    await expect(repository.seed()).rejects.toThrow('unterbrochen');
    expect((await repository.read()).foods).toHaveLength(0);
    expect((await repository.read()).appMeta.seededBaseFoodsVersion).toBe(0);
  });
  it('CRUD for every entity, retains portions and diary snapshots after reload', async () => {
    const data = dataset();
    data.diaryEntries = [diary()];
    data.activityEntries = [
      {
        id: 'walk',
        date: '2026-10-20',
        activityType: 'Gehen',
        durationMin: 60,
        intensity: 'medium',
        activityPoints: 4,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ];
    data.weightEntries = [weight('2026-10-20', 80)];
    await repository.replace(data);
    repository.close();
    repository = new Repository(await openDatabase(name));
    expect(await repository.read()).toEqual(data);
    data.portions[0].grams = 60;
    data.foods[0].name = 'Neue Haferflocken';
    data.profile!.dailyBudgetOverride = 25;
    data.activityEntries[0].activityType = 'Laufen';
    data.weightEntries[0].weightKg = 79;
    await repository.replace(data);
    expect(await repository.read()).toEqual(data);
    data.foods = [];
    data.portions = [];
    await repository.replace(data);
    expect((await repository.read()).diaryEntries[0].foodSnapshot.name).toBe(
      'Haferflocken',
    );
    data.profile = null;
    data.diaryEntries = [];
    data.activityEntries = [];
    data.weightEntries = [];
    await repository.replace(data);
    expect(await repository.read()).toEqual(data);
  });
  it('round-trips every entity and metadata identically', async () => {
    const data = withRecipe(dataset());
    data.diaryEntries = [diary()];
    data.mealTemplates = [template];
    data.foods[0].aliases = ['Porridge-Basis'];
    await repository.replace(data);
    const json = serializeBackup(await repository.read(), new Date(stamp));
    expect(parseBackup(json)).toEqual(data);
    await repository.replace({
      ...data,
      foods: [],
      portions: [],
      diaryEntries: [],
      mealTemplates: [],
      profile: null,
    });
    await restoreBackup(repository, json);
    expect(await repository.read()).toEqual(data);
  });
  it('recalculates stored recipes on load without changing diary snapshots', async () => {
    const data = withRecipe(dataset());
    const recipe = data.foods.find((value) => value.id === 'recipe')!;
    const snapshot = snapshotOf(recipe);
    data.diaryEntries = [
      diary({
        foodId: recipe.id,
        foodSnapshot: snapshot,
        points: foodPoints(snapshot, 50).points,
      }),
    ];
    const ingredient = data.foods.find((value) => value.id === oats.id)!;
    ingredient.per100.kcal = (ingredient.per100.kcal ?? 0) + 100;
    await repository.replace(data);

    const loaded = await repository.read();
    const recalculated = loaded.foods.find((value) => value.id === recipe.id)!;
    expect(recalculated.per100.kcal).not.toBe(recipe.per100.kcal);
    expect(loaded.diaryEntries[0].foodSnapshot).toEqual(snapshot);
    expect(loaded.diaryEntries[0].points).toBe(foodPoints(snapshot, 50).points);

    repository.close();
    repository = new Repository(await openDatabase(name));
    expect(await repository.read()).toEqual(loaded);
  });
  it('recalculates recipes restored from backups and preserves diary snapshots', async () => {
    const data = withRecipe(dataset());
    const recipe = data.foods.find((value) => value.id === 'recipe')!;
    const snapshot = snapshotOf(recipe);
    data.diaryEntries = [
      diary({
        foodId: recipe.id,
        foodSnapshot: snapshot,
        points: foodPoints(snapshot, 50).points,
      }),
    ];
    const ingredient = data.foods.find((value) => value.id === oats.id)!;
    ingredient.per100.kcal = (ingredient.per100.kcal ?? 0) + 100;

    await restoreBackup(repository, serializeBackup(data, new Date(stamp)));
    const restored = await repository.read();
    expect(
      restored.foods.find((value) => value.id === recipe.id)!.per100.kcal,
    ).not.toBe(recipe.per100.kcal);
    expect(restored.diaryEntries[0].foodSnapshot).toEqual(snapshot);
    expect(restored.diaryEntries[0].points).toBe(
      foodPoints(snapshot, 50).points,
    );
  });
  it('invalid import never modifies existing data', async () => {
    const data = dataset();
    await repository.replace(data);
    for (const text of [
      '{',
      '{}',
      '{"schemaVersion":999}',
      serializeBackup(data, new Date(stamp)).replace(
        '"grams": 50',
        '"grams": -1',
      ),
    ]) {
      await expect(restoreBackup(repository, text)).rejects.toThrow();
      expect(await repository.read()).toEqual(data);
    }
  });
  it('imports version 2 backups without templates and upgrades metadata', () => {
    const data = dataset();
    data.diaryEntries = [diary()];
    const legacy = JSON.parse(serializeBackup(data, new Date(stamp)));
    legacy.schemaVersion = 2;
    legacy.appMeta.schemaVersion = 2;
    delete legacy.mealTemplates;
    expect(parseBackup(JSON.stringify(legacy))).toEqual(data);
    legacy.appMeta = 'kaputt';
    expect(() => parseBackup(JSON.stringify(legacy))).toThrow();
  });
  it('seeds once without duplicates, validates 180–260 source-backed foods', async () => {
    await repository.seed();
    const first = await repository.read();
    expect(first.foods.length).toBeGreaterThanOrEqual(180);
    expect(first.foods.length).toBeLessThanOrEqual(260);
    expect(
      first.foods.every((food) => food.sourceRef?.startsWith('BLS 4.0: ')),
    ).toBe(true);
    expect(first.appMeta.seededBaseFoodsVersion).toBe(seedVersion);
    expect(seedVersion).toBe(4);
    await repository.seed();
    expect(await repository.read()).toEqual(first);
    expect(
      baseSeed.foods.find((food) => food.name.includes('Süßkartoffel'))
        ?.countsAsZero,
    ).toBe(false);
    expect(
      baseSeed.foods.find((food) => food.name === 'Zuckermais, roh')
        ?.countsAsZero,
    ).toBe(false);
  });
  it('seed updates preserve modified and custom foods and portions', async () => {
    await repository.seed();
    const data = await repository.read();
    data.foods[0].name = 'Meine Änderung';
    data.foods[0].isFavorite = true;
    data.foods.push(oats);
    data.portions.push(dataset().portions[0]);
    data.appMeta.seededBaseFoodsVersion = 0;
    await repository.replace(data);
    await repository.seed();
    const next = await repository.read();
    expect(next.foods.find((food) => food.id === data.foods[0].id)?.name).toBe(
      'Meine Änderung',
    );
    expect(next.foods.find((food) => food.id === oats.id)).toEqual(oats);
    expect(next.portions).toHaveLength(data.portions.length);
  });
  it('seed version 2 adds new base foods to version 1 installs without touching existing data', async () => {
    await repository.seed();
    const data = await repository.read();
    const v1 = data.foods.slice(0, 63).map((food) => food.id);
    data.foods = data.foods.filter((food) => v1.includes(food.id));
    data.portions = data.portions.filter((portion) =>
      v1.includes(portion.foodId),
    );
    data.foods[0].isFavorite = true;
    data.appMeta.seededBaseFoodsVersion = 1;
    await repository.replace(data);
    await repository.seed();
    const next = await repository.read();
    expect(next.foods).toHaveLength(baseSeed.foods.length);
    expect(next.foods.find((food) => food.id === data.foods[0].id)).toEqual(
      data.foods[0],
    );
    expect(
      next.foods.some((food) => food.name === 'Rinderhackfleisch, roh'),
    ).toBe(true);
  });
  it('seed version 3 renames untouched base foods and their diary snapshots only', async () => {
    await repository.seed();
    const data = await repository.read();
    const [pasta, potato, plain] = [
      'bls4-E401032',
      'bls4-K110132',
      'bls4-W140000',
    ].map((id) => data.foods.find((food) => food.id === id)!);
    const legacy = (id: string) => baseBlsNames.get(id)!;
    pasta.name = legacy(pasta.id);
    pasta.isFavorite = true;
    potato.name = 'Meine Kartoffeln';
    const entry = (id: string, food: typeof pasta, name: string) =>
      diary({
        id,
        foodId: food.id,
        foodSnapshot: { ...snapshotOf(food), name },
        amount: 100,
        points: foodPoints(snapshotOf(food), 100).points,
      });
    data.diaryEntries = [
      entry('old-pasta', pasta, legacy(pasta.id)),
      entry('own-pasta', pasta, 'Spaghetti von Oma'),
      entry('potato', potato, legacy(potato.id)),
      entry('salami', plain, 'Salami'),
    ];
    data.appMeta.seededBaseFoodsVersion = 2;
    await repository.replace(data);
    await repository.seed();
    const next = await repository.read();
    const byId = (id: string) => next.foods.find((food) => food.id === id);
    expect(byId(pasta.id)).toEqual({ ...pasta, name: 'Nudeln, gekocht' });
    expect(byId(potato.id)?.name).toBe('Meine Kartoffeln');
    expect(byId(plain.id)).toEqual(plain);
    expect(next.diaryEntries.map((value) => value.foodSnapshot.name)).toEqual([
      'Nudeln, gekocht',
      'Spaghetti von Oma',
      legacy(potato.id),
      'Salami',
    ]);
    expect(next.diaryEntries.map((value) => value.points)).toEqual(
      data.diaryEntries.map((value) => value.points),
    );
    expect(next.appMeta.seededBaseFoodsVersion).toBe(seedVersion);
  });
  it('seed version 4 renames installs that were stamped version 3 without the rename', async () => {
    await repository.seed();
    const data = await repository.read();
    const pasta = data.foods.find((food) => food.id === 'bls4-E401032')!;
    pasta.name = baseBlsNames.get(pasta.id)!;
    data.appMeta.seededBaseFoodsVersion = 3;
    await repository.replace(data);
    await repository.seed();
    const next = await repository.read();
    expect(next.foods.find((food) => food.id === pasta.id)?.name).toBe(
      'Nudeln, gekocht',
    );
    expect(next.appMeta.seededBaseFoodsVersion).toBe(4);
  });
  it('migrates v1 to v3 with all data intact and adds indexes and template store', async () => {
    repository.close();
    await deleteDB(name);
    const old = await openDB(name, 1, {
      upgrade(db) {
        for (const store of [
          'profile',
          'foods',
          'portions',
          'diaryEntries',
          'activityEntries',
          'weightEntries',
        ])
          db.createObjectStore(store, { keyPath: 'id' });
        db.createObjectStore('appMeta');
      },
    });
    await old.put('foods', { ...oats, defaultPortionId: null });
    await old.put(
      'appMeta',
      { schemaVersion: 1, seededBaseFoodsVersion: 0 },
      'meta',
    );
    old.close();
    const migrated = await openDatabase(name);
    expect(
      migrated.transaction('diaryEntries').store.indexNames.contains('date'),
    ).toBe(true);
    expect(migrated.objectStoreNames.contains('mealTemplates')).toBe(true);
    repository = new Repository(migrated);
    expect((await repository.read()).foods[0].name).toBe('Haferflocken');
    expect((await repository.read()).appMeta.schemaVersion).toBe(3);
    expect((await repository.read()).mealTemplates).toEqual([]);
  });
  it('migrates v2 to v3 keeping diary data and enabling templates', async () => {
    await repository.replace({ ...dataset(), diaryEntries: [diary()] });
    repository.close();
    // Recreate a genuine v2 database from the stored v3 records.
    const records = new Repository(await openDatabase(name));
    const data = await records.read();
    records.close();
    await deleteDB(name);
    const old = await openDB(name, 2, {
      upgrade(db) {
        for (const store of [
          'profile',
          'foods',
          'portions',
          'diaryEntries',
          'activityEntries',
          'weightEntries',
        ])
          db.createObjectStore(store, { keyPath: 'id' });
        db.createObjectStore('appMeta');
      },
    });
    await old.put('profile', data.profile!);
    await old.put('foods', data.foods[0]);
    await old.put('portions', data.portions[0]);
    await old.put('diaryEntries', data.diaryEntries[0]);
    await old.put(
      'appMeta',
      { schemaVersion: 2, seededBaseFoodsVersion: seedVersion },
      'meta',
    );
    old.close();
    repository = new Repository(await openDatabase(name));
    expect(await repository.read()).toEqual(data);
    await repository.replace({ ...data, mealTemplates: [template] });
    expect((await repository.read()).mealTemplates).toEqual([template]);
  });
  it('rejects stale writes from other tabs without losing data', async () => {
    const data = dataset();
    await repository.replace(data);
    const expected = await repository.read();
    await repository.replace({ ...data, profile: null });
    await expect(repository.replace(data, expected)).rejects.toThrow(
      'anderen Tab',
    );
    expect((await repository.read()).profile).toBeNull();
  });
  it('allows concurrent-safe writes with identical expected state', async () => {
    const data = dataset();
    await repository.replace(data);
    await repository.replace({ ...data, profile: null }, data);
    expect((await repository.read()).profile).toBeNull();
  });
});

describe('strict structural and semantic validation', () => {
  const mutations: [(data: Dataset) => void, string][] = [
    [
      (d) => {
        d.foods[0].per100.kcal = -1;
      },
      'negative nutrients',
    ],
    [
      (d) => {
        d.foods[0].per100.kcal = Infinity;
      },
      'nonfinite nutrients',
    ],
    [
      (d) => {
        d.foods[0].per100.satFat = null;
      },
      'false quality',
    ],
    [
      (d) => {
        d.foods.push(d.foods[0]);
      },
      'duplicate keys',
    ],
    [
      (d) => {
        d.portions[0].foodId = 'absent';
      },
      'orphan portion',
    ],
    [
      (d) => {
        d.foods[0].defaultPortionId = 'absent';
      },
      'invalid default',
    ],
    [
      (d) => {
        d.foods[0].defaultPortionId = null;
      },
      'undeclared default',
    ],
    [
      (d) => {
        d.portions = [];
      },
      'missing default portion',
    ],
    [
      (d) => {
        d.portions.push({ ...d.portions[0], id: 'second' });
      },
      'multiple defaults',
    ],
    [
      (d) => {
        d.diaryEntries = [diary({ points: 900 })];
      },
      'false diary points',
    ],
    [
      (d) => {
        d.diaryEntries = [diary({ date: '2026-02-30' })];
      },
      'invalid dates',
    ],
    [
      (d) => {
        d.weightEntries = [weight('2026-10-20', -2)];
      },
      'negative weight',
    ],
    [
      (d) => {
        d.profile!.age = NaN;
      },
      'invalid profile',
    ],
    [
      (d) => {
        d.activityEntries = [
          {
            id: 'a',
            date: '2026-10-20',
            activityType: 'Gehen',
            durationMin: 60,
            intensity: 'medium',
            activityPoints: 8,
            createdAt: stamp,
            updatedAt: stamp,
          },
        ];
      },
      'false activity points',
    ],
    [
      (d) => {
        d.mealTemplates[0].items[0].foodId = 'absent';
      },
      'template with unknown food',
    ],
    [
      (d) => {
        d.mealTemplates[0].items = [];
      },
      'empty template',
    ],
    [
      (d) => {
        d.mealTemplates[0].items[0].amount = 0;
      },
      'template without amount',
    ],
    [
      (d) => {
        d.mealTemplates.push(d.mealTemplates[0]);
      },
      'duplicate templates',
    ],
    [
      (d) => {
        d.foods[1].recipe!.ingredients[0].foodId = 'absent';
      },
      'recipe with unknown ingredient',
    ],
    [
      (d) => {
        d.foods[1].recipe!.ingredients[0].foodId = 'recipe';
      },
      'recipe containing a recipe',
    ],
    [
      (d) => {
        d.foods[1].recipe!.servings = 0;
      },
      'recipe without servings',
    ],
    [
      (d) => {
        d.foods[1].countsAsZero = true;
      },
      'zero-point recipe',
    ],
    [
      (d) => {
        d.foods[0].aliases = [' '];
      },
      'blank search term',
    ],
  ];
  it.each(mutations)('rejects %s (%s)', (mutate) => {
    const data = withRecipe(dataset());
    data.mealTemplates = [structuredClone(template)];
    mutate(data);
    expect(() => validateDataset(data)).toThrow('Ungültige Daten');
  });
  it('accepts recipes, templates and search terms', () => {
    const data = withRecipe(dataset());
    data.mealTemplates = [template];
    data.foods[0].aliases = ['Hafer'];
    expect(validateDataset(data)).toEqual(data);
  });
  it('rejects unknown top-level data and incomplete backups', () => {
    expect(() => validateDataset({ ...dataset(), unexpected: 1 })).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({ schemaVersion: 3, exportedAt: stamp, profile: null }),
      ),
    ).toThrow();
  });
  it('supports generic units without a food reference and missing default portions', () => {
    const data = dataset();
    data.foods[0].defaultPortionId = null;
    data.portions = [
      {
        id: 'g',
        foodId: 'generic',
        label: 'g',
        grams: null,
        isDefault: false,
        scope: 'generic',
      },
    ];
    expect(validateDataset(data)).toEqual(data);
  });
});
