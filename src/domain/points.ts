import type { FoodSnapshot, Nutrients } from './types';
import { ceilPoints } from './rounding';

export function nutrientQuality(per100: Nutrients): 'complete' | 'incomplete' {
  return Object.values(per100).some((value) => value === null)
    ? 'incomplete'
    : 'complete';
}

export function foodPoints(food: FoodSnapshot, amount: number) {
  if (food.countsAsZero) return { points: 0, status: 'complete' as const };
  const { kcal, satFat, sugar, protein } = food.per100;
  if (kcal === null) return { points: 0, status: 'unavailable' as const };
  const raw =
    (kcal * 0.0305 +
      (satFat ?? 0) * 0.275 +
      (sugar ?? 0) * 0.12 -
      (protein ?? 0) * 0.098) *
    (amount / 100);
  return {
    points: ceilPoints(raw),
    status:
      food.dataQuality === 'incomplete'
        ? 'incomplete'
        : nutrientQuality(food.per100),
  };
}
