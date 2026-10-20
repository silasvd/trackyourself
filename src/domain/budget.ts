import type { Profile } from './types';
import { roundPoints } from './rounding';

export function ageBonus(age: number): number {
  if (age < 27) return 4;
  if (age < 38) return 3;
  if (age < 48) return 2;
  if (age < 58) return 1;
  return 0;
}

export function heightBonus(height: number): number {
  if (height < 155) return 0;
  if (height <= 179) return 1;
  return 2;
}

export function budgets(profile: Profile) {
  const raw =
    (profile.sex === 'male' ? 8 : 2) +
    (profile.breastfeeding ? 10 : 0) +
    ageBonus(profile.age) +
    profile.activityLevel * 2 +
    heightBonus(profile.heightCm) +
    8 +
    Math.max(0, (profile.weightKg - 45) / 4);
  return {
    raw,
    daily: profile.dailyBudgetOverride ?? roundPoints(raw),
    weekly: profile.weeklyBudgetOverride ?? roundPoints(raw * 1.4),
  };
}
