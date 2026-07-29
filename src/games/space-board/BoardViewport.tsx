import { Map, X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { rooms } from "../../game/board";
import { useGameStore } from "../../game/store";
import { GameScene } from "../../three/GameScene";
import { SpaceMinimap } from "./SpaceMinimap";
import { CoinAmount } from "./CoinAmount";
import { BigDiceRollOverlay } from "./dice/BigDiceRollOverlay";
import { DiceTray } from "./dice/DiceTray";

function SceneToast() {
  const toast = useGameStore((state) => state.uiToast);
  const pendingTrivia = useGameStore((state) => state.pendingTrivia);

  if (!toast || pendingTrivia) {
    return null;
  }

  return (
    <div
      key={toast.id}
      className={`scene-toast scene-toast-${toast.tone}`}
      aria-live="polite"
    >
      <span>{toast.title}</span>
      <strong>{toast.description}</strong>
      {toast.coinsDelta ? (
        <CoinAmount
          amount={toast.coinsDelta}
          className="coin-amount-toast"
          signed
        />
      ) : null}
    </div>
  );
}

export const BoardViewport = memo(function BoardViewport() {
  const phase = useGameStore((state) => state.phase);
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const diceValue = useGameStore((state) => state.diceValue);
  const diceAnimating = useGameStore((state) => state.diceAnimating);
  const diceMultiplier = useGameStore((state) => state.diceMultiplier);

  const [minimapOpen, setMinimapOpen] = useState(false);
  const diceTrayFaceRef = useRef<HTMLDivElement>(null);

  const isSetup = phase === "setup";
  const finished = phase === "finished";
  const currentPlayer = players[currentPlayerIndex];
  const visibleDiceMultiplier =
    currentPlayer?.armedDiceX2 || diceMultiplier > 1 ? 2 : 1;

  useEffect(() => {
    if (finished) {
      setMinimapOpen(false);
    }
  }, [finished]);

  useEffect(() => {
    if (!minimapOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMinimapOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [minimapOpen]);

  return (
    <section className="scene-container" aria-label="Tabla spațială 3D">
      <GameScene />
      <BigDiceRollOverlay
        multiplier={visibleDiceMultiplier}
        rolling={diceAnimating}
        targetFaceRef={diceTrayFaceRef}
        value={diceValue}
      />
      <SceneToast />
      {!isSetup ? (
        <button
          type="button"
          className="map-fab"
          onClick={() => setMinimapOpen(true)}
          aria-label="Deschide miniharta"
          aria-haspopup="dialog"
          aria-expanded={minimapOpen}
          data-testid="map-fab"
        >
          <Map aria-hidden="true" size={22} />
          <span>Hartă</span>
        </button>
      ) : null}
      {minimapOpen ? (
        <div
          className="minimap-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Miniharta"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setMinimapOpen(false);
            }
          }}
        >
          <div className="minimap-modal-shell">
            <div className="minimap-modal-header">
              <div className="minimap-modal-title">
                <Map aria-hidden="true" size={22} />
                <h2>Miniharta</h2>
                <span className="minimap-route-count">{rooms.length}</span>
              </div>
              <button
                type="button"
                className="icon-button minimap-modal-close"
                onClick={() => setMinimapOpen(false)}
                aria-label="Închide miniharta"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>
            <SpaceMinimap
              currentPlayerIndex={currentPlayerIndex}
              layout="modal"
              players={players}
              showHeading={false}
            />
          </div>
        </div>
      ) : null}
      <DiceTray
        faceRef={diceTrayFaceRef}
        multiplier={visibleDiceMultiplier}
        rolling={diceAnimating}
        value={diceValue}
      />
    </section>
  );
});
