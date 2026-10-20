import { deleteDB, openDB } from 'idb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Repository, openDatabase } from '../../src/data/db';
import {
  parseBackup,
  restoreBackup,
  serializeBackup,
} from '../../src/data/backup';
import { validateDataset } from '../../src/data/validation';
import { baseSeed } from '../../src/data/seed';
import { dataset, diary, oats, stamp, weight } from '../fixtures';
import type { Dataset } from '../../src/domain/types';

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
    const data = dataset();
    data.diaryEntries = [diary()];
    await repository.replace(data);
    const json = serializeBackup(await repository.read(), new Date(stamp));
    expect(parseBackup(json)).toEqual(data);
    await repository.replace({
      ...data,
      foods: [],
      portions: [],
      diaryEntries: [],
      profile: null,
    });
    await restoreBackup(repository, json);
    expect(await repository.read()).toEqual(data);
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
  it('seeds once without duplicates, validates 50–80 source-backed foods', async () => {
    await repository.seed();
    const first = await repository.read();
    expect(first.foods.length).toBeGreaterThanOrEqual(50);
    expect(first.foods.length).toBeLessThanOrEqual(80);
    expect(
      first.foods.every((food) => food.sourceRef?.startsWith('BLS 4.0: ')),
    ).toBe(true);
    expect(first.appMeta.seededBaseFoodsVersion).toBe(1);
    await repository.seed();
    expect(await repository.read()).toEqual(first);
    expect(
      baseSeed.foods.find((food) => food.name.includes('Süßkartoffel'))
        ?.countsAsZero,
    ).toBe(false);
    expect(
      baseSeed.foods.find((food) => food.name === 'Zuckermais roh')
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
  it('migrates v1 to v2 with all data intact and adds indexes', async () => {
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
    repository = new Repository(migrated);
    expect((await repository.read()).foods[0].name).toBe('Haferflocken');
    expect((await repository.read()).appMeta.schemaVersion).toBe(2);
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
        d.foods[0].dataQuality = 'incomplete';
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
  ];
  it.each(mutations)('rejects %s (%s)', (mutate) => {
    const data = dataset();
    mutate(data);
    expect(() => validateDataset(data)).toThrow('Ungültige Daten');
  });
  it('rejects unknown top-level data and incomplete backups', () => {
    expect(() => validateDataset({ ...dataset(), unexpected: 1 })).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({ schemaVersion: 2, exportedAt: stamp, profile: null }),
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
