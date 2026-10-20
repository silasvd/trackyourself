import rows from './foods.json';
import type { Food, Portion } from '../../domain/types';
import { nutrientQuality } from '../../domain/points';
import { foodSchema, portionSchema } from '../validation';

export const seedVersion = 1;
const stamp = '2026-10-20T00:00:00.000Z';
const foods: Food[] = [];
const portions: Portion[] = [];
for (const row of rows) {
  const id = `bls4-${row.code}`;
  const portionId = `${id}-default`;
  foods.push(
    foodSchema.parse({
      id,
      name: row.name,
      category: row.category,
      per100: row.per100,
      basis: 'g',
      countsAsZero: row.zero,
      source: 'base',
      sourceRef: `BLS 4.0: ${row.code}`,
      dataQuality: nutrientQuality(row.per100),
      defaultPortionId: portionId,
      isFavorite: false,
      lastUsedAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    }),
  );
  portions.push(
    portionSchema.parse({
      id: portionId,
      foodId: id,
      label: row.portion.label,
      grams: row.portion.grams,
      isDefault: true,
      scope: 'food',
    }),
  );
}
export const baseSeed = { foods, portions };
