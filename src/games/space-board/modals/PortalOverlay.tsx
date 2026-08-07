import { ArrowRight, Orbit, TriangleAlert } from "lucide-react";
import { useGameStore } from "../../../game/store";
import { getPendingPortal } from "../../../game/store/pendingEvent";
import { useSpaceBoardOnlineActions } from "../online/onlineActionsContext";

function PortalRoomBadge({
  roomId,
  caption,
}: {
  roomId: number;
  caption: string;
}) {
  const twoDigit = roomId >= 10;

  return (
    <div
      className={[
        "portal-room-badge",
        twoDigit ? "portal-room-badge-wide" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="portal-room-badge-caption">{caption}</span>
      <span className="portal-room-badge-chip" aria-hidden="true">
        <span className="portal-room-badge-circle" />
        <span className="portal-room-badge-id">{roomId}</span>
      </span>
    </div>
  );
}

function PortalRouteVisual({ isForward }: { isForward: boolean }) {
  const accent = isForward ? "#5fd4a8" : "#ff7867";

  return (
    <svg
      className="portal-route-art"
      viewBox="0 0 320 120"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="portal-route-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="60" rx="118" ry="46" fill="url(#portal-route-glow)" />
      <ellipse
        cx="160"
        cy="60"
        rx="72"
        ry="28"
        fill="none"
        stroke={accent}
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <ellipse
        cx="160"
        cy="60"
        rx="48"
        ry="18"
        fill="none"
        stroke={accent}
        strokeOpacity="0.55"
        strokeWidth="2.5"
      />
      <ellipse
        cx="160"
        cy="60"
        rx="26"
        ry="10"
        fill="rgba(12, 14, 20, 0.92)"
        stroke={accent}
        strokeWidth="2"
      />
      {[0, 1, 2, 3].map((index) => (
        <circle
          key={index}
          cx={88 + index * 48}
          cy={60 + (index % 2 === 0 ? -8 : 8)}
          r="3"
          fill={accent}
          opacity={0.45 + index * 0.12}
        />
      ))}
    </svg>
  );
}

export function PortalOverlay() {
  const pendingEvent = useGameStore((state) => state.pendingEvent);
  const pendingPortal = getPendingPortal(pendingEvent);
  const acknowledgePortalTransition = useGameStore(
    (state) => state.acknowledgePortalTransition,
  );
  const online = useSpaceBoardOnlineActions();

  if (!pendingPortal) {
    return null;
  }

  const { fromRoomId, toRoomId } = pendingPortal;
  const isForward = toRoomId > fromRoomId;
  const panelClass = isForward
    ? "portal-panel portal-panel-forward"
    : "portal-panel portal-panel-backward";

  return (
    <div className="portal-overlay" role="dialog" aria-modal="true">
      <div className={panelClass}>
        <PortalRouteVisual isForward={isForward} />

        <div className="portal-heading">
          {isForward ? (
            <Orbit aria-hidden="true" size={22} />
          ) : (
            <TriangleAlert aria-hidden="true" size={22} />
          )}
          <div>
            <span>{isForward ? "Portal de creștere" : "Portal de regres"}</span>
            <strong
              className={
                isForward ? "portal-message-forward" : "portal-message-backward"
              }
            >
              {isForward
                ? `Teleportare înainte: camera ${fromRoomId} → camera ${toRoomId}`
                : "Ups! Nu ai voie aici!"}
            </strong>
          </div>
        </div>

        <div
          className={`portal-route portal-route-${isForward ? "forward" : "backward"}`}
          aria-label={`De la camera ${fromRoomId} la camera ${toRoomId}`}
        >
          <PortalRoomBadge roomId={fromRoomId} caption="Pasul curent" />
          <span
            className={`portal-route-arrow portal-route-arrow-${isForward ? "forward" : "backward"}`}
            aria-hidden="true"
          >
            <ArrowRight size={36} strokeWidth={2.75} />
          </span>
          <PortalRoomBadge roomId={toRoomId} caption="Camera nouă" />
        </div>

        <p>
          {isForward
            ? "Apasă OK ca să intri în portal și să sari la camera următoare."
            : "Portalul te trimite înapoi. Apasă OK ca să continui."}
        </p>

        <button
          type="button"
          className="primary-button portal-ok-button"
          disabled={online ? !online.canAct : false}
          onClick={() => {
            if (online) {
              if (online.canAct) {
                online.onAcknowledgePortal();
              }
              return;
            }
            acknowledgePortalTransition();
          }}
        >
          <Orbit aria-hidden="true" size={18} />
          <span>OK</span>
        </button>
      </div>
    </div>
  );
}
