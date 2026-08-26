import { X, Check } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({
  title,
  description,
  children,
  onClose,
  large,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  large?: boolean;
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${large ? "large" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Tutup dialog">
            <X size={17} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ModalFooter({
  onClose,
  submitLabel,
  disabled,
}: {
  onClose: () => void;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="modal-footer">
      <button type="button" className="button button-secondary" onClick={onClose}>
        Batal
      </button>
      <button type="submit" className="button button-primary" disabled={disabled}>
        {submitLabel}
        <Check size={16} />
      </button>
    </div>
  );
}
