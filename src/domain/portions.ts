import type { Portion } from './types';

export function portionAmount(portion: Portion, count: number): number | null {
  return portion.grams === null ? null : portion.grams * count;
}
