import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteDB } from 'idb';
import type { BrowserMultiFormatOneDReader } from '@zxing/browser';
import { App } from '../../src/ui/App';
import { BarcodeScan } from '../../src/ui/components/BarcodeScan';
import { databaseName, openDatabase, Repository } from '../../src/data/db';
import { foodPoints } from '../../src/domain/points';
import { dataset } from '../fixtures';

type Decode = BrowserMultiFormatOneDReader['decodeFromStream'];
const scanner = vi.hoisted(() => ({
  decode: vi.fn<Decode>(),
  stop: vi.fn(),
  trackStop: vi.fn(),
}));
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatOneDReader: class {
    decodeFromStream = scanner.decode;
  },
}));

const barcode = '4006381333931';
const response = {
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
};
beforeEach(async () => {
  const repo = new Repository(await openDatabase());
  await repo.replace(dataset());
  repo.close();
  scanner.decode.mockReset();
  scanner.stop.mockReset();
  scanner.trackStop.mockReset();
  scanner.decode.mockResolvedValue({ stop: scanner.stop });
});
afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  await deleteDB(databaseName);
});

async function stored() {
  const repo = new Repository(await openDatabase());
  try {
    return await repo.read();
  } finally {
    repo.close();
  }
}
async function openScan(viaDashboard = false) {
  mockCamera();
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Dein Tag' });
  if (viaDashboard) {
    await user.click(screen.getByRole('button', { name: 'Barcode scannen' }));
  } else {
    await user.click(
      screen.getByRole('button', { name: 'Lebensmittel hinzufügen' }),
    );
    await user.click(
      within(
        screen.getByRole('dialog', { name: 'Lebensmittel hinzufügen' }),
      ).getByRole('button', { name: 'Barcode scannen' }),
    );
  }
  return user;
}
function enterCode() {
  fireEvent.change(screen.getByLabelText('Barcode', { exact: true }), {
    target: { value: barcode },
  });
}
function mockCamera() {
  const stream = { getTracks: () => [{ stop: scanner.trackStop }] };
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal(
    'navigator',
    Object.create(navigator, {
      mediaDevices: { value: { getUserMedia }, configurable: true },
    }),
  );
  return getUserMedia;
}

describe('barcode capture', () => {
  it('imports, books slice counts using existing point logic, and scans offline after restarting', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(response)));
    vi.stubGlobal('fetch', fetcher);
    const user = await openScan();
    enterCode();
    await user.click(screen.getByRole('button', { name: 'Produkt abrufen' }));
    await screen.findByRole('heading', { name: 'Test-Salami' });
    expect(screen.getByLabelText('Einheit')).toHaveValue(
      `off-${barcode}-portion-0`,
    );
    await user.selectOptions(
      screen.getByLabelText('Einheit'),
      `off-${barcode}-portion-1`,
    );
    fireEvent.change(screen.getByLabelText('Menge'), {
      target: { value: '3' },
    });
    await user.click(screen.getByRole('button', { name: 'Eintrag speichern' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    const data = await stored();
    const imported = data.foods.find(
      (food) => food.source === 'openfoodfacts',
    )!;
    expect(data.diaryEntries[0]).toMatchObject({
      amount: 30,
      points: foodPoints(imported, 30).points,
      portionLabel: 'Scheibe, dünn (geschätzt)',
    });
    expect(data.portions.filter((p) => p.foodId === imported.id)).toHaveLength(
      3,
    );
    cleanup();
    fetcher.mockRejectedValue(new Error('offline'));
    const restarted = await openScan();
    enterCode();
    await restarted.click(
      screen.getByRole('button', { name: 'Produkt abrufen' }),
    );
    await screen.findByRole('heading', { name: 'Test-Salami' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(
      (await stored()).foods.filter((food) => food.source === 'openfoodfacts'),
    ).toHaveLength(1);
  });
  it('shows fetch failures without saving any product and permits retry', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(response)));
    vi.stubGlobal('fetch', fetcher);
    const user = await openScan();
    enterCode();
    await user.click(screen.getByRole('button', { name: 'Produkt abrufen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'nicht gefunden',
    );
    expect(
      (await stored()).foods.some((food) => food.source === 'openfoodfacts'),
    ).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Produkt abrufen' }));
    await screen.findByRole('heading', { name: 'Test-Salami' });
  });
  it('keeps the scan dialog open when local persistence fails and permits retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(new Response(JSON.stringify(response))),
        ),
    );
    const user = await openScan();
    vi.spyOn(Repository.prototype, 'replace').mockRejectedValueOnce(
      new Error('Speicher voll'),
    );
    enterCode();
    await user.click(screen.getByRole('button', { name: 'Produkt abrufen' }));
    expect(
      await within(
        screen.getByRole('dialog', { name: 'Barcode scannen' }),
      ).findByRole('alert'),
    ).toHaveTextContent('Speicher voll');
    expect(
      screen.getByRole('dialog', { name: 'Barcode scannen' }),
    ).toBeVisible();
    expect(
      (await stored()).foods.some((food) => food.source === 'openfoodfacts'),
    ).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Produkt abrufen' }));
    await screen.findByRole('heading', { name: 'Test-Salami' });
  });
  it('cancels requests when the scan dialog is closed', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Cancelled', 'AbortError')),
          );
        }),
    );
    vi.stubGlobal('fetch', fetcher);
    const view = render(
      <BarcodeScan
        data={dataset()}
        save={vi.fn()}
        busy={false}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    enterCode();
    fireEvent.click(screen.getByRole('button', { name: 'Produkt abrufen' }));
    const signal = fetcher.mock.calls[0][1]?.signal;
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
  it('times out stalled requests and shows an explicit retry message', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockImplementation(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Cancelled', 'AbortError')),
            );
          }),
      ),
    );
    render(
      <BarcodeScan
        data={dataset()}
        save={vi.fn()}
        busy={false}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    enterCode();
    fireEvent.click(screen.getByRole('button', { name: 'Produkt abrufen' }));
    const { act } = await import('@testing-library/react');
    await act(() => vi.advanceTimersByTimeAsync(15000));
    expect(screen.getByRole('alert')).toHaveTextContent('dauert zu lange');
    expect(
      screen.getByRole('button', { name: 'Produkt abrufen' }),
    ).toBeEnabled();
  });
});

