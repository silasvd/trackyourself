export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Intensity = 'low' | 'medium' | 'high';
export interface Nutrients {
  kcal: number | null;
  satFat: number | null;
  sugar: number | null;
  protein: number | null;
}
export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}
export interface Profile extends Timestamps {
  id: 'singleton';
  sex: 'male' | 'female';
  breastfeeding: boolean;
  age: number;
  activityLevel: 0 | 1 | 2 | 3;
  heightCm: number;
  weightKg: number;
  dailyBudgetOverride: number | null;
  weeklyBudgetOverride: number | null;
  weekStartsOn: 1;
}
export interface FoodSnapshot {
  name: string;
  per100: Nutrients;
  basis: 'g' | 'ml';
  countsAsZero: boolean;
  dataQuality: 'complete' | 'incomplete';
}
export interface Food extends FoodSnapshot, Timestamps {
  id: string;
  category: string | null;
  source: 'base' | 'custom';
  sourceRef: string | null;
  defaultPortionId: string | null;
  isFavorite: boolean;
  lastUsedAt: string | null;
}
export interface Portion {
  id: string;
  foodId: string;
  label: string;
  grams: number | null;
  isDefault: boolean;
  scope: 'food' | 'generic';
}
export interface DiaryEntry extends Timestamps {
  id: string;
  date: string;
  meal: Meal;
  foodId: string;
  foodSnapshot: FoodSnapshot;
  portionLabel: string | null;
  amount: number;
  points: number;
}
export interface ActivityEntry extends Timestamps {
  id: string;
  date: string;
  activityType: string;
  durationMin: number;
  intensity: Intensity;
  activityPoints: number;
}
export interface WeightEntry extends Timestamps {
  id: string;
  date: string;
  weightKg: number;
}
export interface AppMeta {
  schemaVersion: number;
  seededBaseFoodsVersion: number;
}
export interface Dataset {
  profile: Profile | null;
  foods: Food[];
  portions: Portion[];
  diaryEntries: DiaryEntry[];
  activityEntries: ActivityEntry[];
  weightEntries: WeightEntry[];
  appMeta: AppMeta;
}
