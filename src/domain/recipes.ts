import { nutrientQuality } from './points';
import type { Dataset, Food, Nutrients, Portion, Recipe } from './types';

const keys = ['kcal', 'satFat', 'sugar', 'protein'] as const;

export function recipeWeight(recipe: Recipe): number {
  return (
    recipe.yieldGrams ??
    recipe.ingredients.reduce((sum, value) => sum + value.grams, 0)
  );
}

/**
 * Points-relevant nutrients per 100 g of the finished recipe. Zero-point
 * ingredients add weight but no nutrients, matching their 0 points as single
 * entries. A nutrient is unknown when any counted ingredient lacks it.
 */
export function recipeNutrients(
  recipe: Recipe,
  foods: readonly Food[],
): Nutrients {
  const weight = recipeWeight(recipe);
  const result: Nutrients = { kcal: 0, satFat: 0, sugar: 0, protein: 0 };
  for (const ingredient of recipe.ingredients) {
    const food = foods.find((value) => value.id === ingredient.foodId);
    if (!food) throw new Error('Rezept enthält ein unbekanntes Lebensmittel.');
    if (food.countsAsZero) continue;
    for (const key of keys) {
      const value = food.per100[key];
      const current = result[key];
      result[key] =
        value === null || current === null
          ? null
          : current + (value * ingredient.grams) / 100;
    }
  }
  for (const key of keys) {
    const value = result[key];
    result[key] =
      value === null
        ? null
        : Math.round(((value * 100) / weight) * 1000) / 1000;
  }
  return result;
}

export function recipePortions(
  foodId: string,
  recipe: Recipe,
): { portions: Portion[]; defaultPortionId: string } {
  const weight = recipeWeight(recipe);
  const serving: Portion = {
    id: `${foodId}-serving`,
    foodId,
    label: recipe.servings === 1 ? 'Portion' : `Portion (1/${recipe.servings})`,
    grams: Math.round((weight / recipe.servings) * 10) / 10,
    isDefault: true,
    scope: 'food',
  };
  const whole: Portion = {
    id: `${foodId}-whole`,
    foodId,
    label: 'Ganzes Rezept',
    grams: weight,
    isDefault: false,
    scope: 'food',
  };
  return {
    portions: recipe.servings === 1 ? [serving] : [serving, whole],
    defaultPortionId: serving.id,
  };
}

export function recipeFood(
  base: Omit<Food, 'per100' | 'dataQuality' | 'defaultPortionId' | 'recipe'>,
  recipe: Recipe,
  foods: readonly Food[],
): { food: Food; portions: Portion[] } {
  const per100 = recipeNutrients(recipe, foods);
  const { portions, defaultPortionId } = recipePortions(base.id, recipe);
  return {
    food: {
      ...base,
      per100,
      basis: 'g',
      countsAsZero: false,
      dataQuality: nutrientQuality(per100),
      defaultPortionId,
      recipe,
    },
    portions,
  };
}

/** Recalculates all recipes after ingredient changes. Recipes never contain recipes. */
export function refreshRecipes(
  foods: Food[],
  portions: Portion[],
): { foods: Food[]; portions: Portion[] } {
  let nextPortions = portions;
  const nextFoods = foods.map((food) => {
    if (!food.recipe) return food;
    const rebuilt = recipeFood(food, food.recipe, foods);
    nextPortions = [
      ...nextPortions.filter((portion) => portion.foodId !== food.id),
      ...rebuilt.portions,
    ];
    return rebuilt.food;
  });
  return { foods: nextFoods, portions: nextPortions };
}

export function recipesUsing(foodId: string, foods: readonly Food[]): Food[] {
  return foods.filter((food) =>
    food.recipe?.ingredients.some((value) => value.foodId === foodId),
  );
}

/** Removes a food with its portions; templates lose its items and empty templates are dropped. */
export function withoutFood(data: Dataset, foodId: string): Dataset {
  return {
    ...data,
    foods: data.foods.filter((value) => value.id !== foodId),
    portions: data.portions.filter((value) => value.foodId !== foodId),
    mealTemplates: data.mealTemplates.flatMap((template) => {
      const items = template.items.filter((item) => item.foodId !== foodId);
      if (!items.length) return [];
      return [
        items.length === template.items.length
          ? template
          : { ...template, items },
      ];
    }),
  };
}
