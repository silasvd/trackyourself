import { z } from 'zod';
import { nutrientQuality } from '../domain/points';
import type { Food, Portion } from '../domain/types';

const numeric = z
  .union([z.number(), z.string().trim().min(1)])
  .transform(Number);
const positive = numeric.pipe(z.number().finite().positive());
const nutrient = numeric
  .pipe(z.number().finite().nonnegative())
  .nullable()
  .catch(null);
const productSchema = z.object({
  product_name_de: z.string().optional(),
  product_name: z.string().optional(),
  brands: z.string().optional(),
  categories_tags: z.array(z.string()).optional(),
  nutrition_data_per: z.string().optional(),
  serving_size: z.string().optional(),
  serving_quantity: positive.optional().catch(undefined),
  serving_quantity_unit: z.string().optional(),
  product_quantity: positive.optional().catch(undefined),
  product_quantity_unit: z.string().optional(),
  nutriments: z.object({
    'energy-kcal_100g': nutrient,
    'energy-kj_100g': nutrient,
    energy_100g: nutrient,
    'saturated-fat_100g': nutrient,
    sugars_100g: nutrient,
    proteins_100g: nutrient,
  }),
});

export function normalizeBarcode(input: string): string {
  const code = input.replace(/\s/g, '');
  if (!/^(?:\d{8}|\d{12,14})$/.test(code)) {
    throw new Error(
      'Bitte einen EAN-/UPC-Barcode mit 8, 12, 13 oder 14 Ziffern eingeben.',
    );
  }
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce(
      (total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1),
      0,
    );
  if ((10 - (sum % 10)) % 10 !== check) {
    throw new Error(
      'Die Prüfziffer des Barcodes stimmt nicht. Bitte erneut scannen oder die Eingabe prüfen.',
    );
  }
  if (code.length === 12) return `0${code}`;
  if (code.length === 14 && code.startsWith('0')) return code.slice(1);
  return code;
}

export interface ScannedProduct {
  food: Food;
  portions: Portion[];
}

function unitAmount(value: number | undefined, unit: string | undefined) {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return null;
  if (unit === 'g' || unit === 'ml') return { amount: value, basis: unit };
  if (unit === 'kg' || unit === 'l')
    return { amount: value * 1000, basis: unit === 'kg' ? 'g' : 'ml' };
  return null;
}

