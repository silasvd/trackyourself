import { z } from 'zod';
import { refreshDatasetRecipes } from '../domain/recipes';
import type { Dataset } from '../domain/types';
import { validateDataset } from './validation';
import type { Repository } from './db';

const header = z.object({
  schemaVersion: z.union([z.literal(2), z.literal(3)]),
  exportedAt: z.iso.datetime(),
});

export function serializeBackup(data: Dataset, now: Date): string {
  return JSON.stringify(
    {
      schemaVersion: 3,
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
  const parsed = header.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      'Unbekannte Sicherungsversion oder ungültiger Exportzeitpunkt.',
    );
  }
  const object = z.record(z.string(), z.unknown()).parse(value);
  delete object.schemaVersion;
  delete object.exportedAt;
  if (parsed.data.schemaVersion === 2) migrateV2(object);
  return validateDataset(refreshDatasetRecipes(validateDataset(object)));
}

// Version 2 backups predate meal templates; everything else is unchanged.
function migrateV2(object: Record<string, unknown>): void {
  object.mealTemplates ??= [];
  const meta = z.record(z.string(), z.unknown()).safeParse(object.appMeta);
  if (meta.success && meta.data.schemaVersion === 2) {
    object.appMeta = { ...meta.data, schemaVersion: 3 };
  }
}

export async function restoreBackup(
  repository: Repository,
  text: string,
): Promise<void> {
  await repository.replace(parseBackup(text));
}
