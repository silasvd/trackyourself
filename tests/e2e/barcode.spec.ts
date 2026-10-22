import { expect, test } from '@playwright/test';

test('barcode camera decoding, slice points and persistent offline cache', async ({
  page,
  context,
}) => {
  const barcode = '4006381333931';
  await page.addInitScript((code) => {
    // Feed a synthetic EAN-13 through the real video decoder, including empty frames.
    const left = [
      '0001101',
      '0011001',
      '0010011',
      '0111101',
      '0100011',
      '0110001',
      '0101111',
      '0111011',
      '0110111',
      '0001011',
    ];
    const even = [
      '0100111',
      '0110011',
      '0011011',
      '0100001',
      '0011101',
      '0111001',
      '0000101',
      '0010001',
      '0001001',
      '0010111',
    ];
    const parity = [
      'LLLLLL',
      'LLGLGG',
      'LLGGLG',
      'LLGGGL',
      'LGLLGG',
      'LGGLLG',
      'LGGGLL',
      'LGLGLG',
      'LGLGGL',
      'LGGLGL',
    ][Number(code[0])];
    const bits =
      '101' +
      [...code.slice(1, 7)]
        .map((digit, i) => (parity[i] === 'L' ? left : even)[Number(digit)])
        .join('') +
      '01010' +
      [...code.slice(7)]
        .map((digit) =>
          [...left[Number(digit)]]
            .map((bit) => (bit === '0' ? '1' : '0'))
            .join(''),
        )
        .join('') +
      '101';
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d')!;
        let frames = 0;
        const draw = () => {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, 640, 360);
          if (frames++ < 20) return;
          ctx.fillStyle = 'black';
          [...bits].forEach((bit, i) => {
            if (bit === '1') ctx.fillRect(130 + i * 4, 80, 4, 200);
          });
        };
        draw();
        const stream = canvas.captureStream(20);
        const interval = setInterval(draw, 50);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => {
          clearInterval(interval);
          document.documentElement.dataset.cameraStopped = 'true';
          stop();
        };
        return stream;
      },
    });
  }, barcode);
  let requests = 0;
  await page.route(
    'https://world.openfoodfacts.org/api/v3/product/**',
    async (route) => {
      requests++;
      await route.fulfill({
        json: {
          product: {
            product_name: 'Test-Salami',
            serving_size: '1 Scheibe (15 g)',
            serving_quantity: 15,
            serving_quantity_unit: 'g',
            nutriments: {
              'energy-kcal_100g': 350,
              'saturated-fat_100g': 12,
              sugars_100g: 2,
              proteins_100g: 20,
            },
          },
        },
      });
    },
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Barcode scannen' }).click();
  await expect(
    page.getByRole('heading', { name: 'Test-Salami', exact: true }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute(
    'data-camera-stopped',
    'true',
  );
  expect(requests).toBe(1);
  await page
    .getByRole('combobox', { name: 'Einheit', exact: true })
    .selectOption(`off-${barcode}-portion-1`);
  await page.getByLabel('Menge', { exact: true }).fill('3');
  await expect(page.locator('output')).toContainText('30 g');
  await expect(page.locator('output')).toContainText('4 Punkte');
  await page.getByRole('button', { name: 'Eintrag speichern' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
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
  await page.getByRole('button', { name: 'Lebensmittel hinzufügen' }).click();
  await page
    .getByRole('dialog', { name: 'Lebensmittel hinzufügen' })
    .getByRole('button', { name: 'Barcode scannen' })
    .click();
  await page.getByLabel('Barcode', { exact: true }).fill(barcode);
  await page.getByRole('button', { name: 'Produkt abrufen' }).click();
  await expect(
    page.getByRole('heading', { name: 'Test-Salami', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('combobox', { name: 'Einheit', exact: true }),
  ).toHaveValue(`off-${barcode}-portion-1`);
  await expect(page.getByLabel('Menge', { exact: true })).toHaveValue('3');
  expect(requests).toBe(1);
});
