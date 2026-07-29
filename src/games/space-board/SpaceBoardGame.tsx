import {
  Bot,
  Dices,
  Minus,
  PawPrint,
  Plus,
  RotateCcw,
  User,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { rooms } from "../../game/board";
import { avatarOptions } from "../../game/avatars";
import type { PlayerController, PlayerSetup } from "../../game/store";
import { useGameStore } from "../../game/store";
import { GameScene } from "../../three/GameScene";

const avatars = avatarOptions;

const controllers: Array<{
  id: PlayerController;
  label: string;
  Icon: LucideIcon;
}> = [
  { id: "player", label: "Jucător", Icon: User },
  { id: "ai", label: "Robot", Icon: Bot },
];

const defaultSetupPlayers: PlayerSetup[] = [
  { name: "Jucător 1", avatarId: "cat", controller: "player" },
  { name: "Robot 1", avatarId: "dog", controller: "ai" },
];

const dicePips: Record<number, string[]> = {
  1: ["center"],
  2: ["top-left", "bottom-right"],
  3: ["top-left", "center", "bottom-right"],
  4: ["top-left", "top-right", "bottom-left", "bottom-right"],
  5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
  6: [
    "top-left",
    "top-right",
    "middle-left",
    "middle-right",
    "bottom-left",
    "bottom-right",
  ],
};

function createSetupPlayer(index: number): PlayerSetup {
  return {
    name: index === 0 ? "Jucător 1" : `Robot ${index}`,
    avatarId: avatars[index % avatars.length].id,
    controller: index === 0 ? "player" : "ai",
  };
}

function DiceTray({
  rolling,
  value,
}: {
  rolling: boolean;
  value: number | null;
}) {
  const [rollingFrame, setRollingFrame] = useState(1);
  const visibleValue = rolling ? rollingFrame : (value ?? 1);

  useEffect(() => {
    if (!rolling) {
      return;
    }

    const rollingValues = [1, 4, 2, 6, 3, 5];
    let frameIndex = 0;

    setRollingFrame(rollingValues[frameIndex]);

    const frameTimer = window.setInterval(() => {
      frameIndex = (frameIndex + 1) % rollingValues.length;
      setRollingFrame(rollingValues[frameIndex]);
    }, 170);

    return () => window.clearInterval(frameTimer);
  }, [rolling]);

  return (
    <div className="dice-tray" aria-live="polite">
      <div
        className={rolling ? "dice-face-large dice-face-rolling" : "dice-face-large"}
        aria-label={rolling ? "Zarul se invarte" : `Zarul a picat ${visibleValue}`}
      >
        {dicePips[visibleValue].map((pip) => (
          <span key={pip} className={`dice-pip dice-pip-${pip}`} />
        ))}
      </div>

      <div className="dice-readout">
        <span>Zar</span>
        <strong>{rolling ? "..." : (value ?? "-")}</strong>
      </div>
    </div>
  );
}

function SceneToast() {
  const toast = useGameStore((state) => state.uiToast);

  if (!toast) {
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
    </div>
  );
}

type SpaceBoardGameProps = {
  onExit: () => void;
};

export function SpaceBoardGame({ onExit }: SpaceBoardGameProps) {
  const phase = useGameStore((state) => state.phase);
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const diceValue = useGameStore((state) => state.diceValue);
  const diceAnimating = useGameStore((state) => state.diceAnimating);
  const message = useGameStore((state) => state.message);
  const rolling = useGameStore((state) => state.rolling);
  const startGame = useGameStore((state) => state.startGame);
  const rollDice = useGameStore((state) => state.rollDice);
  const resetGame = useGameStore((state) => state.resetGame);
  const [setupPlayers, setSetupPlayers] = useState<PlayerSetup[]>(
    defaultSetupPlayers,
  );

  const currentPlayer = players[currentPlayerIndex];
  const currentRoom = rooms[currentPlayer?.positionIndex ?? 0];
  const finished = phase === "finished";
  const isSetup = phase === "setup";
  const isAiTurn =
    phase === "playing" && currentPlayer?.controller === "ai" && !rolling;

  const roomOccupants = useMemo(
    () =>
      rooms.map((_, roomIndex) =>
        players.filter((player) => player.positionIndex === roomIndex),
      ),
    [players],
  );

  useEffect(() => {
    if (!isAiTurn) {
      return;
    }

    const aiMove = window.setTimeout(() => {
      void rollDice();
    }, 1_700);

    return () => window.clearTimeout(aiMove);
  }, [isAiTurn, currentPlayer?.id, rollDice]);

  const updateSetupPlayer = (
    playerIndex: number,
    updates: Partial<PlayerSetup>,
  ) => {
    setSetupPlayers((currentPlayers) =>
      currentPlayers.map((player, index) =>
        index === playerIndex ? { ...player, ...updates } : player,
      ),
    );
  };

  const setPlayerCount = (count: number) => {
    setSetupPlayers((currentPlayers) =>
      Array.from({ length: count }, (_, index) =>
        currentPlayers[index] ? currentPlayers[index] : createSetupPlayer(index),
      ),
    );
  };

  return (
    <main
      className={isSetup ? "app-shell app-shell-setup" : "app-shell-gameplay app-shell"}
    >
      <aside className="game-panel">
        <header className="panel-header">
          <p className="eyebrow">Aventură în stație</p>
          <div className="panel-title-row">
            <h1>Cursa spațială</h1>
            <button type="button" className="text-button" onClick={onExit}>
              Jocuri
            </button>
          </div>
          <p className="subtitle">
            Ajunge primul la Centrul de comandă — dar ai grijă la camerele capcană!
          </p>
        </header>

        {isSetup ? (
          <>
            <section className="panel-section" aria-labelledby="players-heading">
              <div className="section-heading-row">
                <h2 id="players-heading">Jucători</h2>
                <div className="stepper" aria-label="Număr de jucători">
                  <button
                    type="button"
                    className="icon-button"
                    disabled={setupPlayers.length <= 1}
                    onClick={() => setPlayerCount(setupPlayers.length - 1)}
                    aria-label="Scade un jucător"
                  >
                    <Minus aria-hidden="true" size={17} />
                  </button>
                  <strong>{setupPlayers.length}</strong>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={setupPlayers.length >= 4}
                    onClick={() => setPlayerCount(setupPlayers.length + 1)}
                    aria-label="Adaugă un jucător"
                  >
                    <Plus aria-hidden="true" size={17} />
                  </button>
                </div>
              </div>

              <div className="setup-list">
                {setupPlayers.map((player, playerIndex) => (
                  <div className="setup-player" key={`setup-${playerIndex}`}>
                    <label className="name-field">
                      <span>Nume</span>
                      <input
                        value={player.name}
                        maxLength={18}
                        onChange={(event) =>
                          updateSetupPlayer(playerIndex, {
                            name: event.target.value,
                          })
                        }
                      />
                    </label>

                    <div className="segmented-control">
                      {controllers.map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          className={
                            player.controller === id
                              ? "segment-button segment-button-active"
                              : "segment-button"
                          }
                          onClick={() =>
                            updateSetupPlayer(playerIndex, { controller: id })
                          }
                          aria-pressed={player.controller === id}
                        >
                          <Icon aria-hidden="true" size={17} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="avatar-options">
                      {avatars.map(({ id, labelRo, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          className={
                            player.avatarId === id
                              ? "avatar-button avatar-button-active"
                              : "avatar-button"
                          }
                          onClick={() =>
                            updateSetupPlayer(playerIndex, { avatarId: id })
                          }
                          aria-pressed={player.avatarId === id}
                          title={labelRo}
                        >
                          <Icon aria-hidden="true" size={22} strokeWidth={2.2} />
                          <span>{labelRo}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <button
              type="button"
              className="primary-button start-button"
              onClick={() => startGame(setupPlayers)}
            >
              <Users aria-hidden="true" size={20} />
              <span>Începe jocul</span>
            </button>
          </>
        ) : (
          <>
            <section className="status-grid" aria-label="Starea jocului">
              <div className="status-card">
                <span className="status-label">Rând</span>
                <strong>{currentPlayer?.name ?? "-"}</strong>
              </div>

              <div className="status-card status-card-small">
                <span className="status-label">Zar</span>
                <strong>{diceValue ?? "-"}</strong>
              </div>
            </section>

            <section className="status-card" aria-label="Camera curentă">
              <span className="status-label">Camera</span>
              <strong>
                {currentRoom.id}. {currentRoom.name}
              </strong>
            </section>

            <section className="player-roster" aria-label="Jucători">
              {players.map((player, index) => {
                const avatar = avatars.find(({ id }) => id === player.avatarId);
                const Icon = avatar?.Icon ?? PawPrint;

                return (
                  <div
                    key={player.id}
                    className={
                      index === currentPlayerIndex
                        ? "roster-player roster-player-active"
                        : "roster-player"
                    }
                  >
                    <Icon aria-hidden="true" size={19} />
                    <div>
                      <strong>{player.name}</strong>
                      <span>
                        {player.controller === "ai" ? "Robot" : "Jucător"} — camera{" "}
                        {player.positionIndex + 1}
                      </span>
                    </div>
                    <b>{player.lastDice ?? "-"}</b>
                  </div>
                );
              })}
            </section>

            <section className="room-strip" aria-label="Camerele stației">
              {rooms.map((room, index) => (
                <span
                  key={room.id}
                  className={
                    currentPlayer?.positionIndex === index
                      ? "room-dot room-dot-current"
                      : roomOccupants[index].length > 0
                        ? "room-dot room-dot-occupied"
                        : room.effect?.kind === "forward"
                          ? "room-dot room-dot-forward"
                          : room.effect?.kind === "backward"
                            ? "room-dot room-dot-backward"
                            : "room-dot"
                  }
                  title={room.name}
                >
                  {roomOccupants[index].length > 0
                    ? roomOccupants[index].length
                    : room.id}
                </span>
              ))}
            </section>

            <section className="message-box" aria-live="polite">
              <PawPrint aria-hidden="true" size={20} />
              <span>{message}</span>
            </section>

            <div className="game-actions">
              <button
                type="button"
                className="primary-button"
                disabled={
                  rolling ||
                  finished ||
                  phase !== "playing" ||
                  currentPlayer?.controller === "ai"
                }
                onClick={() => void rollDice()}
              >
                <Dices aria-hidden="true" size={20} />
                <span>
                  {rolling
                    ? "Se rostogolește..."
                    : finished
                      ? "Ai câștigat!"
                      : currentPlayer?.controller === "ai"
                        ? "Robotul dă cu zarul"
                        : "Dă cu zarul"}
                </span>
              </button>

              <button
                type="button"
                className="secondary-button"
                disabled={rolling}
                onClick={resetGame}
              >
                <RotateCcw aria-hidden="true" size={18} />
                <span>Joc nou</span>
              </button>
            </div>
          </>
        )}

        <p className="save-note">
          Jocul se salvează automat în acest browser.
        </p>
      </aside>

      <section className="scene-container" aria-label="Tabla spațială 3D">
        <GameScene />
        <SceneToast />
        <DiceTray rolling={diceAnimating} value={diceValue} />
      </section>
    </main>
  );
}
