import {
  openDB,
  type DBSchema,
  type IDBPDatabase,
  type IDBPTransaction,
} from 'idb';
import type {
  ActivityEntry,
  AppMeta,
  Dataset,
  DiaryEntry,
  Food,
  MealTemplate,
  Portion,
  Profile,
  WeightEntry,
} from '../domain/types';
import { validateDataset } from './validation';
import { baseBlsNames, baseSeed, seedVersion } from './seed';

export const schemaVersion = 3;
export const databaseName = 'trackyourself';
interface TrackingDB extends DBSchema {
  profile: { key: string; value: Profile };
  foods: { key: string; value: Food; indexes: { lastUsedAt: string } };
  portions: { key: string; value: Portion };
  diaryEntries: {
    key: string;
    value: DiaryEntry;
    indexes: { date: string; meal: string };
  };
  activityEntries: {
    key: string;
    value: ActivityEntry;
    indexes: { date: string };
  };
  weightEntries: { key: string; value: WeightEntry; indexes: { date: string } };
  mealTemplates: { key: string; value: MealTemplate };
  appMeta: { key: string; value: AppMeta };
}
const stores = [
  'profile',
  'foods',
  'portions',
  'diaryEntries',
  'activityEntries',
  'weightEntries',
  'mealTemplates',
  'appMeta',
] as const;

async function readTransaction(
  tx: IDBPTransaction<TrackingDB, typeof stores, 'readonly' | 'readwrite'>,
): Promise<Dataset> {
  const [
    profile,
    foods,
    portions,
    diaryEntries,
    activityEntries,
    weightEntries,
    mealTemplates,
    appMeta,
  ] = await Promise.all([
    tx.objectStore('profile').get('singleton'),
    tx.objectStore('foods').getAll(),
    tx.objectStore('portions').getAll(),
    tx.objectStore('diaryEntries').getAll(),
    tx.objectStore('activityEntries').getAll(),
    tx.objectStore('weightEntries').getAll(),
    tx.objectStore('mealTemplates').getAll(),
    tx.objectStore('appMeta').get('meta'),
  ]);
  return validateDataset({
    profile: profile ?? null,
    foods,
    portions,
    diaryEntries,
    activityEntries,
    weightEntries,
    mealTemplates,
    appMeta: {
      schemaVersion,
      seededBaseFoodsVersion: appMeta?.seededBaseFoodsVersion ?? 0,
    },
  });
}

function fingerprint(data: Dataset): string {
  const normalized = validateDataset(data);
  for (const name of [
    'foods',
    'portions',
    'diaryEntries',
    'activityEntries',
    'weightEntries',
    'mealTemplates',
  ] as const) {
    normalized[name].sort((a, b) => a.id.localeCompare(b.id));
  }
  return JSON.stringify(normalized);
}

async function rollback(tx: { abort(): void; done: Promise<void> }) {
  try {
    tx.abort();
  } catch (error) {
    if (!(
      error instanceof DOMException && error.name === 'InvalidStateError'
    )) {
      throw error;
    }
  }
  // Observe the aborted transaction before rethrowing the original write failure.
  await Promise.allSettled([tx.done]);
}

export async function openDatabase(name = databaseName) {
  return openDB<TrackingDB>(name, schemaVersion, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      if (oldVersion < 1) {
        db.createObjectStore('profile', { keyPath: 'id' });
        db.createObjectStore('foods', { keyPath: 'id' });
        db.createObjectStore('portions', { keyPath: 'id' });
        db.createObjectStore('diaryEntries', { keyPath: 'id' });
        db.createObjectStore('activityEntries', { keyPath: 'id' });
        db.createObjectStore('weightEntries', { keyPath: 'id' });
        db.createObjectStore('appMeta');
      }
      if (oldVersion < 2) {
        transaction
          .objectStore('foods')
          .createIndex('lastUsedAt', 'lastUsedAt');
        transaction.objectStore('diaryEntries').createIndex('date', 'date');
        transaction.objectStore('diaryEntries').createIndex('meal', 'meal');
        transaction.objectStore('activityEntries').createIndex('date', 'date');
        transaction.objectStore('weightEntries').createIndex('date', 'date');
      }
      if (oldVersion < 3) {
        db.createObjectStore('mealTemplates', { keyPath: 'id' });
      }
    },
    blocked() {
      window.dispatchEvent(new CustomEvent('storage-blocked'));
    },
    blocking(_current, _blocked, event) {
      (event.target as IDBDatabase).close();
      window.dispatchEvent(new CustomEvent('storage-blocked'));
    },
  });
}

