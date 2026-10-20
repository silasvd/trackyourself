import { useCallback, useEffect, useRef, useState } from 'react';
import { openDatabase, Repository } from '../data/db';
import type { Dataset } from '../domain/types';

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unbekannter Fehler.';
}

export function useTracker() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const repository = useRef<Repository | null>(null);
  const locked = useRef(false);

  useEffect(() => {
    let active = true;
    const blocked = () =>
      setError(
        'Die Datenbank wurde in einem anderen Tab geöffnet oder aktualisiert. Bitte andere Tabs schließen und neu laden.',
      );
    window.addEventListener('storage-blocked', blocked);
    async function initialize() {
      try {
        const instance = new Repository(await openDatabase());
        if (!active) {
          instance.close();
          return;
        }
        repository.current = instance;
        await instance.seed();
        const stored = await instance.read();
        if (active) setData(stored);
      } catch (reason) {
        if (active)
          setError(`Lokaler Speicher nicht verfügbar: ${errorMessage(reason)}`);
      }
    }
    void initialize();
    return () => {
      active = false;
      repository.current?.close();
      window.removeEventListener('storage-blocked', blocked);
    };
  }, []);

  const save = useCallback(
    async (next: Dataset): Promise<boolean> => {
      if (locked.current || !repository.current) {
        setError('Speicher ist noch beschäftigt. Bitte erneut versuchen.');
        return false;
      }
      locked.current = true;
      setBusy(true);
      setError('');
      try {
        await repository.current.replace(next, data ?? undefined);
        setData(next);
        return true;
      } catch (reason) {
        setError(
          `Speichern fehlgeschlagen. Bestehende Daten bleiben erhalten: ${errorMessage(reason)}`,
        );
        return false;
      } finally {
        locked.current = false;
        setBusy(false);
      }
    },
    [data],
  );

  return { data, save, busy, error, setError };
}
