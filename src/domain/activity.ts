import { roundPoints } from './rounding';
import type { Intensity } from './types';

export function activityPoints(
  durationMin: number,
  intensity: Intensity,
): number {
  return roundPoints(
    (durationMin / 60) * { low: 2, medium: 4, high: 6 }[intensity],
  );
}
