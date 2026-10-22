import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  lookupBarcode,
  normalizeBarcode,
  parseOpenFoodFacts,
} from '../../src/data/openFoodFacts';
import { foodPoints } from '../../src/domain/points';
import { parseBackup, serializeBackup } from '../../src/data/backup';
import { openDatabase, Repository } from '../../src/data/db';
import { dataset } from '../fixtures';
import { deleteDB } from 'idb';

const barcode = '4006381333931';
function product(overrides: Record<string, unknown> = {}) {
  return {
    product: {
      product_name_de: 'Salami',
      brands: 'Testmarke',
      serving_size: '1 Scheibe (15 g)',
      serving_quantity: 15,
      serving_quantity_unit: 'g',
      product_quantity: 200,
      product_quantity_unit: 'g',
      nutriments: {
        'energy-kcal_100g': 350,
        'saturated-fat_100g': 12,
        sugars_100g: 2,
        proteins_100g: 20,
      },
      ...overrides,
    },
  };
}
const signal = () => new AbortController().signal;
afterEach(() => vi.unstubAllGlobals());

describe('barcode normalization', () => {
  it('checks EAN-8, UPC-A, EAN-13 and GTIN-14 and normalizes equivalent codes', () => {
    expect(normalizeBarcode('96385074')).toBe('96385074');
    expect(normalizeBarcode('036000291452')).toBe('0036000291452');
    expect(normalizeBarcode('0036000291452')).toBe('0036000291452');
    expect(normalizeBarcode('00036000291452')).toBe('0036000291452');
    expect(normalizeBarcode(' 4006381 333931 ')).toBe(barcode);
    expect(normalizeBarcode('10012345000017')).toBe('10012345000017');
  });
  it.each(['', '123', 'abc4006381333931', '4006381333932'])(
    'rejects invalid input %s',
    (code) => {
      expect(() => normalizeBarcode(code)).toThrow();
    },
  );
});

describe('Open Food Facts mapping', () => {
  it('maps per-100 nutrients, manufacturer portions and explicitly estimated slices', () => {
    const result = parseOpenFoodFacts(product(), barcode);
    expect(result.food).toMatchObject({
      name: 'Salami (Testmarke)',
      source: 'openfoodfacts',
      sourceRef: barcode,
      countsAsZero: false,
      basis: 'g',
      dataQuality: 'complete',
      per100: { kcal: 350, satFat: 12, sugar: 2, protein: 20 },
      defaultPortionId: result.portions[0].id,
    });
    expect(result.portions.map((p) => [p.label, p.grams])).toEqual([
      ['Herstellerportion: 1 Scheibe (15 g)', 15],
      ['Scheibe, dünn (geschätzt)', 10],
      ['Scheibe, dick (geschätzt)', 20],
      ['Ganze Packung laut Produktdaten', 200],
    ]);
    expect(result.portions.filter((p) => p.isDefault)).toHaveLength(1);
    expect(foodPoints(result.food, 30)).toEqual({
      points: 4,
      status: 'complete',
    });
  });
  it('converts kJ and preserves missing/invalid nutrients as incomplete, not complete zero values', () => {
    const result = parseOpenFoodFacts(
      product({
        nutriments: {
          'energy-kj_100g': '418.4',
          sugars_100g: '',
          proteins_100g: -1,
        },
      }),
      barcode,
    );
    expect(result.food.per100.kcal).toBeCloseTo(100);
    expect(result.food.per100).toMatchObject({
      sugar: null,
      protein: null,
      satFat: null,
    });
    expect(result.food.dataQuality).toBe('incomplete');
    expect(foodPoints(result.food, 100).status).toBe('incomplete');
    expect(
      parseOpenFoodFacts(
        product({ nutriments: { energy_100g: 418.4 } }),
        barcode,
      ).food.per100.kcal,
    ).toBeCloseTo(100);
    expect(
      parseOpenFoodFacts(
        product({ nutriments: { 'energy-kcal_100g': 0 } }),
        barcode,
      ).food.per100.kcal,
    ).toBe(0);
  });
  it.each([
    {},
    { product: {} },
    product({ product_name_de: '' }),
    product({ nutriments: {} }),
    product({ nutriments: { 'energy-kcal_100g': -5 } }),
  ])('rejects products without usable name or energy', (value) => {
    expect(() => parseOpenFoodFacts(value, barcode)).toThrow();
  });
  it('supports ml and litre amounts without converting them to grams', () => {
    const result = parseOpenFoodFacts(
      product({
        product_name_de: 'Haferdrink',
        serving_size: '1 Glas (200 ml)',
        serving_quantity: '200',
        serving_quantity_unit: 'ml',
        product_quantity: 1,
        product_quantity_unit: 'l',
      }),
      barcode,
    );
    expect(result.food.basis).toBe('ml');
    expect(result.portions.map((p) => p.grams)).toEqual([200, 15, 200, 1000]);
    expect(
      parseOpenFoodFacts(
        product({
          serving_quantity: undefined,
          serving_size: undefined,
          product_quantity_unit: 'ml',
        }),
        barcode,
      ).food.basis,
    ).toBe('ml');
  });
  it('recognizes serving units in text and kg package amounts and falls back to a marked estimate', () => {
    const result = parseOpenFoodFacts(
      product({
        serving_quantity_unit: undefined,
        product_quantity: 0.5,
        product_quantity_unit: 'kg',
      }),
      barcode,
    );
    expect(result.portions[0].grams).toBe(15);
    expect(result.portions.at(-1)?.grams).toBe(500);
    const fallback = parseOpenFoodFacts(
      product({
        product_name_de: undefined,
        product_name: 'Unbekanntes Lebensmittel',
        brands: '',
        serving_size: 'Unbekannt',
        serving_quantity: undefined,
        product_quantity_unit: 'oz',
      }),
      barcode,
    );
    expect(fallback.food.name).toBe('Unbekanntes Lebensmittel');
    expect(fallback.portions).toHaveLength(1);
    expect(fallback.portions[0]).toMatchObject({
      label: 'Portion (geschätzt)',
      grams: 100,
    });
  });
  it('extracts manufacturer portions from text when normalized serving fields are absent', () => {
    const result = parseOpenFoodFacts(
      product({
        serving_size: '1 Scheibe (12,5g)',
        serving_quantity: undefined,
        serving_quantity_unit: '',
      }),
      barcode,
    );
    expect(result.portions[0]).toMatchObject({
      label: 'Herstellerportion: 1 Scheibe (12,5g)',
      grams: 12.5,
    });
    const drink = parseOpenFoodFacts(
      product({
        serving_size: '1 Glas (0,2 L)',
        serving_quantity: undefined,
        serving_quantity_unit: undefined,
      }),
      barcode,
    );
    expect(drink.food.basis).toBe('ml');
    expect(drink.portions[0].grams).toBe(200);
  });
  it.each([
    ['Schnittkäse', 'Scheibe (geschätzt)', 25],
    ['Vollkornbrot', 'Scheibe (geschätzt)', 45],
    ['Hackfleisch', 'Handfläche (geschätzt, roh)', 100],
    ['Joghurt', 'Becher (geschätzt)', 150],
  ])('adds a matching estimate for %s', (name, label, grams) => {
    const result = parseOpenFoodFacts(
      product({ product_name_de: name }),
      barcode,
    );
    expect(result.portions).toContainEqual(
      expect.objectContaining({ label, grams }),
    );
  });
  it.each([
    'Hackfleischsoße',
    'Salami-Pizza',
    'Brotaufstrich',
    'Joghurt-Dressing',
  ])('does not apply raw ingredient or slice estimates to %s', (name) => {
    const result = parseOpenFoodFacts(
      product({
        product_name_de: name,
        serving_size: undefined,
        serving_quantity: undefined,
        product_quantity: undefined,
      }),
      barcode,
    );
    expect(result.portions).toHaveLength(1);
    expect(result.portions[0]).toMatchObject({
      label: 'Portion (geschätzt)',
      grams: 100,
    });
  });
});

