import { Rocket, Sparkles } from "lucide-react";
import { useGameStore } from "../../../game/store";

export function PortalOverlay() {
  const pendingPortal = useGameStore((state) => state.pendingPortal);
  const acknowledgePortalTransition = useGameStore(
    (state) => state.acknowledgePortalTransition,
  );

  if (!pendingPortal) {
    return null;
  }

  return (
    <div className="portal-overlay" role="dialog" aria-modal="true">
      <div className="portal-panel">
        <div className="portal-heading">
          <Sparkles aria-hidden="true" size={22} />
          <div>
            <span>Portal activat</span>
            <strong>
              Felicitări, ești avansat la camera {pendingPortal.toRoomId}
            </strong>
          </div>
        </div>

        <p>
          Apasă OK ca să intri în portal și să vezi cum ajungi în camera
          corectă.
        </p>

        <button
          type="button"
          className="primary-button portal-ok-button"
          onClick={acknowledgePortalTransition}
        >
          <Rocket aria-hidden="true" size={18} />
          <span>OK</span>
        </button>
      </div>
    </div>
  );
}
