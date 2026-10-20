import { useState } from 'react';
import type { Dataset } from '../../domain/types';
import { parseBackup, serializeBackup } from '../../data/backup';
import { errorMessage } from '../../app/useTracker';
import { Modal } from '../components/Form';

export function Settings({
  data,
  save,
  busy,
  onRestore,
}: {
  data: Dataset;
  save: (next: Dataset) => Promise<boolean>;
  busy: boolean;
  onRestore: (data: Dataset) => void;
}) {
  const [pending, setPending] = useState<Dataset | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  return (
    <>
      <section className="card">
        <h2>Datensicherung</h2>
        <p>
          Alles bleibt auf diesem Gerät. Browserdaten löschen, Geräteverlust
          oder ein Gerätewechsel können Daten löschen. Sichere deine Daten
          regelmäßig als Datei.
        </p>
        <button
          disabled={busy}
          onClick={() => {
            const blob = new Blob([serializeBackup(data, new Date())], {
              type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `trackyourself-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setNotice('Sicherung zum Download bereitgestellt.');
          }}
        >
          Daten exportieren
        </button>
        <label className="file-input">
          Daten importieren
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              setError('');
              setNotice('');
              try {
                setPending(parseBackup(await file.text()));
              } catch (reason) {
                setError(`Import abgewiesen: ${errorMessage(reason)}`);
              }
            }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
      </section>
      <section className="card">
        <h2>Über / Datenquellen</h2>
        <p>
          TrackYourself · Eigenständiges Punktemodell · Kein Konto, kein Server,
          kein Tracking.
        </p>
        <p>
          Basisliste: Max Rubner-Institut (2025): Bundeslebensmittelschlüssel
          (BLS), Version 4.0 — Deutsche Nährstoffdatenbank. Karlsruhe.{' '}
          <a href="https://doi.org/10.25826/Data20251217-134202-0">
            Originalquelle
          </a>
          . Lizenz:{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/deed.de">
            CC BY 4.0
          </a>
          .
        </p>
        <p>
          Änderungen: kuratierte Auswahl von 63 Lebensmitteln, eigene
          0-Punkte-Zuordnung und Portionsrichtwerte. BLS-Nährwerte unverändert
          je 100 g; auch Flüssigkeiten der Basisliste werden in Gramm erfasst.
          Eigene Lebensmittel können je 100 ml angelegt werden.
        </p>
        <p>
          Portionsrichtwerte: Scheibe Brot 45 g, Ei 55 g, Apfel 150 g, Esslöffel
          Öl 10 g, Becher Joghurt 150 g. Sonst 100 g, Haferflocken 50 g. Alle
          Portionsgrößen sind anpassbar.
        </p>
        <p>
          Installieren: im Browsermenü „App installieren“ bzw. „Zum
          Home-Bildschirm“. Nach dem ersten vollständigen Laden auch offline
          verfügbar.
        </p>
      </section>
      {pending && (
        <Modal
          title="Sicherung wiederherstellen"
          onClose={() => setPending(null)}
        >
          <p>
            Alle bestehenden Daten auf diesem Gerät werden vollständig durch die
            Sicherung ersetzt. Vorher bei Bedarf exportieren.
          </p>
          <p>
            {pending.foods.length} Lebensmittel · {pending.diaryEntries.length}{' '}
            Tagebucheinträge
          </p>
          <div className="actions">
            <button onClick={() => setPending(null)}>Abbrechen</button>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                if (await save(pending)) {
                  onRestore(pending);
                  setPending(null);
                  setNotice('Sicherung vollständig wiederhergestellt.');
                }
              }}
            >
              Daten ersetzen
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
