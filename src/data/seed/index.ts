import rows from './foods.json';
import type { Food, Portion } from '../../domain/types';
import { nutrientQuality } from '../../domain/points';
import { foodSchema, portionSchema } from '../validation';

// Version 1: 63 Grundnahrungsmittel. Version 2: Erweiterung auf ~200 Einträge.
// Version 3: alltagstaugliche Anzeigenamen statt technischer BLS-Bezeichnungen.
// Version 4: wiederholt die Umbenennung für Installationen, die Version 3 ohne sie erhalten haben.
export const seedVersion = 4;
const stamp = '2026-10-20T00:00:00.000Z';
const foods: Food[] = [];
const portions: Portion[] = [];
const aliases = new Map<string, readonly string[]>();
const blsNames = new Map<string, string>();
for (const row of rows) {
  const id = `bls4-${row.code}`;
  aliases.set(
    id,
    row.blsName === row.name ? row.aliases : [...row.aliases, row.blsName],
  );
  blsNames.set(id, row.blsName);
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
/** Search terms of base foods, kept outside the database so updates reach existing installs. */
export const baseAliases: ReadonlyMap<string, readonly string[]> = aliases;
/** Original BLS designations; seeds before version 3 stored these as display names. */
export const baseBlsNames: ReadonlyMap<string, string> = blsNames;