export function parseOpenFoodFacts(
  value: unknown,
  barcode: string,
): ScannedProduct {
  const response = z.object({ product: productSchema }).safeParse(value);
  if (!response.success) {
    throw new Error(
      'Open Food Facts hat keine verwertbaren Produktdaten geliefert. Bitte das Lebensmittel manuell anlegen.',
    );
  }
  const product = response.data.product;
  const name = product.product_name_de?.trim() || product.product_name?.trim();
  const n = product.nutriments;
  const energyKj = n['energy-kj_100g'] ?? n.energy_100g;
  const kcal =
    n['energy-kcal_100g'] ?? (energyKj === null ? null : energyKj / 4.184);
  if (!name || kcal === null) {
    throw new Error(
      'Produktname oder Energieangabe fehlt bei Open Food Facts. Bitte das Lebensmittel manuell anlegen.',
    );
  }
  const servingText = product.serving_size?.match(
    /(\d+(?:[.,]\d+)?)\s*(kg|ml|g|l)\b/i,
  );
  const serving =
    unitAmount(
      product.serving_quantity,
      product.serving_quantity_unit?.trim().toLowerCase(),
    ) ??
    unitAmount(
      servingText ? Number(servingText[1].replace(',', '.')) : undefined,
      servingText?.[2].toLowerCase(),
    );
  const pack = unitAmount(
    product.product_quantity,
    product.product_quantity_unit?.trim().toLowerCase(),
  );
  const basis =
    product.nutrition_data_per === '100ml' ||
    serving?.basis === 'ml' ||
    (!serving && pack?.basis === 'ml')
      ? 'ml'
      : 'g';
  const code = normalizeBarcode(barcode);
  const id = `off-${code}`;
  const portions: Portion[] = [];
  function add(label: string, amount: number) {
    portions.push({
      id: `${id}-portion-${portions.length}`,
      foodId: id,
      label,
      grams: amount,
      isDefault: portions.length === 0,
      scope: 'food',
    });
  }
  if (serving?.basis === basis) {
    add(
      `Herstellerportion${product.serving_size?.trim() ? `: ${product.serving_size.trim()}` : ''}`,
      serving.amount,
    );
  }
  const tags =
    `${name} ${product.categories_tags?.join(' ') ?? ''}`.toLowerCase();
  const mixedDish =
    /pizza|sauce|soße|sosse|dressing|aufstrich|spread|sandwich|lasagn|fertiggericht|ready-meals|prepared-meals/.test(
      tags,
    );
  if (basis === 'g' && !mixedDish) {
    if (
      /salami|aufschnitt|schinken|fleischwurst|lyoner|mortadella|cold-cuts|\bhams\b/.test(
        tags,
      )
    ) {
      add('Scheibe, dünn (geschätzt)', 10);
      add('Scheibe, dick (geschätzt)', 20);
    } else if (
      /schnittkäse|scheibenkäse|gouda|edamer|sliced-cheese/.test(tags)
    ) {
      add('Scheibe (geschätzt)', 25);
    } else if (/brot|toast|bread/.test(tags)) {
      add('Scheibe (geschätzt)', 45);
    } else if (/hackfleisch|minced-meat|ground-meat/.test(tags)) {
      add('Handfläche (geschätzt, roh)', 100);
    } else if (/joghurt|yogurt|yoghurt/.test(tags)) {
      add('Becher (geschätzt)', 150);
    }
  } else if (basis === 'ml') {
    add('Esslöffel (geschätzt)', 15);
    add('Glas (geschätzt)', 200);
  }
  if (pack?.basis === basis)
    add('Ganze Packung laut Produktdaten', pack.amount);
  if (!portions.length) add('Portion (geschätzt)', 100);
  const per100 = {
    kcal,
    satFat: n['saturated-fat_100g'],
    sugar: n.sugars_100g,
    protein: n.proteins_100g,
  };
  const stamp = new Date().toISOString();
  return {
    food: {
      id,
      name: product.brands?.trim()
        ? `${name} (${product.brands.trim()})`
        : name,
      category: 'Open Food Facts',
      per100,
      basis,
      countsAsZero: false,
      dataQuality: nutrientQuality(per100),
      source: 'openfoodfacts',
      sourceRef: code,
      defaultPortionId: portions[0].id,
      isFavorite: false,
      lastUsedAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    },
    portions,
  };
}

export async function lookupBarcode(
  input: string,
  foods: Food[],
  portions: Portion[],
  signal: AbortSignal,
): Promise<ScannedProduct & { cached: boolean }> {
  const barcode = normalizeBarcode(input);
  const stored = foods.find(
    (food) => food.source === 'openfoodfacts' && food.sourceRef === barcode,
  );
  if (stored)
    return {
      food: stored,
      portions: portions.filter((portion) => portion.foodId === stored.id),
      cached: true,
    };
  const fields = [
    'product_name_de',
    'product_name',
    'brands',
    'categories_tags',
    'nutriments',
    'nutrition_data_per',
    'serving_size',
    'serving_quantity',
    'serving_quantity_unit',
    'product_quantity',
    'product_quantity_unit',
  ].join(',');
  let response: Response;
  try {
    response = await fetch(
      `https://world.openfoodfacts.org/api/v3/product/${barcode}?fields=${fields}&lc=de&app_name=TrackYourself&app_version=1.0`,
      { signal, credentials: 'omit', referrerPolicy: 'no-referrer' },
    );
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      'Open Food Facts ist nicht erreichbar. Bitte die Internetverbindung prüfen. Gespeicherte Produkte sind offline verfügbar.',
    );
  }
  if (response.status === 404)
    throw new Error(
      'Produkt bei Open Food Facts nicht gefunden. Du kannst es manuell anlegen.',
    );
  if (response.status === 429)
    throw new Error(
      'Zu viele Abfragen an Open Food Facts. Bitte eine Minute warten.',
    );
  if (!response.ok)
    throw new Error(
      `Open Food Facts meldet einen Fehler (${response.status}). Bitte später erneut versuchen.`,
    );
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error(
      'Open Food Facts hat eine ungültige Antwort geliefert. Bitte später erneut versuchen.',
    );
  }
  return { ...parseOpenFoodFacts(value, barcode), cached: false };
}
