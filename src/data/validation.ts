import { z } from 'zod';
import { activityPoints } from '../domain/activity';
import { foodPoints, nutrientQuality } from '../domain/points';
import type { Dataset } from '../domain/types';

const nonnegative = z.number().finite().nonnegative();
const whole = nonnegative.int();
const key = z.string().min(1);
const timestamp = z.iso.datetime();
const timestamps = { createdAt: timestamp, updatedAt: timestamp };
const date = z.iso.date();
const nutrients = z.strictObject({
  kcal: nonnegative.nullable(),
  satFat: nonnegative.nullable(),
  sugar: nonnegative.nullable(),
  protein: nonnegative.nullable(),
});
const snapshot = z
  .strictObject({
    name: z.string().trim().min(1),
    per100: nutrients,
    basis: z.enum(['g', 'ml']),
    countsAsZero: z.boolean(),
    dataQuality: z.enum(['complete', 'incomplete']),
  })
  .refine((value) => value.dataQuality === nutrientQuality(value.per100), {
    message: 'Nährwertqualität stimmt nicht mit den Daten überein.',
  });

export const profileSchema = z.strictObject({
  id: z.literal('singleton'),
  sex: z.enum(['male', 'female']),
  breastfeeding: z.boolean(),
  age: nonnegative.int(),
  activityLevel: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
  heightCm: z.number().finite().positive(),
  weightKg: z.number().finite().positive(),
  dailyBudgetOverride: whole.nullable(),
  weeklyBudgetOverride: whole.nullable(),
  weekStartsOn: z.literal(1),
  ...timestamps,
});
export const foodSchema = snapshot.safeExtend({
  id: key,
  category: z.string().nullable(),
  source: z.enum(['base', 'custom']),
  sourceRef: z.string().nullable(),
  defaultPortionId: key.nullable(),
  isFavorite: z.boolean(),
  lastUsedAt: timestamp.nullable(),
  ...timestamps,
});
export const portionSchema = z.strictObject({
  id: key,
  foodId: key,
  label: z.string().trim().min(1),
  grams: z.number().finite().positive().nullable(),
  isDefault: z.boolean(),
  scope: z.enum(['food', 'generic']),
});
export const diarySchema = z
  .strictObject({
    id: key,
    date,
    meal: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
    foodId: key,
    foodSnapshot: snapshot,
    portionLabel: z.string().nullable(),
    amount: nonnegative,
    points: whole,
    ...timestamps,
  })
  .refine(
    (entry) =>
      entry.points === foodPoints(entry.foodSnapshot, entry.amount).points,
    {
      message: 'Eintrag enthält inkonsistente Punkte.',
    },
  );
export const activitySchema = z
  .strictObject({
    id: key,
    date,
    activityType: z.string().trim().min(1),
    durationMin: z.number().finite().positive(),
    intensity: z.enum(['low', 'medium', 'high']),
    activityPoints: whole,
    ...timestamps,
  })
  .refine(
    (entry) =>
      entry.activityPoints ===
      activityPoints(entry.durationMin, entry.intensity),
    {
      message: 'Aktivität enthält inkonsistente Punkte.',
    },
  );
export const weightSchema = z.strictObject({
  id: key,
  date,
  weightKg: z.number().finite().positive(),
  ...timestamps,
});
export const metaSchema = z.strictObject({
  schemaVersion: z.literal(2),
  seededBaseFoodsVersion: whole,
});
export const datasetSchema = z
  .strictObject({
    profile: profileSchema.nullable(),
    foods: z.array(foodSchema),
    portions: z.array(portionSchema),
    diaryEntries: z.array(diarySchema),
    activityEntries: z.array(activitySchema),
    weightEntries: z.array(weightSchema),
    appMeta: metaSchema,
  })
  .superRefine((data, ctx) => {
    for (const collection of [
      data.foods,
      data.portions,
      data.diaryEntries,
      data.activityEntries,
      data.weightEntries,
    ]) {
      if (
        new Set(collection.map((value) => value.id)).size !== collection.length
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'Doppelte Datensatzschlüssel.',
        });
      }
    }
    for (const portion of data.portions) {
      if (
        portion.scope === 'food' &&
        !data.foods.some((food) => food.id === portion.foodId)
      ) {
        ctx.addIssue({ code: 'custom', message: 'Portion ohne Lebensmittel.' });
      }
    }
    for (const food of data.foods) {
      const defaults = data.portions.filter(
        (portion) => portion.foodId === food.id && portion.isDefault,
      );
      if (
        (food.defaultPortionId === null && defaults.length !== 0) ||
        (food.defaultPortionId !== null &&
          (defaults.length !== 1 || defaults[0].id !== food.defaultPortionId))
      ) {
        ctx.addIssue({ code: 'custom', message: 'Ungültige Standardportion.' });
      }
    }
  });

export function validateDataset(value: unknown): Dataset {
  const result = datasetSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `Ungültige Daten: ${result.error.issues.map((issue) => issue.message).join(' ')}`,
    );
  }
  return result.data;
}
