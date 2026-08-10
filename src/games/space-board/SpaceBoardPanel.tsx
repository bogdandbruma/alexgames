import {
  Bot,
  Check,
  Dices,
  Minus,
  Package,
  PawPrint,
  Plus,
  RotateCcw,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { rooms } from "../../game/board";
import {
  avatarOptionById,
  hashNameToAvatarId,
  pickRandomAvatarId,
} from "../../game/avatars";
import {
  PLAYER_NAME_MAX_LENGTH,
  type PlayerController,
  type PlayerSetup,
  useGameStore,
} from "../../game/store";
import {
  getPendingMystery,
  getPendingPortal,
  getPendingShop,
  getPendingTrivia,
} from "../../game/store/pendingEvent";
import { isActionShopItem, shopItems, type ShopItemId } from "../../game/shop";
import { AvatarPickerModal, AvatarSetupCompact } from "./AvatarSetupPicker";
import { CoinAmount } from "./CoinAmount";
import { ConfirmLeaveGameModal } from "./modals/ConfirmLeaveGameModal";
import { useSpaceBoardOnlineActions } from "./online/onlineActionsContext";

const controllers: Array<{
  id: PlayerController;
  label: string;
  Icon: LucideIcon;
}> = [
  { id: "player", label: "Jucător", Icon: User },
  { id: "ai", label: "Robot", Icon: Bot },
];

const defaultSetupPlayers: PlayerSetup[] = [
  {
    name: "Jucător 1",
    avatarId: hashNameToAvatarId("Jucător 1"),
    controller: "player",
  },
  {
    name: "Robot 1",
    avatarId: hashNameToAvatarId("Robot 1"),
    controller: "ai",
  },
];

function itemNeedsTarget(itemId: ShopItemId) {
  switch (itemId) {
    case "claw":
    case "pistol":
    case "swap-arrow":
      return true;
    case "bomb":
    case "coins-x3":
    case "cosmic-key":
    case "dice-x2":
    case "star":
    case "trivia-cancel":
      return false;
    default: {
      const exhaustiveCheck: never = itemId;
      return exhaustiveCheck;
    }
  }
}

function createSetupPlayer(index: number): PlayerSetup {
  return {
    name: index === 0 ? "Jucător 1" : `Robot ${index}`,
    avatarId: pickRandomAvatarId(),
    controller: index === 0 ? "player" : "ai",
  };
}

type SpaceBoardPanelProps = {
  onExit: () => void;
  onRequestTargetItem: (itemId: ShopItemId) => void;
  /** When set, roll/endTurn go through online envelopes instead of local store. */
  onlineControls?: {
    canAct: boolean;
    onRoll: () => void;
    onEndTurn: () => void;
  } | null;
};

export function SpaceBoardPanel({
  onExit,
  onRequestTargetItem,
  onlineControls = null,
}: SpaceBoardPanelProps) {
  const onlineActions = useSpaceBoardOnlineActions();
  const phase = useGameStore((state) => state.phase);
  const winnerId = useGameStore((state) => state.winnerId);
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const diceValue = useGameStore((state) => state.diceValue);
  const diceAnimating = useGameStore((state) => state.diceAnimating);
  const diceMultiplier = useGameStore((state) => state.diceMultiplier);
  const message = useGameStore((state) => state.message);
  const pendingEvent = useGameStore((state) => state.pendingEvent);
  const pendingMystery = getPendingMystery(pendingEvent);
  const pendingPortal = getPendingPortal(pendingEvent);
  const pendingShop = getPendingShop(pendingEvent);
  const pendingTrivia = getPendingTrivia(pendingEvent);
  const rolling = useGameStore((state) => state.rolling);
  const actionItemUsedThisTurn = useGameStore(
    (state) => state.actionItemUsedThisTurn,
  );
  const startGame = useGameStore((state) => state.startGame);
  const rollDice = useGameStore((state) => state.rollDice);
  const endTurn = useGameStore((state) => state.endTurn);
  const resetGame = useGameStore((state) => state.resetGame);
  const activateInventoryItem = useGameStore((state) => state.useInventoryItem);

  const [setupPlayers, setSetupPlayers] = useState<PlayerSetup[]>(
    defaultSetupPlayers,
  );
  const [avatarChoicePinned, setAvatarChoicePinned] = useState([
    false,
    false,
  ]);
  const [avatarModalPlayerIndex, setAvatarModalPlayerIndex] = useState<
    number | null
  >(null);
  const [leaveConfirmAction, setLeaveConfirmAction] = useState<
    "reset" | "exit" | null
  >(null);

  const currentPlayer = players[currentPlayerIndex];
  const visibleDiceMultiplier =
    currentPlayer?.armedDiceX2 || diceMultiplier > 1 ? 2 : 1;
  const winner =
    players.find(({ id }) => id === winnerId) ??
    players.find(({ positionIndex }) => positionIndex === rooms.length - 1);
  const currentRoom = rooms[currentPlayer?.positionIndex ?? 0];
  const finished = phase === "finished";
  const isSetup = phase === "setup";
  const currentInventory = currentPlayer?.inventory ?? [];
  const targetablePlayers = players.filter(({ id }) => id !== currentPlayer?.id);
  const hasRolled =
    diceValue !== null && !rolling && !diceAnimating;
  const canEndTurn =
    phase === "playing" &&
    currentPlayer?.controller === "player" &&
    hasRolled &&
    pendingEvent === null;

  const getInventoryItemTitle = (itemId: ShopItemId, needsTarget: boolean) => {
    const item = shopItems.find(({ id }) => id === itemId);

    if (finished || phase !== "playing") {
      return item?.description;
    }

    if (currentPlayer?.controller === "ai") {
      return "Nu e randul tau.";
    }

    if (rolling || diceAnimating) {
      return "Asteapta sa se termine zarul.";
    }

    if (isActionShopItem(itemId) && currentPlayer?.trapped) {
      return "Esti in capcana — nu poti folosi iteme de mutare.";
    }

    if (isActionShopItem(itemId) && diceValue === null) {
      return "Da cu zarul, apoi poti folosi itemul.";
    }

    if (isActionShopItem(itemId) && actionItemUsedThisTurn) {
      return "Ai folosit deja un item de actiune in acest tur.";
    }

    if (pendingMystery !== null) {
      return "Termina mai intai cartea mister.";
    }

    if (pendingPortal !== null) {
      return "Confirma portalul mai intai.";
    }

    if (pendingShop !== null) {
      return "Termina vizita la magazin.";
    }

    if (pendingTrivia !== null) {
      if (itemId === "trivia-cancel") {
        return item?.description ?? "Sari peste intrebarea trivia.";
      }

      return "Raspunde la trivia mai intai.";
    }

    if (itemId === "trivia-cancel" && pendingTrivia === null) {
      return "Se foloseste automat la urmatoarea intrebare trivia (sau apasa cand apare).";
    }

    if (itemId === "cosmic-key" && !currentPlayer?.trapped) {
      return "Se foloseste cand esti in capcana.";
    }

    if (needsTarget && targetablePlayers.length === 0) {
      return "Nu exista alt jucator de tintit.";
    }

    return item?.description;
  };

  const startRematch = () => {
    const rematchPlayers = players.map(({ avatarId, controller, name }) => ({
      avatarId,
      controller,
      name,
    }));

    startGame(rematchPlayers.length > 0 ? rematchPlayers : setupPlayers);
  };

  const confirmLeaveGame = () => {
    if (leaveConfirmAction === "reset") {
      resetGame();
    } else if (leaveConfirmAction === "exit") {
      resetGame();
      onExit();
    }

    setLeaveConfirmAction(null);
  };

  const requestExitToGames = () => {
    if (isSetup) {
      onExit();
      return;
    }

    setLeaveConfirmAction("exit");
  };

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

  const handleSetupNameChange = (playerIndex: number, name: string) => {
    const updates: Partial<PlayerSetup> = { name };

    if (!avatarChoicePinned[playerIndex]) {
      updates.avatarId = hashNameToAvatarId(name);
    }

    updateSetupPlayer(playerIndex, updates);
  };

  const handleAvatarSelect = (
    playerIndex: number,
    avatarId: PlayerSetup["avatarId"],
  ) => {
    setAvatarChoicePinned((pinned) => {
      const next = [...pinned];
      next[playerIndex] = true;
      return next;
    });
    updateSetupPlayer(playerIndex, { avatarId });
  };

  const setPlayerCount = (count: number) => {
    setSetupPlayers((currentPlayers) =>
      Array.from({ length: count }, (_, index) =>
        currentPlayers[index] ? currentPlayers[index] : createSetupPlayer(index),
      ),
    );
    setAvatarChoicePinned((pinned) =>
      Array.from({ length: count }, (_, index) => pinned[index] ?? false),
    );
  };

  return (
    <aside className="game-panel">
      <header className="panel-header">
        <p className="eyebrow">Aventură în stație</p>
        <div className="panel-title-row">
          <h1>Cursa spațială</h1>
          <button
            type="button"
            className="text-button"
            onClick={requestExitToGames}
          >
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
                      maxLength={PLAYER_NAME_MAX_LENGTH}
                      onChange={(event) =>
                        handleSetupNameChange(
                          playerIndex,
                          event.target.value.slice(0, PLAYER_NAME_MAX_LENGTH),
                        )
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

                  <AvatarSetupCompact
                    avatarId={player.avatarId}
                    onChangeClick={() => setAvatarModalPlayerIndex(playerIndex)}
                  />
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

          {avatarModalPlayerIndex !== null &&
          setupPlayers[avatarModalPlayerIndex] ? (
            <AvatarPickerModal
              avatarId={setupPlayers[avatarModalPlayerIndex].avatarId}
              playerName={setupPlayers[avatarModalPlayerIndex].name}
              onClose={() => setAvatarModalPlayerIndex(null)}
              onSelect={(avatarId) =>
                handleAvatarSelect(avatarModalPlayerIndex, avatarId)
              }
            />
          ) : null}
        </>
      ) : (
        <>
          <section className="status-grid" aria-label="Starea jocului">
            <div className="status-card">
              <span className="status-label">Rând</span>
              <strong>{currentPlayer?.name ?? "-"}</strong>
              <span className="status-room-mobile">
                {currentRoom.id}. {currentRoom.name}
              </span>
            </div>

            <div className="status-card status-card-small">
              <span className="status-label">Coins</span>
              <CoinAmount
                amount={currentPlayer?.coins ?? 0}
                className="coin-amount-status"
              />
            </div>

            <div className="status-card status-card-small">
              <span className="status-label">
                {visibleDiceMultiplier > 1 ? "Total zar" : "Zar"}
              </span>
              <strong>{diceAnimating ? "..." : (diceValue ?? "-")}</strong>
            </div>
          </section>

          <section
            className="status-card status-card-room"
            aria-label="Camera curentă"
          >
            <span className="status-label">Camera</span>
            <strong>
              {currentRoom.id}. {currentRoom.name}
            </strong>
          </section>

          <section className="player-roster" aria-label="Jucători">
            {players.map((player, index) => {
              const avatar = avatarOptionById[player.avatarId];
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
                  <CoinAmount
                    amount={player.coins}
                    className="coin-amount-roster"
                  />
                  <b>{player.lastDice ?? "-"}</b>
                </div>
              );
            })}
          </section>

          <div className="gameplay-bottom-dock">
            {!finished ? (
              <section className="message-box" aria-live="polite">
                <PawPrint aria-hidden="true" size={20} />
                <span>{message}</span>
              </section>
            ) : null}

            {finished ? (
              <section className="game-over-panel" aria-label="Final de joc">
                <div className="game-over-heading">
                  <Trophy aria-hidden="true" size={22} />
                  <div>
                    <span>Victorie pe Luna</span>
                    <strong>{winner?.name ?? "Castigatorul"}</strong>
                  </div>
                </div>
                <div className="game-over-actions">
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
                    onClick={() => setLeaveConfirmAction("exit")}
                  >
                    <Users aria-hidden="true" size={18} />
                    <span>Lobby</span>
                  </button>
                </div>
              </section>
            ) : null}

            <section className="inventory-panel" aria-label="Inventar">
              <div className="section-heading-row">
                <h2>Inventar</h2>
                <span>{currentInventory.length}/3</span>
              </div>

              <div className="inventory-list">
                {currentInventory.length === 0 ? (
                  <div className="inventory-empty">
                    <Package aria-hidden="true" size={18} />
                    <span>Gol</span>
                  </div>
                ) : (
                  currentInventory.map((itemId) => {
                    const item = shopItems.find(({ id }) => id === itemId);
                    const needsTarget = itemNeedsTarget(itemId);
                    const needsRollFirst =
                      isActionShopItem(itemId) && diceValue === null;

                    return (
                      <button
                        key={`${currentPlayer?.id}-${itemId}`}
                        type="button"
                        className="inventory-item-button"
                        disabled={
                          finished ||
                          phase !== "playing" ||
                          rolling ||
                          diceAnimating ||
                          needsRollFirst ||
                          currentPlayer?.controller === "ai" ||
                          (isActionShopItem(itemId) &&
                            (currentPlayer?.trapped ||
                              actionItemUsedThisTurn)) ||
                          (pendingEvent !== null &&
                            itemId !== "trivia-cancel") ||
                          (itemId === "trivia-cancel" &&
                            pendingTrivia === null) ||
                          (needsTarget && targetablePlayers.length === 0)
                        }
                        onClick={() => {
                          if (needsTarget) {
                            onRequestTargetItem(itemId);
                            return;
                          }

                          if (onlineActions) {
                            if (onlineActions.canAct) {
                              onlineActions.onUseInventoryItem(itemId);
                            }
                            return;
                          }

                          activateInventoryItem(itemId);
                        }}
                        title={getInventoryItemTitle(itemId, needsTarget)}
                      >
                        <span>{item?.icon}</span>
                        <strong>{item?.name ?? itemId}</strong>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <div className="game-actions">
              {canEndTurn ? (
                <button
                  type="button"
                  className="secondary-button end-turn-button"
                  disabled={onlineControls ? !onlineControls.canAct : false}
                  onClick={() => {
                    if (onlineControls) {
                      onlineControls.onEndTurn();
                      return;
                    }
                    endTurn();
                  }}
                >
                  <Check aria-hidden="true" size={18} />
                  <span>Termină turul</span>
                </button>
              ) : null}
              <button
                type="button"
                className="primary-button"
                disabled={
                  rolling ||
                  finished ||
                  canEndTurn ||
                  pendingEvent !== null ||
                  phase !== "playing" ||
                  currentPlayer?.controller === "ai" ||
                  (onlineControls ? !onlineControls.canAct : false)
                }
                onClick={() => {
                  if (onlineControls) {
                    onlineControls.onRoll();
                    return;
                  }
                  void rollDice();
                }}
              >
                <Dices aria-hidden="true" size={20} />
                <span>
                  {diceAnimating
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
                onClick={() => setLeaveConfirmAction("reset")}
              >
                <RotateCcw aria-hidden="true" size={18} />
                <span>Joc nou</span>
              </button>
            </div>
          </div>
        </>
      )}

      <p className="save-note">Jocul se salvează automat în acest browser.</p>

      {leaveConfirmAction ? (
        <ConfirmLeaveGameModal
          onCancel={() => setLeaveConfirmAction(null)}
          onConfirm={confirmLeaveGame}
        />
      ) : null}
    </aside>
  );
}
