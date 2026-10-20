import type { Meal } from '../domain/types';

export const meals: Record<Meal, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snacks',
};
export const number = (value: number) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(value);
export const displayDate = (value: string) =>
  new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(
    new Date(`${value}T12:00:00`),
  );
export function suggestedMeal(hour: number): Meal {
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}
