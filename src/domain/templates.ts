import { foodPoints } from './points';
import type {
  DiaryEntry,
  Food,
  FoodSnapshot,
  Meal,
  MealTemplate,
  MealTemplateItem,
} from './types';

export function snapshotOf(food: FoodSnapshot): FoodSnapshot {
  return {
    name: food.name,
    per100: { ...food.per100 },
    basis: food.basis,
    countsAsZero: food.countsAsZero,
    dataQuality: food.dataQuality,
  };
}

export function diaryEntry(
  food: Food,
  values: {
    id: string;
    date: string;
    meal: Meal;
    amount: number;
    portionLabel: string | null;
    stamp: string;
  },
): DiaryEntry {
  return {
    id: values.id,
    date: values.date,
    meal: values.meal,
    foodId: food.id,
    foodSnapshot: snapshotOf(food),
    amount: values.amount,
    portionLabel: values.portionLabel,
    points: foodPoints(food, values.amount).points,
    createdAt: values.stamp,
    updatedAt: values.stamp,
  };
}

/** Builds a template from diary entries; entries of deleted foods are skipped. */
export function templateFromEntries(
  values: { id: string; name: string; meal: Meal; stamp: string },
  entries: readonly DiaryEntry[],
  foods: readonly Food[],
): MealTemplate {
  return {
    id: values.id,
    name: values.name.trim(),
    meal: values.meal,
    items: entries
      .filter((entry) => foods.some((food) => food.id === entry.foodId))
      .map((entry) => ({
        foodId: entry.foodId,
        amount: entry.amount,
        portionLabel: entry.portionLabel,
      })),
    createdAt: values.stamp,
    updatedAt: values.stamp,
  };
}

/** Creates diary entries from template items using the current food data. */
export function entriesFromItems(
  items: readonly MealTemplateItem[],
  foods: readonly Food[],
  values: { date: string; meal: Meal; stamp: string; id: () => string },
): DiaryEntry[] {
  return items.flatMap((item) => {
    const food = foods.find((value) => value.id === item.foodId);
    return food
      ? [
          diaryEntry(food, {
            id: values.id(),
            date: values.date,
            meal: values.meal,
            amount: item.amount,
            portionLabel: item.portionLabel,
            stamp: values.stamp,
          }),
        ]
      : [];
  });
}

/** Copies entries unchanged (including their snapshot) to another day. */
export function copyEntries(
  entries: readonly DiaryEntry[],
  values: { date: string; stamp: string; id: () => string },
): DiaryEntry[] {
  return entries.map((entry) => ({
    ...entry,
    id: values.id(),
    date: values.date,
    foodSnapshot: snapshotOf(entry.foodSnapshot),
    createdAt: values.stamp,
    updatedAt: values.stamp,
  }));
}

export function lastEntryFor(
  foodId: string,
  entries: readonly DiaryEntry[],
): DiaryEntry | undefined {
  return entries
    .filter((entry) => entry.foodId === foodId)
    .reduce<DiaryEntry | undefined>(
      (latest, entry) =>
        !latest || entry.updatedAt > latest.updatedAt ? entry : latest,
      undefined,
    );
}

export function markUsed(
  foods: readonly Food[],
  ids: readonly string[],
  stamp: string,
): Food[] {
  return foods.map((food) =>
    ids.includes(food.id) ? { ...food, lastUsedAt: stamp } : food,
  );
}

/** Current points of a template computed from today's food values; missing foods count 0. */
export function templatePoints(
  template: MealTemplate,
  foods: readonly Food[],
): number {
  return template.items.reduce((sum, item) => {
    const food = foods.find((value) => value.id === item.foodId);
    return sum + (food ? foodPoints(food, item.amount).points : 0);
  }, 0);
}
