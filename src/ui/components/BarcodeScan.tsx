import { useCallback, useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { errorMessage } from '../../app/useTracker';
import { lookupBarcode } from '../../data/openFoodFacts';
import type { Dataset, Food } from '../../domain/types';
import { Field, Modal } from './Form';

export function BarcodeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="1.4em"
      height="1.4em"
      fill="currentColor"
    >
      <path d="M2 5h2v14H2zM6 5h1v14H6zM9 5h2v14H9zM13 5h1v14h-1zM16 5h2v14h-2zM20 5h2v14h-2z" />
    </svg>
  );
}

function CameraCapture({
  onDetected,
  onError,
}: {
  onDetected: (code: string) => void;
  onError: (message: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    let active = true;
    let detected = false;
    let stream: MediaStream | undefined;
    let controls: IScannerControls | undefined;
    const stop = () => {
      controls?.stop();
      stream?.getTracks().forEach((track) => track.stop());
    };
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            'Kamera nicht verfügbar. Bitte HTTPS oder localhost verwenden und den Barcode alternativ eingeben.',
          );
        }
        const { BrowserMultiFormatOneDReader } = await import('@zxing/browser');
        if (!active) return;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!active) {
          stop();
          return;
        }
        controls = await new BrowserMultiFormatOneDReader().decodeFromStream(
          stream,
          video.current!,
          (result, error, scanner) => {
            if (!active || detected) return;
            if (result) {
              detected = true;
              scanner.stop();
              stop();
              onDetected(result.getText());
            } else if (
              error &&
              ![
                'NotFoundException',
                'ChecksumException',
                'FormatException',
              ].includes(error.getKind())
            ) {
              detected = true;
              scanner.stop();
              stop();
              onError(
                `Barcode-Erkennung fehlgeschlagen: ${errorMessage(error)}. Bitte den Barcode eingeben.`,
              );
            }
          },
        );
        if (!active || detected) stop();
      } catch (error) {
        stop();
        if (active)
          onError(
            `Kamera konnte nicht gestartet werden: ${error instanceof DOMException ? error.message : errorMessage(error)}. Bitte die Berechtigung prüfen oder den Barcode eingeben.`,
          );
      }
    }
    void start();
    return () => {
      active = false;
      stop();
    };
  }, [onDetected, onError]);
  return (
    <>
      <video
        className="barcode-video"
        ref={video}
        autoPlay
        muted
        playsInline
        aria-label="Barcode-Kameravorschau"
      />
      <p role="status">Barcode ruhig und vollständig vor die Kamera halten.</p>
    </>
  );
}

export function BarcodeScan({
  data,
  save,
  busy,
  onClose,
  onSaved,
}: {
  data: Dataset;
  save: (next: Dataset) => Promise<boolean>;
  busy: boolean;
  onClose: () => void;
  onSaved: (food: Food, cached: boolean) => void;
}) {
  const [barcode, setBarcode] = useState('');
  const [camera, setCamera] = useState(true);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState('');
  const request = useRef<AbortController | null>(null);
  const locked = useRef(false);
  useEffect(() => () => request.current?.abort(), []);

  const lookup = useCallback(
    async (code: string) => {
      if (locked.current || busy) return;
      locked.current = true;
      setCamera(false);
      setLoading(true);
      setProblem('');
      const controller = new AbortController();
      request.current = controller;
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 15000);
      try {
        const result = await lookupBarcode(
          code,
          data.foods,
          data.portions,
          controller.signal,
        );
        clearTimeout(timeout);
        if (controller.signal.aborted) return;
        const saved =
          result.cached ||
          (await save({
            ...data,
            foods: [...data.foods, result.food],
            portions: [...data.portions, ...result.portions],
          }));
        if (saved && !controller.signal.aborted) {
          onSaved(result.food, result.cached);
        }
      } catch (error) {
        if (timedOut)
          setProblem('Die Abfrage dauert zu lange. Bitte erneut versuchen.');
        else if (!controller.signal.aborted) setProblem(errorMessage(error));
      } finally {
        clearTimeout(timeout);
        locked.current = false;
        setLoading(false);
      }
    },
    [busy, data, save, onSaved],
  );
  const detected = useCallback(
    (code: string) => {
      setBarcode(code);
      void lookup(code);
    },
    [lookup],
  );
  const cameraError = useCallback((message: string) => {
    setCamera(false);
    setProblem(message);
  }, []);

  return (
    <Modal title="Barcode scannen" onClose={onClose}>
      <p>
        Zuerst wird lokal gesucht. Nur unbekannte Barcodes werden an Open Food
        Facts gesendet. Die Kameraaufnahmen bleiben auf deinem Gerät.
      </p>
      {camera && <CameraCapture onDetected={detected} onError={cameraError} />}
      <button
        type="button"
        disabled={busy || loading}
        onClick={() => {
          setProblem('');
          setCamera(!camera);
        }}
      >
        {camera
          ? 'Kamera stoppen'
          : problem
            ? 'Erneut scannen'
            : 'Kamera starten'}
      </button>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void lookup(barcode);
        }}
      >
        <Field
          label="Barcode"
          data-autofocus
          inputMode="numeric"
          autoComplete="off"
          required
          value={barcode}
          disabled={loading || busy}
          onChange={(event) => setBarcode(event.target.value)}
          placeholder="EAN / UPC"
        />
        <button
          className="primary"
          disabled={loading || busy || !barcode.trim()}
        >
          Produkt abrufen
        </button>
      </form>
      {loading && (
        <p role="status">Produkt wird gesucht und lokal gespeichert …</p>
      )}
      {problem && <p role="alert">{problem}</p>}
      <p className="hint">
        Nährwerte und Mengen mit der Verpackung vergleichen. Fehlende Nährwerte
        werden als unvollständig markiert. Nicht gefunden? Dialog schließen und
        „Eigenes Lebensmittel anlegen“ wählen.
      </p>
      <p>
        Daten: <a href="https://world.openfoodfacts.org/">Open Food Facts</a> ·{' '}
        <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</a>.
      </p>
    </Modal>
  );
}
