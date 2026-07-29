import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

type ConfirmLeaveGameModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmLeaveGameModal({
  onCancel,
  onConfirm,
}: ConfirmLeaveGameModalProps) {
  const titleId = "confirm-leave-game-title";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return createPortal(
    <div
      className="confirm-leave-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="confirm-leave-panel">
        <div className="confirm-leave-heading">
          <AlertTriangle aria-hidden="true" size={22} />
          <div>
            <span>Confirmare</span>
            <strong id={titleId}>Părăsești jocul?</strong>
          </div>
        </div>

        <p className="confirm-leave-copy">
          Ești sigur? Progresul curent se pierde.
        </p>

        <div className="confirm-leave-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Nu
          </button>
          <button type="button" className="primary-button" onClick={onConfirm}>
            Da
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
