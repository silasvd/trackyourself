import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deleteDB } from 'idb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/App';
import { databaseName, openDatabase, Repository } from '../../src/data/db';
import { DaySummary } from '../../src/ui/components/DaySummary';
import { EntryForm, PointLabel } from '../../src/ui/components/EntryForm';
import { WeightChart } from '../../src/ui/components/WeightChart';
import { dataset, diary, oats, stamp, weight } from '../fixtures';
import { serializeBackup } from '../../src/data/backup';
import type { Dataset } from '../../src/domain/types';

beforeEach(async () => {
  const repository = new Repository(await openDatabase());
  await repository.replace(dataset());
  repository.close();
});
afterEach(async () => {
  cleanup();
  await deleteDB(databaseName);
});

async function start() {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Dein Tag' });
  return user;
}
async function stored() {
  const repository = new Repository(await openDatabase());
  const data = await repository.read();
  repository.close();
  return data;
}
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: true }), {
    target: { value },
  });
}

describe('dashboard and capture', () => {
  it('shows storage failures inside the active dialog and permits a safe retry', async () => {
    const user = await start();
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken auswählen' }),
    );
    vi.spyOn(Repository.prototype, 'replace').mockRejectedValueOnce(
      new Error('Speicher voll'),
    );
    await user.click(screen.getByRole('button', { name: 'Eintrag speichern' }));
    expect(
      await within(screen.getByRole('dialog')).findByRole('alert'),
    ).toHaveTextContent('Speicher voll');
    expect((await stored()).diaryEntries).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Eintrag speichern' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect((await stored()).diaryEntries).toHaveLength(1);
  });
  it('shows daily-only remaining and weekly extras separately, with text for overages', () => {
    render(
      <DaySummary
        daily={24}
        weekly={34}
        entries={[diary({ points: 30 })]}
        date="2026-10-20"
        today="2026-10-20"
      />,
    );
    const daily = screen.getByRole('region', { name: 'Tagespunkte' });
    expect(within(daily).getByText('0')).toBeVisible();
    expect(
      within(daily).getByText('6 Punkte aus Wochenextras verbraucht.'),
    ).toBeVisible();
    expect(
      screen.getByRole('region', { name: 'Wochenextras' }),
    ).toHaveTextContent('Verbleibend32');
    cleanup();
    render(
      <DaySummary
        daily={0}
        weekly={0}
        entries={[diary({ points: 60 })]}
        date="2026-10-20"
        today="2026-10-20"
      />,
    );
    expect(
      screen.getByText('Wochenextras um 60 Punkte überschritten.'),
    ).toBeVisible();
  });
  it('known standard food takes exactly three clicks, remains after remount and edits/deletes', async () => {
    const user = await start();
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken auswählen' }),
    );
    expect(screen.getByLabelText('Einheit')).toHaveValue('oats-portion');
    expect(screen.getByLabelText('Menge', { exact: true })).toHaveValue(1);
    expect(screen.getByText('6 Punkte')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Eintrag speichern' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect((await stored()).diaryEntries).toHaveLength(1);
    cleanup();
    await start();
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken bearbeiten' }),
    );
    change('Menge', '100');
    await user.selectOptions(screen.getByLabelText('Mahlzeit'), 'lunch');
    await user.click(screen.getByRole('button', { name: 'Eintrag speichern' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect((await stored()).diaryEntries[0]).toMatchObject({
      amount: 100,
      points: 11,
      meal: 'lunch',
    });
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken bearbeiten' }),
    );
    await user.click(screen.getByRole('button', { name: 'Eintrag löschen' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect((await stored()).diaryEntries).toHaveLength(0);
  });
  it('validates amount and displays incomplete nutrient uncertainty', async () => {
    const save = vi.fn().mockResolvedValue(false);
    const onClose = vi.fn();
    render(
      <EntryForm
        food={oats}
        data={dataset()}
        date="2026-10-20"
        save={save}
        busy={false}
        onClose={onClose}
      />,
    );
    change('Menge', '-1');
    expect(
      screen.getByText('Bitte eine nicht-negative Menge eingeben.'),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Eintrag speichern' }),
    ).toBeDisabled();
    change('Menge', '');
    expect(
      screen.getByRole('button', { name: 'Eintrag speichern' }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Einheit'), {
      target: { value: '' },
    });
    expect(screen.getByLabelText('Menge')).toHaveValue(100);
    await userEvent.click(
      screen.getByRole('button', { name: 'Eintrag speichern' }),
    );
    expect(save).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    cleanup();
    render(
      <PointLabel
        entry={{
          foodSnapshot: { ...oats, per100: { ...oats.per100, kcal: null } },
          amount: 100,
        }}
      />,
    );
    expect(screen.getByText(/Punkte nicht berechenbar/)).toBeVisible();
    cleanup();
    render(
      <PointLabel
        entry={{
          foodSnapshot: { ...oats, per100: { ...oats.per100, protein: null } },
          amount: 100,
        }}
      />,
    );
    expect(screen.getByText('Geschätzt / unvollständig')).toBeVisible();
  });
  it('favorites, filters, search, portion selection and dismiss/back navigation', async () => {
    const user = await start();
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken: Favorit' }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Haferflocken: Favorit' }),
      ).toHaveAttribute('aria-pressed', 'true'),
    );
    await user.selectOptions(screen.getByLabelText('Auswahl'), 'favorites');
    expect(
      screen.getByRole('button', { name: 'Haferflocken auswählen' }),
    ).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Auswahl'), 'recent');
    expect(screen.getByText('Keine Lebensmittel gefunden.')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Auswahl'), 'base');
    expect(screen.getByText('Keine Lebensmittel gefunden.')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Auswahl'), 'custom');
    change('Lebensmittel suchen', 'NICHT VORHANDEN');
    expect(screen.getByText('Keine Lebensmittel gefunden.')).toBeVisible();
    change('Lebensmittel suchen', 'Hafer');
    await user.click(
      screen.getByRole('button', { name: 'Haferflocken auswählen' }),
    );
    await user.selectOptions(screen.getByLabelText('Einheit'), '');
    await user.selectOptions(screen.getByLabelText('Einheit'), 'oats-portion');
    change('Menge', '2');
    expect(screen.getByText(/100 g/)).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Zurück zur Auswahl' }),
    );
    await user.click(screen.getByRole('button', { name: 'Schließen' }));
    await user.click(screen.getByRole('button', { name: 'Vorheriger Tag' }));
    await user.click(screen.getByRole('button', { name: 'Nächster Tag' }));
    await user.click(screen.getByRole('button', { name: 'Heute' }));
    change('Tag auswählen', '2026-10-19');
    expect(screen.getByLabelText('Tag auswählen')).toHaveValue('2026-10-19');
  });
});