export class Repository {
  constructor(private readonly db: IDBPDatabase<TrackingDB>) {}

  async read(): Promise<Dataset> {
    const tx = this.db.transaction(stores, 'readonly');
    const data = await readTransaction(tx);
    await tx.done;
    return data;
  }

  async replace(input: Dataset, expected?: Dataset): Promise<void> {
    const data = validateDataset(input);
    const tx = this.db.transaction(stores, 'readwrite');
    try {
      if (
        expected &&
        fingerprint(await readTransaction(tx)) !== fingerprint(expected)
      ) {
        throw new Error(
          'Die Daten wurden in einem anderen Tab geändert. Bitte neu laden, bevor du weiterarbeitest.',
        );
      }
      for (const name of stores) await tx.objectStore(name).clear();
      if (data.profile) await tx.objectStore('profile').put(data.profile);
      for (const value of data.foods) await tx.objectStore('foods').put(value);
      for (const value of data.portions)
        await tx.objectStore('portions').put(value);
      for (const value of data.diaryEntries)
        await tx.objectStore('diaryEntries').put(value);
      for (const value of data.activityEntries)
        await tx.objectStore('activityEntries').put(value);
      for (const value of data.weightEntries)
        await tx.objectStore('weightEntries').put(value);
      for (const value of data.mealTemplates)
        await tx.objectStore('mealTemplates').put(value);
      await tx.objectStore('appMeta').put(data.appMeta, 'meta');
      await tx.done;
    } catch (error) {
      await rollback(tx);
      throw error;
    }
  }

  async seed(): Promise<void> {
    const tx = this.db.transaction(
      ['foods', 'portions', 'diaryEntries', 'appMeta'],
      'readwrite',
    );
    try {
      const meta = await tx.objectStore('appMeta').get('meta');
      if (meta && meta.seededBaseFoodsVersion >= seedVersion) {
        await tx.done;
        return;
      }
      const renamed = new Map<string, { from: string; to: string }>();
      for (const food of baseSeed.foods) {
        const stored = await tx.objectStore('foods').get(food.id);
        if (stored) {
          // Earlier seeds used BLS designations; user-edited names stay untouched.
          const original = baseBlsNames.get(food.id);
          if (stored.name === original && original !== food.name) {
            await tx.objectStore('foods').put({ ...stored, name: food.name });
            renamed.set(food.id, { from: original, to: food.name });
          }
        } else {
          await tx.objectStore('foods').put(food);
          for (const portion of baseSeed.portions.filter(
            (value) => value.foodId === food.id,
          )) {
            await tx.objectStore('portions').put(portion);
          }
        }
      }
      if (renamed.size) {
        for (const entry of await tx.objectStore('diaryEntries').getAll()) {
          const name = renamed.get(entry.foodId);
          if (name?.from === entry.foodSnapshot.name) {
            await tx.objectStore('diaryEntries').put({
              ...entry,
              foodSnapshot: { ...entry.foodSnapshot, name: name.to },
            });
          }
        }
      }
      await tx
        .objectStore('appMeta')
        .put({ schemaVersion, seededBaseFoodsVersion: seedVersion }, 'meta');
      await tx.done;
    } catch (error) {
      await rollback(tx);
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }
}
