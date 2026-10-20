import { z } from 'zod';
import type { Dataset } from '../domain/types';
import { validateDataset } from './validation';
import type { Repository } from './db';

const header = z.object({
  schemaVersion: z.literal(2),
  exportedAt: z.iso.datetime(),
});

export function serializeBackup(data: Dataset, now: Date): string {
  return JSON.stringify(
    {
      schemaVersion: 2,
      exportedAt: now.toISOString(),
      ...validateDataset(data),
    },
    null,
    2,
  );
}

export function parseBackup(text: string): Dataset {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Die Datei enthält kein gültiges JSON.');
  }
  if (!header.safeParse(value).success) {
    throw new Error(
      'Unbekannte Sicherungsversion oder ungültiger Exportzeitpunkt.',
    );
  }
  const object = z.record(z.string(), z.unknown()).parse(value);
  delete object.schemaVersion;
  delete object.exportedAt;
  return validateDataset(object);
}

export async function restoreBackup(
  repository: Repository,
  text: string,
): Promise<void> {
  await repository.replace(parseBackup(text));
}