describe('all settings, food, activity and weight forms', () => {
  it('profile calculations, all inputs, overrides and explicit save errors', async () => {
    const user = await start();
    await user.click(
      screen.getByRole('button', { name: 'Profil/Einstellungen' }),
    );
    await user.selectOptions(screen.getByLabelText('Geschlecht'), 'female');
    await user.click(screen.getByLabelText('Stillen'));
    change('Alter (Jahre)', '30');
    change('Größe (cm)', '165');
    change('Gewicht fürs Budget (kg)', '70');
    await user.selectOptions(screen.getByLabelText('Aktivitätsniveau'), '2');
    expect(screen.getByText('34 Tagespunkte')).toBeVisible();
    change('Tagesbudget', '30');
    change('Wochenbudget', '40');
    await user.click(screen.getByRole('button', { name: 'Profil speichern' }));
    expect(await screen.findByText('Profil gespeichert.')).toBeVisible();
    expect((await stored()).profile).toMatchObject({
      dailyBudgetOverride: 30,
      weeklyBudgetOverride: 40,
    });
    change('Tagesbudget', '');
    change('Wochenbudget', '');
    await user.click(screen.getByRole('button', { name: 'Profil speichern' }));
    await waitFor(async () =>
      expect((await stored()).profile?.dailyBudgetOverride).toBeNull(),
    );
    vi.spyOn(Repository.prototype, 'replace').mockRejectedValueOnce(
      new Error('Speicher voll'),
    );
    change('Tagesbudget', '99');
    await user.click(screen.getByRole('button', { name: 'Profil speichern' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Speicher voll');
    expect((await stored()).profile?.dailyBudgetOverride).toBeNull();
  });
  it('creates, modifies and deletes foods and reusable portions without altering diary snapshots', async () => {
    const user = await start();
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    await user.click(
      screen.getByRole('button', { name: 'Eigenes Lebensmittel anlegen' }),
    );
    change('Name', 'Mein Drink');
    change('Kategorie', 'Getränke');
    await user.selectOptions(screen.getByLabelText('Nährwertbasis'), 'ml');
    change('Energie (kcal)', '50');
    change('Gesättigte Fette (g)', '1');
    change('Zucker (g)', '2');
    change('Protein (g)', '3');
    await user.click(
      screen.getByLabelText('Als 0-Punkte-Lebensmittel bewerten'),
    );
    change('Portion 1: Bezeichnung', 'Glas');
    change('Portion 1: Menge', '250');
    await user.click(
      screen.getByRole('button', { name: 'Portion hinzufügen' }),
    );
    change('Portion 2: Bezeichnung', 'Unbekannt');
    await user.click(
      screen.getByRole('button', { name: 'Lebensmittel speichern' }),
    );
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
    expect(screen.getByLabelText('Einheit')).toHaveDisplayValue(
      'Glas (250 ml)',
    );
    expect(
      screen.queryByRole('option', { name: /Unbekannt/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Eintrag speichern' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: '+ Hinzufügen' }));
    await user.click(
      screen.getByRole('button', { name: 'Mein Drink: bearbeiten' }),
    );
    change('Name', 'Mein neuer Drink');
    change('Portion 1: Menge', '');
    await user.click(
      screen.getByRole('button', { name: 'Portion 2 entfernen' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Portion 1 entfernen' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Portion hinzufügen' }),
    );
    change('Portion 1: Bezeichnung', 'Flasche');
    change('Portion 1: Menge', '500');
    await user.click(screen.getByLabelText('Standard'));
    await user.click(
      screen.getByRole('button', { name: 'Lebensmittel speichern' }),
    );
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
    await user.click(
      screen.getByRole('button', { name: 'Mein neuer Drink: löschen' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Mein neuer Drink: bearbeiten' }),
      ).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(
      screen.getByRole('button', { name: 'Mein Drink bearbeiten' }),
    ).toBeVisible();
    expect((await stored()).diaryEntries[0].foodSnapshot.name).toBe(
      'Mein Drink',
    );
  });
  it('captures, edits, cancels and deletes activities without budget effects', async () => {
    const user = await start();
    await user.click(
      screen.getByRole('button', { name: /0 Aktivitätspunkte/ }),
    );
    change('Aktivität', 'Gehen');
    change('Dauer (Minuten)', '45');
    expect(screen.getByText('3 Aktivitätspunkte')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Intensität'), 'high');
    await user.click(
      screen.getByRole('button', { name: 'Aktivität speichern' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Gehen bearbeiten' }),
    );
    change('Aktivität', 'Radfahren');
    await user.selectOptions(screen.getByLabelText('Intensität'), 'low');
    await user.click(
      screen.getByRole('button', { name: 'Aktivität speichern' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Radfahren bearbeiten' }),
    );
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    await user.click(screen.getByRole('button', { name: 'Radfahren löschen' }));
    await waitFor(() =>
      expect(screen.getByText('Noch keine Aktivitäten erfasst.')).toBeVisible(),
    );
    await user.click(screen.getByRole('button', { name: 'Tag' }));
    expect(
      within(screen.getByRole('region', { name: 'Tagespunkte' })).getAllByText(
        '36',
      ),
    ).toHaveLength(2);
  });
  it('captures irregular weights and supports edit/delete and accessible daily chart', async () => {
    const user = await start();
    await user.click(screen.getByRole('button', { name: /Noch kein Gewicht/ }));
    expect(screen.getByText(/Noch keine Gewichtseinträge/)).toBeVisible();
    change('Datum', '2026-10-01');
    change('Gewicht (kg)', '82');
    await user.click(screen.getByRole('button', { name: 'Gewicht speichern' }));
    await screen.findByRole('table');
    change('Datum', '2026-10-20');
    change('Gewicht (kg)', '79');
    await user.click(screen.getByRole('button', { name: 'Gewicht speichern' }));
    expect((await screen.findAllByText('-3 kg'))[0]).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Gewicht vom 2026-10-20 bearbeiten' }),
    );
    change('Gewicht (kg)', '78');
    await user.click(screen.getByRole('button', { name: 'Gewicht speichern' }));
    expect((await screen.findAllByText('-4 kg'))[0]).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Gewicht vom 2026-10-20 bearbeiten' }),
    );
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    await user.click(
      screen.getByRole('button', { name: 'Gewicht vom 2026-10-20 löschen' }),
    );
    await waitFor(() =>
      expect(screen.queryByText('-4 kg')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(/Gewichtsdiagramm/);
  });
  it('weight changes are relative to first and previous daily measurement', () => {
    render(
      <WeightChart
        entries={[
          weight('2026-10-01', 82),
          weight('2026-10-15', 81),
          weight('2026-10-20', 79),
        ]}
      />,
    );
    expect(screen.getByText('-3 kg')).toBeVisible();
    expect(screen.getByText('-2 kg')).toBeVisible();
  });
});

describe('backups and first start', () => {
  it('rejects malformed imports, requires confirmation, cancels and restores entire data', async () => {
    const user = await start();
    await user.click(
      screen.getByRole('button', { name: 'Profil/Einstellungen' }),
    );
    const input = screen.getByLabelText('Daten importieren');
    const file = (text: string) => {
      const value = new File([text], 'backup.json', {
        type: 'application/json',
      });
      Object.defineProperty(value, 'text', { value: async () => text });
      return value;
    };
    await user.upload(input, file('broken'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Import abgewiesen',
    );
    const restored = dataset();
    restored.profile!.dailyBudgetOverride = 77;
    const json = serializeBackup(restored, new Date(stamp));
    await user.upload(input, file(json));
    expect(await screen.findByRole('dialog')).toHaveAccessibleName(
      'Sicherung wiederherstellen',
    );
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect((await stored()).profile?.dailyBudgetOverride).toBeNull();
    await user.upload(input, file(json));
    await user.click(
      await screen.findByRole('button', { name: 'Daten ersetzen' }),
    );
    expect(
      await screen.findByText('Sicherung vollständig wiederhergestellt.'),
    ).toBeVisible();
    expect(screen.getByLabelText('Tagesbudget', { exact: true })).toHaveValue(
      77,
    );
    expect((await stored()).profile?.dailyBudgetOverride).toBe(77);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: 'Daten exportieren' }));
    expect(
      screen.getByText('Sicherung zum Download bereitgestellt.'),
    ).toBeVisible();
    await user.upload(
      input,
      file(serializeBackup({ ...dataset(), profile: null }, new Date(stamp))),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Daten ersetzen' }),
    );
    await screen.findByText('Sicherung vollständig wiederhergestellt.');
    expect(screen.getByLabelText('Tagesbudget', { exact: true })).toHaveValue(
      null,
    );
    expect(screen.getByText(/Willkommen! Richte/)).toBeVisible();
  });
  it('handles empty profile and startup storage failure explicitly', async () => {
    const repository = new Repository(await openDatabase());
    await repository.replace({ ...dataset(), profile: null });
    repository.close();
    const user = await start();
    expect(screen.getByText('Willkommen bei TrackYourself')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Profil einrichten' }));
    expect(screen.getByText(/Willkommen! Richte/)).toBeVisible();
    cleanup();
    vi.spyOn(Repository.prototype, 'seed').mockRejectedValueOnce(
      new Error('Zugriff verweigert'),
    );
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Lokaler Speicher nicht verfügbar: Zugriff verweigert',
    );
  });
  it('warns on blocked storage upgrades', async () => {
    await start();
    window.dispatchEvent(new CustomEvent('storage-blocked'));
    expect(await screen.findByRole('alert')).toHaveTextContent('anderen Tab');
  });
});

it('propagates failed diary deletion without pretending success', async () => {
  const save = vi
    .fn<(data: Dataset) => Promise<boolean>>()
    .mockResolvedValue(false);
  const close = vi.fn();
  render(
    <EntryForm
      entry={diary()}
      data={dataset()}
      date="2026-10-20"
      save={save}
      busy={false}
      onClose={close}
    />,
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Eintrag löschen' }),
  );
  expect(close).not.toHaveBeenCalled();
});
