import { Rocket, RotateCcw, Users } from "lucide-react";
import { useState } from "react";
import { rooms } from "../../../game/board";
import { useGameStore } from "../../../game/store";
import { ConfirmLeaveGameModal } from "./ConfirmLeaveGameModal";

type VictoryOverlayProps = {
  onExit: () => void;
};

export function VictoryOverlay({ onExit }: VictoryOverlayProps) {
  const phase = useGameStore((state) => state.phase);
  const winnerId = useGameStore((state) => state.winnerId);
  const players = useGameStore((state) => state.players);
  const startGame = useGameStore((state) => state.startGame);
  const resetGame = useGameStore((state) => state.resetGame);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const finished = phase === "finished";
  const winner =
    players.find(({ id }) => id === winnerId) ??
    players.find(({ positionIndex }) => positionIndex === rooms.length - 1);

  if (!finished) {
    return null;
  }

  const startRematch = () => {
    const rematchPlayers = players.map(({ avatarId, controller, name }) => ({
      avatarId,
      controller,
      name,
    }));
    startGame(rematchPlayers);
  };

  const returnToLobby = () => {
    resetGame();
    onExit();
    setLeaveConfirmOpen(false);
  };

  return (
    <>
    <div className="victory-overlay" role="dialog" aria-modal="true">
      <div className="victory-panel">
        <div className="victory-heading">
          <Rocket aria-hidden="true" size={24} />
          <div>
            <span>Cursa s-a terminat</span>
            <strong>{winner?.name ?? "Castigatorul"} a ajuns pe Luna</strong>
          </div>
        </div>

        <p>
          Racheta porneste de pe Luna, zboara prin cer si aprinde artificiile
          pentru toti jucatorii.
        </p>

        <div className="victory-actions">
          <button
            type="button"
            className="primary-button"
            onClick={startRematch}
          >
            <RotateCcw aria-hidden="true" size={18} />
            <span>Revansa</span>
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setLeaveConfirmOpen(true)}
          >
            <Users aria-hidden="true" size={18} />
            <span>In lobby</span>
          </button>
        </div>
      </div>
    </div>
      {leaveConfirmOpen ? (
        <ConfirmLeaveGameModal
          onCancel={() => setLeaveConfirmOpen(false)}
          onConfirm={returnToLobby}
        />
      ) : null}
    </>
  );
}
