import {
  Bot,
  CheckCircle2,
  Coins,
  Dices,
  HelpCircle,
  Map,
  Package,
  Minus,
  PawPrint,
  Plus,
  Rocket,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Trophy,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import type { LucideIcon } from "lucide-react";
import { rooms } from "../../game/board";
import { SpaceMinimap } from "./SpaceMinimap";
import {
  TriviaTimeBar,
  TriviaTimerRing,
  useTriviaCountdown,
} from "./TriviaAnswerTimer";
import { avatarOptionById, hashNameToAvatarId, pickRandomAvatarId } from "../../game/avatars";
import { getDicePips } from "../../game/dice";
import {
  PLAYER_NAME_MAX_LENGTH,
  type PlayerController,
  type PlayerSetup,
} from "../../game/store";
import { useGameStore } from "../../game/store";
import { isActionShopItem, shopItems, type ShopItemId } from "../../game/shop";
import { AvatarPickerModal, AvatarSetupCompact } from "./AvatarSetupPicker";
import { GameScene } from "../../three/GameScene";

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

function MysteryCardDescription({ text }: { text: string }) {
  const coinWord = /\s*coins\b/i;
  if (!coinWord.test(text)) {
    return <>{text}</>;
  }

  const segments = text.split(coinWord);

  return (
    <>
      {segments.map((segment, index) => (
        <span key={`${index}-${segment}`}>
          {segment}
          {index < segments.length - 1 ? (
            <Coins
              className="mystery-inline-coin"
              aria-hidden="true"
              size={14}
            />
          ) : null}
        </span>
      ))}
    </>
  );
}

function CoinAmount({
  amount,
  className = "",
  signed = false,
}: {
  amount: number;
  className?: string;
  signed?: boolean;
}) {
  const displayAmount = signed && amount > 0 ? `+${amount}` : `${amount}`;

  return (
    <span
      className={className ? `coin-amount ${className}` : "coin-amount"}
      aria-label={`${displayAmount} coins`}
    >
      <Coins aria-hidden="true" size={16} />
      <strong>{displayAmount}</strong>
      <span>coins</span>
    </span>
  );
}

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

type DicePipMarker = {
  key: string;
  className: string;
  style?: CSSProperties;
};

function createDicePipMarkers(value: number): DicePipMarker[] {
  const standardPips = getDicePips(value);

  if (standardPips.length > 0) {
    return standardPips.map((pip) => ({
      key: pip,
      className: `dice-pip dice-pip-${pip}`,
    }));
  }

  const pipCount = Math.max(1, Math.min(value, 12));
  const columns = pipCount > 9 ? 4 : 3;
  const rows = Math.ceil(pipCount / columns);
  const xStep = columns === 4 ? 16.5 : 20;
  const yStep = rows >= 4 ? 16 : 18;

  return Array.from({ length: pipCount }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;

    return {
      key: `dense-${index}`,
      className: "dice-pip dice-pip-dense",
      style: {
        "--pip-x": `${50 + (column - (columns - 1) / 2) * xStep}%`,
        "--pip-y": `${50 + (row - (rows - 1) / 2) * yStep}%`,
      } as CSSProperties,
    };
  });
}

function getDiceFaceValue(value: number, multiplier: number) {
  return multiplier > 1
    ? Math.max(1, Math.min(6, Math.round(value / multiplier)))
    : value;
}