describe('scan entry points', () => {
  it('starts the camera immediately from the dashboard scan button', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(response))),
    );
    await openScan(true);
    expect(
      screen.getByRole('dialog', { name: 'Barcode scannen' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(scanner.decode).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole('button', { name: 'Kamera stoppen' }),
    ).toBeInTheDocument();
  });
  it('starts the camera immediately from the search field icon', async () => {
    await openScan();
    await waitFor(() => expect(scanner.decode).toHaveBeenCalledTimes(1));
  });
  it('offers another scan after a scanned product was opened', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(response))),
    );
    const user = await openScan();
    enterCode();
    await user.click(screen.getByRole('button', { name: 'Produkt abrufen' }));
    await screen.findByRole('heading', { name: 'Test-Salami' });
    await user.click(
      screen.getByRole('button', { name: 'Weiteren Barcode scannen' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Barcode scannen' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(scanner.decode).toHaveBeenCalledTimes(2));
  });
  it('offers to scan again after a failed lookup', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 404 })),
    );
    const user = await openScan();
    enterCode();
    await user.click(screen.getByRole('button', { name: 'Produkt abrufen' }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Erneut scannen' }));
    await waitFor(() => expect(scanner.decode).toHaveBeenCalledTimes(2));
  });
});

describe('recipe and version', () => {
  it('adds a scanned product as a recipe ingredient', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(response))),
    );
    mockCamera();
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Dein Tag' });
    await user.click(
      screen.getByRole('button', { name: 'Lebensmittel hinzufügen' }),
    );
    await user.click(screen.getByRole('button', { name: 'Rezept anlegen' }));
    await user.click(
      screen.getByRole('button', { name: 'Zutat per Barcode scannen' }),
    );
    await waitFor(() => expect(scanner.decode).toHaveBeenCalled());
    enterCode();
    await user.click(screen.getByRole('button', { name: 'Produkt abrufen' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Barcode scannen' }),
      ).not.toBeInTheDocument(),
    );
    expect(await screen.findByLabelText('Test-Salami: Menge (g)')).toHaveValue(
      15,
    );
  });
  it('shows version and build time at the bottom of the profile', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Dein Tag' });
    await user.click(
      screen.getByRole('button', { name: 'Profil/Einstellungen' }),
    );
    expect(await screen.findByText(/^Version \d+\.\d+\.\d+/)).toBeVisible();
  });
});

describe('camera lifecycle', () => {
  it('uses the rear camera, detects a barcode and stops its own stream', async () => {
    const getUserMedia = mockCamera();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(response))),
    );
    const onSaved = vi.fn();
    render(
      <BarcodeScan
        data={dataset()}
        save={vi.fn().mockResolvedValue(true)}
        busy={false}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );
    await waitFor(() => expect(scanner.decode).toHaveBeenCalledTimes(1));
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    const callback = scanner.decode.mock.calls[0][2];
    const { act } = await import('@testing-library/react');
    await act(async () => {
      const result = { getText: () => barcode };
      callback(result as Parameters<typeof callback>[0], undefined, {
        stop: scanner.stop,
      });
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(scanner.trackStop).toHaveBeenCalled();
    expect(scanner.stop).toHaveBeenCalled();
  });
  it('stops the stream when the user stops the camera', async () => {
    mockCamera();
    render(
      <BarcodeScan
        data={dataset()}
        save={vi.fn()}
        busy={false}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await waitFor(() => expect(scanner.decode).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Kamera stoppen' }));
    expect(scanner.stop).toHaveBeenCalled();
    expect(scanner.trackStop).toHaveBeenCalled();
  });
  it('releases a camera permission result received after unmounting', async () => {
    const getUserMedia = mockCamera();
    type Stream = { getTracks: () => { stop: () => void }[] };
    let resolve: (stream: Stream) => void = () => {};
    getUserMedia.mockReturnValue(
      new Promise<Stream>((done) => {
        resolve = done;
      }),
    );
    const view = render(
      <BarcodeScan
        data={dataset()}
        save={vi.fn()}
        busy={false}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
    view.unmount();
    resolve({ getTracks: () => [{ stop: scanner.trackStop }] });
    await waitFor(() => expect(scanner.trackStop).toHaveBeenCalledTimes(1));
    expect(scanner.decode).not.toHaveBeenCalled();
  });
  it('shows denied permissions and leaves manual entry available', async () => {
    mockCamera().mockRejectedValue(
      new DOMException('Permission denied', 'NotAllowedError'),
    );
    render(
      <BarcodeScan
        data={dataset()}
        save={vi.fn()}
        busy={false}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Permission denied',
    );
    expect(screen.getByLabelText('Barcode', { exact: true })).toBeEnabled();
  });
});