describe('local-first lookup', () => {
  it('performs exactly one targeted request for an unknown product', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(product())));
    vi.stubGlobal('fetch', fetcher);
    const result = await lookupBarcode(barcode, [], [], signal());
    expect(result.cached).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain(
      `/api/v3/product/${barcode}?fields=`,
    );
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
  });
  it('persists products/portions and restores the cache from a backup without a network request', async () => {
    const name = 'off-cache-test';
    const result = parseOpenFoodFacts(product(), barcode);
    const data = dataset();
    data.foods.push(result.food);
    data.portions.push(...result.portions);
    const repository = new Repository(await openDatabase(name));
    try {
      await repository.replace(data);
    } finally {
      repository.close();
    }
    const reopened = new Repository(await openDatabase(name));
    try {
      const restored = parseBackup(
        serializeBackup(await reopened.read(), new Date()),
      );
      const fetcher = vi.fn().mockRejectedValue(new Error('offline'));
      vi.stubGlobal('fetch', fetcher);
      const cached = await lookupBarcode(
        barcode,
        restored.foods,
        restored.portions,
        signal(),
      );
      expect(cached).toEqual({ ...result, cached: true });
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      reopened.close();
      await deleteDB(name);
    }
  });
  it('uses the same cache for UPC-A and an equivalent EAN-13', async () => {
    const result = parseOpenFoodFacts(product(), '036000291452');
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect(
      (
        await lookupBarcode(
          '036000291452',
          [result.food],
          result.portions,
          signal(),
        )
      ).cached,
    ).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    [404, /nicht gefunden/],
    [429, /Minute warten/],
    [503, /503/],
  ])('reports HTTP %s explicitly', async (status, message) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status })),
    );
    await expect(lookupBarcode(barcode, [], [], signal())).rejects.toThrow(
      message,
    );
  });
  it('reports offline and invalid responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(lookupBarcode(barcode, [], [], signal())).rejects.toThrow(
      /Internetverbindung/,
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json')));
    await expect(lookupBarcode(barcode, [], [], signal())).rejects.toThrow(
      /ungültige Antwort/,
    );
  });
  it('rejects invalid codes before fetching and preserves cancellation', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    vi.stubGlobal('fetch', fetcher);
    await expect(lookupBarcode('123', [], [], signal())).rejects.toThrow(
      /Barcode/,
    );
    expect(fetcher).not.toHaveBeenCalled();
    const controller = new AbortController();
    controller.abort();
    await expect(
      lookupBarcode(barcode, [], [], controller.signal),
    ).rejects.toThrow('Cancelled');
  });
});
