import type {
  Dataset,
  DiaryEntry,
  Food,
  Profile,
  WeightEntry,
} from '../src/domain/types';
import { foodPoints } from '../src/domain/points';
import { seedVersion } from '../src/data/seed';

export const stamp = '2026-10-20T10:00:00.000Z';
export const profile: Profile = {
  id: 'singleton',
  sex: 'male',
  breastfeeding: false,
  age: 34,
  activityLevel: 1,
  heightCm: 185,
  weightKg: 95,
  dailyBudgetOverride: null,
  weeklyBudgetOverride: null,
  weekStartsOn: 1,
  createdAt: stamp,
  updatedAt: stamp,
};
export const oats: Food = {
  id: 'oats',
  name: 'Haferflocken',
  category: 'Getreide',
  basis: 'g',
  per100: { kcal: 370, satFat: 1.3, sugar: 1, protein: 13.5 },
  countsAsZero: false,
  dataQuality: 'complete',
  source: 'custom',
  sourceRef: null,
  defaultPortionId: 'oats-portion',
  isFavorite: false,
  lastUsedAt: null,
  createdAt: stamp,
  updatedAt: stamp,
};
export function dataset(): Dataset {
  return {
    profile: { ...profile },
    foods: [structuredClone(oats)],
    portions: [
      {
        id: 'oats-portion',
        foodId: 'oats',
        label: 'Schale',
        grams: 50,
        scope: 'food',
        isDefault: true,
      },
    ],
    diaryEntries: [],
    activityEntries: [],
    weightEntries: [],
    mealTemplates: [],
    appMeta: { schemaVersion: 3, seededBaseFoodsVersion: seedVersion },
  };
}
export function diary(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  const foodSnapshot = {
    name: oats.name,
    per100: { ...oats.per100 },
    basis: oats.basis,
    countsAsZero: oats.countsAsZero,
    dataQuality: oats.dataQuality,
  };
  return {
    id: 'entry',
    date: '2026-10-20',
    meal: 'breakfast',
    foodId: oats.id,
    foodSnapshot,
    portionLabel: 'Schale',
    amount: 50,
    points: foodPoints(oats, 50).points,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}
export function weight(
  date: string,
  weightKg: number,
  createdAt = stamp,
): WeightEntry {
  return {
    id: `${date}-${createdAt}`,
    date,
    weightKg,
    createdAt,
    updatedAt: createdAt,
  };
}
