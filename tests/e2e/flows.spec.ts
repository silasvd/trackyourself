import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 22, 12));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dein Tag' })).toBeVisible();
});

async function profile(page: Page) {
  await page.getByRole('button', { name: 'Profil/Einstellungen' }).click();
  await page
    .getByRole('combobox', { name: 'Geschlecht', exact: true })
    .selectOption('female');
  await page.getByLabel('Alter (Jahre)', { exact: true }).fill('30');
  await page.getByLabel('Größe (cm)', { exact: true }).fill('165');
  await page.getByLabel('Gewicht fürs Budget (kg)', { exact: true }).fill('70');
  await page
    .getByRole('combobox', { name: 'Aktivitätsniveau', exact: true })
    .selectOption('2');
  await page.getByRole('button', { name: 'Profil speichern' }).click();
  await expect(page.getByText('Profil gespeichert.')).toBeVisible();
  await page.getByRole('button', { name: 'Tag', exact: true }).click();
}
async function addOats(page: Page) {
  await page.getByRole('button', { name: '+ Hinzufügen' }).click();
  await page
    .getByRole('button', { name: 'Hafer Flocken auswählen', exact: true })
    .click();
  await page.getByRole('button', { name: 'Eintrag speichern' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('E1 profile → three-interaction capture → persistent dashboard', async ({
  page,
}) => {
  await profile(page);
  const summary = page.getByRole('region', { name: 'Tagespunkte' });
  await expect(summary).toContainText('24');
  await addOats(page);
  await expect(summary).toHaveText(
    'Verbleibend19TagespunkteTagesbudget24Verbraucht5',
  );
  await expect(
    page.getByRole('button', { name: 'Hafer Flocken bearbeiten' }),
  ).toBeVisible();
  const weekly = await page
    .getByRole('region', { name: 'Wochenextras' })
    .boundingBox();
  expect(weekly!.y + weekly!.height).toBeLessThan(
    page.viewportSize()!.height - 70,
  );
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Hafer Flocken bearbeiten' }),
  ).toBeVisible();
});

test('E2 edit and delete → correct day and week totals', async ({ page }) => {
  await profile(page);
  await addOats(page);
  await page.getByRole('button', { name: 'Hafer Flocken bearbeiten' }).click();
  await page.getByLabel('Menge', { exact: true }).fill('1000');
  await page.getByRole('button', { name: 'Eintrag speichern' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Tagespunkte' })).toContainText(
    '74 Punkte aus Wochenextras verbraucht.',
  );
  await expect(
    page.getByRole('region', { name: 'Wochenextras' }),
  ).toContainText('Gesamt46Verbraucht74Verbleibend-28');
  await page.getByRole('button', { name: 'Hafer Flocken bearbeiten' }).click();
  await page.getByRole('button', { name: 'Eintrag löschen' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(/Noch keine Einträge am/)).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Tagespunkte' }),
  ).not.toContainText('Punkte aus Wochenextras verbraucht.');
  await expect(
    page.getByRole('region', { name: 'Wochenextras' }),
  ).toContainText('Gesamt46Verbraucht0Verbleibend46');
});

test('E3 retroactive entry recalculates weekly carryover', async ({ page }) => {
  await profile(page);
  const extras = page.getByRole('region', { name: 'Wochenextras' });
  await expect(extras).toContainText('Davon 12 übertragene Tagesreste');
  await page.getByLabel('Tag auswählen').fill('2026-10-19');
  await page.getByRole('button', { name: '+ Hinzufügen' }).click();
  await page
    .getByRole('button', { name: 'Hafer Flocken auswählen', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'Einheit', exact: true })
    .selectOption('');
  await page.getByLabel('Menge', { exact: true }).fill('210');
  await page.getByRole('button', { name: 'Eintrag speichern' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(extras).toContainText('Davon 11 übertragene Tagesreste');
  await page.getByRole('button', { name: 'Hafer Flocken bearbeiten' }).click();
  await page.getByRole('button', { name: 'Eintrag löschen' }).click();
  await expect(extras).toContainText('Davon 12 übertragene Tagesreste');
  await page.getByRole('button', { name: 'Heute', exact: true }).click();
  await expect(page.getByLabel('Tag auswählen')).toHaveValue('2026-10-22');
});

test('E4 PWA starts, saves and reloads fully offline', async ({
  page,
  context,
}) => {
  await profile(page);
  await addOats(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => resolve(),
          { once: true },
        ),
      );
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Hafer Flocken bearbeiten' }),
  ).toBeVisible();
  await addOats(page);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Hafer Flocken bearbeiten' }),
  ).toHaveCount(2);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('E5 full export → clear local data → import identical state', async ({
  page,
}) => {
  await profile(page);
  await addOats(page);
  await page.getByRole('button', { name: 'Gewicht', exact: true }).click();
  await page.getByLabel('Gewicht (kg)', { exact: true }).fill('79.5');
  await page.getByRole('button', { name: 'Gewicht speichern' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button', { name: 'Aktivität', exact: true }).click();
  await page.getByLabel('Aktivität', { exact: true }).fill('Gehen');
  await page.getByRole('button', { name: 'Aktivität speichern' }).click();
  await expect(
    page.getByRole('button', { name: 'Gehen bearbeiten' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Profil/Einstellungen' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Daten exportieren' }).click();
  const download = await downloadPromise;
  const buffer = await readFile((await download.path())!);
  const original = JSON.parse(buffer.toString());
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('trackyourself', 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(
          [...db.objectStoreNames],
          'readwrite',
        );
        for (const name of db.objectStoreNames)
          transaction.objectStore(name).clear();
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      };
    });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Profil/Einstellungen' }).click();
  await page.getByLabel('Daten importieren').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer,
  });
  await expect(page.getByRole('dialog')).toHaveAccessibleName(
    'Sicherung wiederherstellen',
  );
  await page.getByRole('button', { name: 'Daten ersetzen' }).click();
  await expect(
    page.getByText('Sicherung vollständig wiederhergestellt.'),
  ).toBeVisible();
  const secondDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Daten exportieren' }).click();
  const second = JSON.parse(
    await readFile((await (await secondDownload).path())!, 'utf8'),
  );
  expect(second).toEqual(original);
});

test('E6 weight history and activity do not change nutrition budget', async ({
  page,
}) => {
  await profile(page);
  await page.getByRole('button', { name: 'Gewicht', exact: true }).click();
  await page.getByLabel('Datum', { exact: true }).fill('2026-10-01');
  await page.getByLabel('Gewicht (kg)', { exact: true }).fill('82');
  await page.getByRole('button', { name: 'Gewicht speichern' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByLabel('Datum', { exact: true }).fill('2026-10-20');
  await page.getByLabel('Gewicht (kg)', { exact: true }).fill('79');
  await page.getByRole('button', { name: 'Gewicht speichern' }).click();
  await expect(page.getByText('-3 kg')).toHaveCount(2);
  await expect(
    page.getByRole('img', { name: /Gewichtsdiagramm/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Aktivität', exact: true }).click();
  await page.getByLabel('Aktivität', { exact: true }).fill('Radfahren');
  await page.getByLabel('Dauer (Minuten)', { exact: true }).fill('60');
  await page.getByRole('button', { name: 'Aktivität speichern' }).click();
  await expect(
    page.getByRole('button', { name: 'Radfahren bearbeiten' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tag', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Tagespunkte' })).toHaveText(
    'Verbleibend24TagespunkteTagesbudget24Verbraucht0',
  );
  await expect(
    page.getByRole('button', { name: /4 Aktivitätspunkte/ }),
  ).toBeVisible();
});

test('keyboard capture and responsive layout have no horizontal overflow', async ({
  page,
}) => {
  await profile(page);
  await page.getByRole('button', { name: '+ Hinzufügen' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Lebensmittel suchen')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