function DiceFace({
  ariaLabel,
  className = "",
  faceRef,
  multiplier = 1,
  value,
}: {
  ariaLabel: string;
  className?: string;
  faceRef?: RefObject<HTMLDivElement | null>;
  multiplier?: number;
  value: number;
}) {
  const faceValue = getDiceFaceValue(value, multiplier);
  const pips = createDicePipMarkers(faceValue);
  const boosted = multiplier > 1;

  return (
    <div
      ref={faceRef}
      className={[
        "dice-face-large",
        boosted ? "dice-face-boosted" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
    >
      {pips.map((pip) => (
        <span key={pip.key} className={pip.className} style={pip.style} />
      ))}
      {boosted ? <span className="dice-multiplier-badge">x2</span> : null}
    </div>
  );
}

type DiceCubeFace = {
  className: string;
  value: number;
};

const diceCubeFaces: DiceCubeFace[] = [
  { className: "dice-cube-face-front", value: 1 },
  { className: "dice-cube-face-back", value: 6 },
  { className: "dice-cube-face-right", value: 3 },
  { className: "dice-cube-face-left", value: 4 },
  { className: "dice-cube-face-top", value: 2 },
  { className: "dice-cube-face-bottom", value: 5 },
];

function DiceCube({
  ariaLabel,
  cubeRef,
  multiplier = 1,
  rolling,
  value,
}: {
  ariaLabel: string;
  cubeRef?: RefObject<HTMLDivElement | null>;
  multiplier?: number;
  rolling: boolean;
  value: number;
}) {
  const boosted = multiplier > 1;

  return (
    <div
      ref={cubeRef}
      className={[
        "dice-cube-shell",
        boosted ? "dice-cube-shell-boosted" : "",
        rolling ? "dice-cube-shell-rolling" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
    >
      <div className="dice-cube">
        {diceCubeFaces.map((face) => (
          <div
            key={face.className}
            className={`dice-cube-face ${face.className}`}
          >
            <DiceFace
              className="dice-cube-face-plate"
              ariaLabel=""
              multiplier={multiplier}
              value={
                face.className === "dice-cube-face-front"
                  ? value
                  : face.value * multiplier
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DiceTray({
  faceRef,
  multiplier,
  rolling,
  value,
}: {
  faceRef: RefObject<HTMLDivElement | null>;
  multiplier: number;
  rolling: boolean;
  value: number | null;
}) {
  const [rollingFrame, setRollingFrame] = useState(1);
  const visibleValue = rolling ? rollingFrame * multiplier : (value ?? 1);
  const boosted = multiplier > 1;

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
    <div
      className={boosted ? "dice-tray dice-tray-boosted" : "dice-tray"}
      aria-live="polite"
    >
      <DiceFace
        className={rolling ? "dice-face-rolling" : ""}
        faceRef={faceRef}
        multiplier={multiplier}
        ariaLabel={
          rolling ? "Zarul se invarte" : `Zarul a picat ${visibleValue}`
        }
        value={visibleValue}
      />

      <div className="dice-readout">
        <span>{boosted ? "Total" : "Zar"}</span>
        <strong>{rolling ? "..." : (value ?? "-")}</strong>
      </div>
    </div>
  );
}

function BigDiceRollOverlay({
  rolling,
  targetFaceRef,
  multiplier,
  value,
}: {
  rolling: boolean;
  targetFaceRef: RefObject<HTMLDivElement | null>;
  multiplier: number;
  value: number | null;
}) {
  const overlayFaceRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [flyingHome, setFlyingHome] = useState(false);
  const [rollingFrame, setRollingFrame] = useState(1);
  const [flyStyle, setFlyStyle] = useState<CSSProperties>({});
  const visibleValue = rolling
    ? rollingFrame * multiplier
    : (value ?? rollingFrame);

  useEffect(() => {
    if (!rolling) {
      return;
    }

    const rollingValues = [1, 5, 2, 6, 3, 4];
    let frameIndex = 0;

    setVisible(true);
    setFlyingHome(false);
    setFlyStyle({});
    setRollingFrame(rollingValues[frameIndex]);

    const frameTimer = window.setInterval(() => {
      frameIndex = (frameIndex + 1) % rollingValues.length;
      setRollingFrame(rollingValues[frameIndex]);
    }, 120);

    return () => window.clearInterval(frameTimer);
  }, [rolling]);

  useEffect(() => {
    if (rolling || !visible) {
      return;
    }

    if (value == null) {
      setVisible(false);
      return;
    }

    setRollingFrame(value);

    const flyTimer = window.setTimeout(() => {
      const overlayRect = overlayFaceRef.current?.getBoundingClientRect();
      const targetRect = targetFaceRef.current?.getBoundingClientRect();

      if (overlayRect && targetRect) {
        const overlayCenterX = overlayRect.left + overlayRect.width / 2;
        const overlayCenterY = overlayRect.top + overlayRect.height / 2;
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;

        setFlyStyle({
          "--dice-fly-x": `${targetCenterX - overlayCenterX}px`,
          "--dice-fly-y": `${targetCenterY - overlayCenterY}px`,
          "--dice-fly-scale": `${targetRect.width / overlayRect.width}`,
        } as CSSProperties);
      }

      setFlyingHome(true);
    }, 2_000);
    const hideTimer = window.setTimeout(() => setVisible(false), 2_920);

    return () => {
      window.clearTimeout(flyTimer);
      window.clearTimeout(hideTimer);
    };
  }, [rolling, targetFaceRef, value, visible]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={
        flyingHome
          ? "dice-roll-overlay dice-roll-overlay-fly-home"
          : rolling
            ? "dice-roll-overlay dice-roll-overlay-rolling"
            : "dice-roll-overlay dice-roll-overlay-revealed"
      }
      style={flyStyle}
      aria-live="polite"
    >
      <DiceCube
        cubeRef={overlayFaceRef}
        multiplier={multiplier}
        rolling={rolling}
        ariaLabel={
          rolling ? "Zarul mare se invarte" : `Zarul a picat ${visibleValue}`
        }
        value={visibleValue}
      />
    </div>
  );
}

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

type SpaceBoardGameProps = {
  onExit: () => void;
};

export function SpaceBoardGame({ onExit }: SpaceBoardGameProps) {
  const phase = useGameStore((state) => state.phase);
  const winnerId = useGameStore((state) => state.winnerId);
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const diceValue = useGameStore((state) => state.diceValue);
  const diceAnimating = useGameStore((state) => state.diceAnimating);
  const diceMultiplier = useGameStore((state) => state.diceMultiplier);
  const message = useGameStore((state) => state.message);
  const pendingTrivia = useGameStore((state) => state.pendingTrivia);
  const pendingMystery = useGameStore((state) => state.pendingMystery);
  const pendingPortal = useGameStore((state) => state.pendingPortal);
  const pendingShop = useGameStore((state) => state.pendingShop);
  const shopStock = useGameStore((state) => state.shopStock);
  const rolling = useGameStore((state) => state.rolling);
  const acknowledgePortalTransition = useGameStore(
    (state) => state.acknowledgePortalTransition,
  );
  const answerTrivia = useGameStore((state) => state.answerTrivia);
  const buyShopItem = useGameStore((state) => state.buyShopItem);
  const closeShop = useGameStore((state) => state.closeShop);
  const pickMysteryCard = useGameStore((state) => state.pickMysteryCard);
  const acknowledgeMystery = useGameStore((state) => state.acknowledgeMystery);
  const startGame = useGameStore((state) => state.startGame);
  const rollDice = useGameStore((state) => state.rollDice);
  const resetGame = useGameStore((state) => state.resetGame);
  const activateInventoryItem = useGameStore((state) => state.useInventoryItem);
  const [targetItemId, setTargetItemId] = useState<ShopItemId | null>(null);
  const [minimapOpen, setMinimapOpen] = useState(false);
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
  const diceTrayFaceRef = useRef<HTMLDivElement>(null);

  const triviaAwaitingAnswer =
    pendingTrivia != null && pendingTrivia.result == null;
  const triviaCountdownKey = pendingTrivia
    ? `${pendingTrivia.playerId}-${pendingTrivia.question.id}`
    : "";
  const { secondsLeft: triviaSecondsLeft, progress: triviaTimeProgress } =
    useTriviaCountdown({
      active: triviaAwaitingAnswer,
      resetKey: triviaCountdownKey,
      onExpire: () => answerTrivia("wrong"),
    });

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
  const revealedMysteryCard =
    pendingMystery?.revealedCardId != null
      ? pendingMystery.cards.find(
          ({ id }) => id === pendingMystery.revealedCardId,
        )
      : undefined;
  const isAiTurn =
    phase === "playing" &&
    currentPlayer?.controller === "ai" &&
    !rolling &&
    pendingMystery === null &&
    pendingPortal === null &&
    pendingShop === null &&
    pendingTrivia === null;

  useEffect(() => {
    if (!isAiTurn) {
      return;
    }

    const aiMove = window.setTimeout(() => {
      void rollDice();
    }, 1_700);

    return () => window.clearTimeout(aiMove);
  }, [isAiTurn, currentPlayer?.id, rollDice]);

  useEffect(() => {
    if (finished) {
      setTargetItemId(null);
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

  const startRematch = () => {
    const rematchPlayers = players.map(({ avatarId, controller, name }) => ({
      avatarId,
      controller,
      name,
    }));

    startGame(rematchPlayers.length > 0 ? rematchPlayers : setupPlayers);
  };

  const returnToLobby = () => {
    resetGame();
    onExit();
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
    <main
      className={
        isSetup
          ? "app-shell app-shell-setup"
          : finished
            ? "app-shell-gameplay app-shell app-shell-finished"
            : "app-shell-gameplay app-shell"
      }
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
                <strong>
                  {diceAnimating ? "..." : (diceValue ?? "-")}
                </strong>
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
                      onClick={returnToLobby}
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
                            needsRollFirst ||
                            currentPlayer?.controller === "ai" ||
                            pendingMystery !== null ||
                            pendingPortal !== null ||
                            pendingShop !== null ||
                            pendingTrivia !== null ||
                            (needsTarget && targetablePlayers.length === 0)
                          }
                          onClick={() => {
                            if (needsTarget) {
                              setTargetItemId(itemId);
                              return;
                            }

                            activateInventoryItem(itemId);
                          }}
                          title={item?.description}
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
                <button
                  type="button"
                  className="primary-button"
                  disabled={
                    rolling ||
                    finished ||
                    pendingShop !== null ||
                    pendingMystery !== null ||
                    pendingPortal !== null ||
                    pendingTrivia !== null ||
                    phase !== "playing" ||
                    currentPlayer?.controller === "ai"
                  }
                  onClick={() => void rollDice()}
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
                  onClick={resetGame}
                >
                  <RotateCcw aria-hidden="true" size={18} />
                  <span>Joc nou</span>
                </button>
              </div>
            </div>
          </>
        )}

        <p className="save-note">
          Jocul se salvează automat în acest browser.
        </p>
      </aside>

      <section className="scene-container" aria-label="Tabla spațială 3D">
        <GameScene />
        <BigDiceRollOverlay
          multiplier={visibleDiceMultiplier}
          rolling={diceAnimating}
          targetFaceRef={diceTrayFaceRef}
          value={diceValue}
        />
        <SceneToast />
        {finished ? (
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
                  onClick={returnToLobby}
                >
                  <Users aria-hidden="true" size={18} />
                  <span>In lobby</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {pendingPortal ? (
          <div className="portal-overlay" role="dialog" aria-modal="true">
            <div className="portal-panel">
              <div className="portal-heading">
                <Sparkles aria-hidden="true" size={22} />
                <div>
                  <span>Portal activat</span>
                  <strong>
                    Felicitări, ești avansat la camera{" "}
                    {pendingPortal.toRoomId}
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
        ) : null}
        {pendingTrivia ? (
          <div className="trivia-overlay" role="dialog" aria-modal="true">
            {triviaAwaitingAnswer ? (
              <TriviaTimerRing
                secondsLeft={triviaSecondsLeft}
                progress={triviaTimeProgress}
              />
            ) : null}
            <div
              className={
                pendingTrivia.result
                  ? `trivia-panel trivia-panel-${pendingTrivia.result.answer}`
                  : "trivia-panel"
              }
            >
              {triviaAwaitingAnswer ? (
                <TriviaTimeBar
                  secondsLeft={triviaSecondsLeft}
                  progress={triviaTimeProgress}
                />
              ) : null}
              <div className="trivia-heading">
                <HelpCircle aria-hidden="true" size={22} />
                <span>Trivia spatiala</span>
              </div>

              <p className="trivia-question">{pendingTrivia.question.question}</p>

              <div className="trivia-options">
                {pendingTrivia.question.options.map((option) => {
                  const answered = pendingTrivia.result != null;
                  const selected =
                    pendingTrivia.result?.answer === option.result;

                  return (
                    <button
                      key={`${pendingTrivia.question.id}-${option.answer}`}
                      type="button"
                      className={
                        selected
                          ? `trivia-option-button trivia-option-${option.result}`
                          : answered
                            ? "trivia-option-button trivia-option-dimmed"
                            : "trivia-option-button"
                      }
                      disabled={answered}
                      onClick={() => answerTrivia(option.result)}
                    >
                      {option.answer}
                    </button>
                  );
                })}
              </div>

              {pendingTrivia.result ? (
                <div
                  key={`${pendingTrivia.question.id}-${pendingTrivia.result.answer}`}
                  className={`trivia-result trivia-result-${pendingTrivia.result.answer}`}
                  aria-live="polite"
                >
                  {pendingTrivia.result.answer === "correct" ? (
                    <CheckCircle2 aria-hidden="true" size={26} />
                  ) : (
                    <XCircle aria-hidden="true" size={26} />
                  )}
                  <div>
                    <strong>
                      {pendingTrivia.result.answer === "correct"
                        ? "Raspuns corect"
                        : "Raspuns gresit"}
                    </strong>
                    <span>
                      {pendingTrivia.result.coinsDelta > 0
                        ? "Ai castigat coins."
                        : pendingTrivia.result.coinsDelta < 0
                          ? "Ai pierdut coins."
                          : "Nu ai avut coins de pierdut."}
                    </span>
                  </div>
                  <CoinAmount
                    amount={pendingTrivia.result.coinsDelta}
                    className={
                      pendingTrivia.result.coinsDelta < 0
                        ? "coin-amount-trivia coin-amount-trivia-loss"
                        : "coin-amount-trivia"
                    }
                    signed
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {pendingMystery ? (
          <div className="mystery-overlay" role="dialog" aria-modal="true">
            <div className="mystery-panel">
              <div className="mystery-heading">
                <Sparkles aria-hidden="true" size={22} />
                <div>
                  <span>Mister spatial</span>
                  <strong>Camera {pendingMystery.roomId}</strong>
                </div>
              </div>

              <div className="mystery-card-row" aria-label="Carti misterioase">
                {pendingMystery.cards.map((card, cardIndex) => {
                  const revealed = pendingMystery.revealedCardId === card.id;
                  const locked = pendingMystery.revealedCardId !== null;

                  return (
                    <button
                      key={`${pendingMystery.roomId}-${card.id}-${cardIndex}`}
                      type="button"
                      className={
                        revealed
                          ? "mystery-card-button mystery-card-revealed"
                          : locked
                            ? "mystery-card-button mystery-card-dimmed"
                            : "mystery-card-button mystery-card-hidden"
                      }
                      disabled={locked}
                      onClick={() => pickMysteryCard(card.id)}
                      aria-label={
                        revealed
                          ? `Carte dezvaluita: ${card.title}`
                          : "Alege carte misterioasa"
                      }
                    >
                      <span className="mystery-card-back">
                        <Sparkles aria-hidden="true" size={24} />
                      </span>
                      <span className="mystery-card-face">
                        <span className="mystery-card-icon">{card.icon}</span>
                        <strong>{card.title}</strong>
                        <small>
                          <MysteryCardDescription text={card.description} />
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>

              {pendingMystery.revealedCardId ? (
                revealedMysteryCard ? (
                  <div className="mystery-reveal-footer">
                    <p className="mystery-reveal-summary">
                      <span className="mystery-reveal-icon" aria-hidden="true">
                        {revealedMysteryCard.icon}
                      </span>
                      <span>
                        <strong>{revealedMysteryCard.title}</strong>
                        <small>
                          <MysteryCardDescription
                            text={revealedMysteryCard.description}
                          />
                        </small>
                      </span>
                    </p>
                    <button
                      type="button"
                      className="primary-button mystery-ok-button"
                      onClick={acknowledgeMystery}
                    >
                      <Sparkles aria-hidden="true" size={18} />
                      <span>Am înțeles</span>
                    </button>
                  </div>
                ) : null
              ) : (
                <p className="mystery-pick-hint">Alege o carte misterioasă.</p>
              )}
            </div>
          </div>
        ) : null}
        {pendingShop && currentPlayer ? (
          <div className="shop-overlay" role="dialog" aria-modal="true">
            <div className="shop-panel">
              <div className="shop-heading">
                <ShoppingBag aria-hidden="true" size={22} />
                <div>
                  <span>In magazin</span>
                  <strong>Camera {pendingShop.roomId}</strong>
                </div>
                <CoinAmount
                  amount={currentPlayer.coins}
                  className="coin-amount-shop-balance"
                />
              </div>

              <div className="shop-grid">
                {shopItems.map((item) => {
                  const inStock = shopStock[item.id];
                  const inventoryFull = currentInventory.length >= 3;
                  const disabled =
                    pendingShop.purchased ||
                    !inStock ||
                    inventoryFull ||
                    currentPlayer.coins < item.cost;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={inStock ? "shop-item" : "shop-item shop-item-empty"}
                      disabled={disabled}
                      onClick={() => buyShopItem(item.id)}
                    >
                      <span className="shop-item-icon">
                        {inStock ? item.icon : "-"}
                      </span>
                      <strong>{inStock ? item.name : "Raft gol"}</strong>
                      <small>
                        {inStock ? (
                          <CoinAmount
                            amount={item.cost}
                            className="coin-amount-price"
                          />
                        ) : (
                          "Vandut"
                        )}
                      </small>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="primary-button shop-done-button"
                onClick={closeShop}
              >
                <span>Gata</span>
              </button>
            </div>
          </div>
        ) : null}
        {targetItemId && currentPlayer ? (
          <div className="target-overlay" role="dialog" aria-modal="true">
            <div className="target-panel">
              <div className="target-heading">
                <span>Alege jucator</span>
                <strong>
                  {shopItems.find(({ id }) => id === targetItemId)?.name ??
                    targetItemId}
                </strong>
              </div>

              <div className="target-list">
                {targetablePlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    className="target-player-button"
                    onClick={() => {
                      const used = activateInventoryItem(targetItemId, player.id);
                      if (used) {
                        setTargetItemId(null);
                      }
                    }}
                  >
                    <strong>{player.name}</strong>
                    <span>Camera {player.positionIndex + 1}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="secondary-button target-cancel-button"
                onClick={() => setTargetItemId(null)}
              >
                <span>Anuleaza</span>
              </button>
            </div>
          </div>
        ) : null}
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
    </main>
  );
}
