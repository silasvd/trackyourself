import { describe, expect, it } from 'vitest';
import { foodPoints, nutrientQuality } from '../../src/domain/points';
import { ageBonus, budgets, heightBonus } from '../../src/domain/budget';
import { ceilPoints, roundPoints } from '../../src/domain/rounding';
import { carryover, dayStatus, weeklyStatus } from '../../src/domain/weekly';
import { activityPoints } from '../../src/domain/activity';
import { portionAmount } from '../../src/domain/portions';
import { localDate, monday, shiftDate } from '../../src/domain/dates';
import { weightHistory } from '../../src/domain/weight';
import { newId } from '../../src/app/id';
import { oats, profile, weight } from '../fixtures';

describe('P1–P11 food rules', () => {
  it.each([
    [oats.per100, 50, 6],
    [{ kcal: 884, satFat: 14, sugar: 0, protein: 0 }, 10, 4],
    [{ kcal: 67, satFat: 0.1, sugar: 4, protein: 12 }, 200, 3],
    [{ kcal: 0, satFat: 0, sugar: 0, protein: 100 }, 100, 0],
    [oats.per100, 0, 0],
  ])(
    'calculates unrounded portions before ceiling',
    (per100, amount, points) => {
      expect(foodPoints({ ...oats, per100 }, amount)).toEqual({
        points,
        status: 'complete',
      });
    },
  );
  it('zero foods bypass even missing nutrients', () => {
    expect(
      foodPoints(
        {
          ...oats,
          countsAsZero: true,
          per100: { kcal: null, satFat: null, sugar: null, protein: null },
        },
        150,
      ),
    ).toEqual({ points: 0, status: 'complete' });
  });
  it('marks missing energy unavailable', () => {
    expect(
      foodPoints({ ...oats, per100: { ...oats.per100, kcal: null } }, 100),
    ).toEqual({ points: 0, status: 'unavailable' });
  });
  it.each(['satFat', 'sugar', 'protein'] as const)(
    'marks missing %s estimated',
    (key) => {
      const food = { ...oats, per100: { ...oats.per100, [key]: null } };
      expect(nutrientQuality(food.per100)).toBe('incomplete');
      expect(foodPoints(food, 100)).toEqual({
        points: expect.any(Number),
        status: 'incomplete',
      });
    },
  );
  it('uses zero for every absent accompanying term', () => {
    expect(
      foodPoints(
        {
          ...oats,
          per100: { kcal: 100, satFat: null, sugar: null, protein: null },
        },
        100,
      ).points,
    ).toBe(4);
  });
  it.each([
    [0.1, 1],
    [3, 3],
    [3.01, 4],
    [-2, 0],
    [0, 0],
  ])('ceil %s → %s', (raw, expected) => {
    expect(ceilPoints(raw)).toBe(expected);
  });
  it('rounds commercially', () => expect(roundPoints(35.5)).toBe(36));
});

describe('B1–B10 budgets', () => {
  it('calculates weekly extras from the unrounded daily value', () => {
    expect(
      budgets({
        ...profile,
        sex: 'female',
        age: 30,
        activityLevel: 2,
        heightCm: 165,
        weightKg: 71,
      }),
    ).toEqual({ raw: 24.5, daily: 25, weekly: 34 });
  });
  it('male reference profile', () =>
    expect(budgets(profile)).toEqual({ raw: 35.5, daily: 36, weekly: 50 }));
  it('female reference profile', () =>
    expect(
      budgets({
        ...profile,
        sex: 'female',
        age: 30,
        activityLevel: 2,
        heightCm: 165,
        weightKg: 70,
      }),
    ).toEqual({ raw: 24.25, daily: 24, weekly: 34 }));
  it.each([
    [26, 4],
    [27, 3],
    [37, 3],
    [38, 2],
    [47, 2],
    [48, 1],
    [57, 1],
    [58, 0],
  ])('age %s', (age, expected) => expect(ageBonus(age)).toBe(expected));
  it.each([
    [154, 0],
    [155, 1],
    [179, 1],
    [180, 2],
  ])('height %s', (height, expected) =>
    expect(heightBonus(height)).toBe(expected),
  );
  it('adds breastfeeding contribution', () =>
    expect(budgets({ ...profile, breastfeeding: true }).raw).toBe(45.5));
  it.each([
    [45, 0],
    [49, 1],
    [40, 0],
  ])('weight %s', (weightKg, contribution) => {
    expect(budgets({ ...profile, weightKg }).raw).toBe(23 + contribution);
  });
  it.each([0, 1, 2, 3] as const)('activity %s', (activityLevel) => {
    expect(budgets({ ...profile, activityLevel }).raw).toBe(
      33.5 + activityLevel * 2,
    );
  });
  it('overrides independently, including zero', () => {
    expect(budgets({ ...profile, dailyBudgetOverride: 30 }).daily).toBe(30);
    expect(
      budgets({ ...profile, dailyBudgetOverride: 0, weeklyBudgetOverride: 0 }),
    ).toEqual({ raw: 35.5, daily: 0, weekly: 0 });
    expect(budgets({ ...profile, dailyBudgetOverride: 99 }).weekly).toBe(50);
  });
});

