import { monday, shiftDate } from './dates';
import type { DiaryEntry } from './types';

export function carryover(budget: number, consumed: number): number {
  return Math.min(4, Math.max(0, budget - consumed));
}

export function dayStatus(budget: number, consumed: number) {
  return {
    budget,
    consumed,
    remaining: Math.max(0, budget - consumed),
    extrasUsed: Math.max(0, consumed - budget),
  };
}

export function weeklyStatus(
  entries: Pick<DiaryEntry, 'date' | 'points'>[],
  dailyBudget: number,
  weeklyBudget: number,
  selectedDate: string,
  today: string,
) {
  const start = monday(selectedDate);
  let transferred = 0;
  let used = 0;
  for (let index = 0; index < 7; index++) {
    const date = shiftDate(start, index);
    const consumed = entries
      .filter((entry) => entry.date === date)
      .reduce((sum, entry) => sum + entry.points, 0);
    if (date < today) transferred += carryover(dailyBudget, consumed);
    used += dayStatus(dailyBudget, consumed).extrasUsed;
  }
  const total = weeklyBudget + transferred;
  return { start, transferred, total, used, remaining: total - used };
}
