import {
  useContext,
  useEffect,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { StorageErrorContext } from '../../app/feedback';

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  );
}

export function Modal({
  title,
  onClose,
  children,
  actions,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const error = useContext(StorageErrorContext);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <header className="section-heading dialog-heading">
        <h2>{title}</h2>
        {actions}
        <button type="button" onClick={onClose} aria-label="Schließen">
          ×
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      {children}
    </dialog>
  );
}