describe('W1–W10 weekly rules', () => {
  const today = '2026-10-22';
  const entries = [
    { date: '2026-10-19', points: 22 },
    { date: '2026-10-20', points: 24 },
    { date: '2026-10-21', points: 10 },
  ];
  it.each([
    [22, 2],
    [24, 0],
    [10, 4],
    [0, 4],
    [25, 0],
  ])('carryover consumed %s', (consumed, expected) =>
    expect(carryover(24, consumed)).toBe(expected),
  );
  it('caps by small budget', () => expect(carryover(2, 0)).toBe(2));
  it('sums completed days only', () =>
    expect(weeklyStatus(entries, 24, 34, today, today)).toMatchObject({
      total: 40,
      transferred: 6,
      used: 0,
      remaining: 40,
    }));
  it('does not credit today or future days', () => {
    expect(
      weeklyStatus([], 24, 34, '2026-10-19', '2026-10-19').transferred,
    ).toBe(0);
    expect(weeklyStatus([], 24, 34, '2026-10-26', today).total).toBe(34);
  });
  it('allocates daily budget first, then weekly extras', () => {
    expect(dayStatus(24, 30)).toEqual({
      budget: 24,
      consumed: 30,
      remaining: 0,
      extrasUsed: 6,
    });
    expect(dayStatus(24, 10)).toEqual({
      budget: 24,
      consumed: 10,
      remaining: 14,
      extrasUsed: 0,
    });
    expect(
      weeklyStatus(
        [...entries, { date: today, points: 70 }],
        24,
        34,
        today,
        today,
      ),
    ).toMatchObject({ used: 46, remaining: -6 });
  });
  it('recalculates retroactive edits', () => {
    expect(
      weeklyStatus(
        [{ date: '2026-10-19', points: 24 }, ...entries.slice(1)],
        24,
        34,
        today,
        today,
      ).total,
    ).toBe(38);
  });
  it('resets on Monday and isolates weeks', () => {
    expect(
      weeklyStatus(entries, 24, 34, '2026-10-26', '2026-10-26'),
    ).toMatchObject({ start: '2026-10-26', total: 34, used: 0 });
  });
  it('all days of past weeks completed', () =>
    expect(
      weeklyStatus([], 24, 34, '2026-10-19', '2026-11-01').transferred,
    ).toBe(28));
});

describe('A1–A5, PT1–PT2, calendar and weight', () => {
  it.each([
    [60, 'medium', 4],
    [45, 'medium', 3],
    [30, 'low', 1],
    [30, 'high', 3],
    [0, 'high', 0],
  ] as const)('activity %s %s', (duration, intensity, expected) => {
    expect(activityPoints(duration, intensity)).toBe(expected);
  });
  it('activity does not enter budget or weekly signatures', () => {
    const before = budgets(profile);
    activityPoints(120, 'high');
    expect(budgets(profile)).toEqual(before);
  });
  it('portion needs reliable weight', () => {
    const portion = {
      id: 'slice',
      foodId: 'bread',
      label: 'Scheibe',
      grams: 45,
      isDefault: true,
      scope: 'food' as const,
    };
    expect(portionAmount(portion, 2)).toBe(90);
    expect(portionAmount({ ...portion, grams: null }, 2)).toBeNull();
  });
  it('local calendar handles Sunday, Monday, year and DST boundaries', () => {
    expect(localDate(new Date(2026, 0, 2))).toBe('2026-01-02');
    expect(monday('2026-10-25')).toBe('2026-10-19');
    expect(monday('2026-10-19')).toBe('2026-10-19');
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDate('2026-03-29', -1)).toBe('2026-03-28');
  });
  it('empty and single weight histories', () => {
    expect(weightHistory([])).toMatchObject({
      daily: [],
      last: undefined,
      sinceFirst: null,
      sincePrevious: null,
    });
    expect(weightHistory([weight('2026-10-20', 80)])).toMatchObject({
      sinceFirst: 0,
      sincePrevious: null,
    });
  });
  it('sorts dates and picks latest captured value per day, not latest edited', () => {
    const history = weightHistory([
      weight('2026-10-20', 79, '2026-10-20T12:00:00.000Z'),
      weight('2026-10-01', 82),
      weight('2026-10-20', 80, '2026-10-20T09:00:00.000Z'),
      weight('2026-10-15', 81),
    ]);
    expect(history.daily.map((entry) => entry.weightKg)).toEqual([82, 81, 79]);
    expect(history.sinceFirst).toBe(-3);
    expect(history.sincePrevious).toBe(-2);
  });
  it('replaces earlier values when captured later', () => {
    expect(
      weightHistory([
        weight('2026-10-20', 80),
        weight('2026-10-20', 79, '2026-10-20T12:00:00.000Z'),
      ]).last?.weightKg,
    ).toBe(79);
  });
});

describe('ID1 ids without a secure context', () => {
  it('uses randomUUID when available and a v4 fallback otherwise', () => {
    expect(newId({ randomUUID: () => 'native' } as unknown as Crypto)).toBe(
      'native',
    );
    const insecure = {
      getRandomValues: <T extends ArrayBufferView>(array: T) => {
        new Uint8Array(array.buffer).fill(0xff);
        return array;
      },
    } as unknown as Crypto;
    expect(newId(insecure)).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    const ids = new Set(
      Array.from({ length: 50 }, () =>
        newId({
          getRandomValues: crypto.getRandomValues.bind(crypto),
        } as Crypto),
      ),
    );
    expect(ids.size).toBe(50);
    for (const id of ids)
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
  });
});
