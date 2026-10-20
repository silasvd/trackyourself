import type { WeightEntry } from './types';

export function weightHistory(entries: WeightEntry[]) {
  const byDate = new Map<string, WeightEntry>();
  for (const entry of entries) {
    const previous = byDate.get(entry.date);
    if (!previous || entry.createdAt >= previous.createdAt) {
      byDate.set(entry.date, entry);
    }
  }
  const daily = [...byDate.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const last = daily.at(-1);
  const first = daily.at(0);
  const previous = daily.at(-2);
  return {
    daily,
    last,
    sinceFirst: last && first ? last.weightKg - first.weightKg : null,
    sincePrevious: last && previous ? last.weightKg - previous.weightKg : null,
  };
}
