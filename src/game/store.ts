import { create } from "zustand";
import { persist } from "zustand/middleware";
import { rooms } from "./board";

export type AvatarId = "cat" | "dog" | "bunny";
export type PlayerController = "player" | "ai";
export type GamePhase = "setup" | "playing" | "finished";

export type PlayerSetup = {
  name: string;
  avatarId: AvatarId;
  controller: PlayerController;
};

export type GamePlayer = PlayerSetup & {
  id: string;
  positionIndex: number;
  lastDice: number | null;
};

export type GameToast = {
  id: number;
  title: string;
  description: string;
  tone: "player" | "room" | "win";
};

type PersistedState = {
  phase: GamePhase;
  players: GamePlayer[];
  currentPlayerIndex: number;
  diceValue: number | null;
  message: string;
};

type GameState = PersistedState & {
  diceAnimating: boolean;
  rolling: boolean;
  uiToast: GameToast | null;
  startGame: (players: PlayerSetup[]) => void;
  rollDice: () => Promise<void>;
  resetGame: () => void;
};

const defaultPlayers: GamePlayer[] = [
  {
    id: "player-1",
    name: "Player 1",
    avatarId: "cat",
    controller: "player",
    positionIndex: 0,
    lastDice: null,
  },
];

const initialPersistedState: PersistedState = {
  phase: "setup",
  players: defaultPlayers,
  currentPlayerIndex: 0,
  diceValue: null,
  message: "Choose players, pets, and start the game.",
};

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

const getNextPlayerIndex = (players: GamePlayer[], currentIndex: number) =>
  (currentIndex + 1) % players.length;

const getPlayerName = (player: GamePlayer | undefined) =>
  player?.name.trim() || "Player";

let toastId = 0;

const createTurnToast = (player: GamePlayer | undefined): GameToast => ({
  id: (toastId += 1),
  title: "Urmeaza jucatorul",
  description: getPlayerName(player),
  tone: "player",
});

const createRoomToast = (
  player: GamePlayer | undefined,
  roomIndex: number,
  tone: GameToast["tone"] = "room",
): GameToast => {
  const room = rooms[roomIndex];

  return {
    id: (toastId += 1),
    title: `Camera ${room.id}`,
    description: `${getPlayerName(player)} a ajuns la ${room.name}.`,
    tone,
  };
};

const normalizePlayerSetup = (
  player: PlayerSetup,
  index: number,
): GamePlayer => ({
  id: `player-${index + 1}`,
  name: player.name.trim() || `Player ${index + 1}`,
  avatarId: player.avatarId,
  controller: player.controller,
  positionIndex: 0,
  lastDice: null,
});

const migratePersistedState = (persistedState: unknown): PersistedState => {
  if (
    typeof persistedState === "object" &&
    persistedState !== null &&
    "players" in persistedState &&
    Array.isArray((persistedState as Partial<PersistedState>).players)
  ) {
    return persistedState as PersistedState;
  }

  return initialPersistedState;
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialPersistedState,
      diceAnimating: false,
      rolling: false,
      uiToast: null,

      startGame: (playerSetups) => {
        if (get().rolling) {
          return;
        }

        const players = playerSetups.slice(0, 4).map(normalizePlayerSetup);
        const playablePlayers = players.length > 0 ? players : defaultPlayers;
        const firstPlayer = playablePlayers[0];

        set({
          phase: "playing",
          players: playablePlayers,
          currentPlayerIndex: 0,
          diceValue: null,
          diceAnimating: false,
          rolling: false,
          message: `Turn: ${getPlayerName(firstPlayer)}.`,
          uiToast: createTurnToast(firstPlayer),
        });
      },

      rollDice: async () => {
        const currentState = get();
        const currentPlayer =
          currentState.players[currentState.currentPlayerIndex];

        if (
          currentState.rolling ||
          currentState.phase !== "playing" ||
          !currentPlayer ||
          currentPlayer.positionIndex === rooms.length - 1
        ) {
          return;
        }

        set({
          rolling: true,
          diceAnimating: true,
          message: `${getPlayerName(currentPlayer)} rolls the dice...`,
        });

        await sleep(1_400);

        const diceValue = Math.floor(Math.random() * 6) + 1;
        const startingIndex = get().players[currentState.currentPlayerIndex]
          ?.positionIndex ?? currentPlayer.positionIndex;
        const landingIndex = Math.min(
          startingIndex + diceValue,
          rooms.length - 1,
        );

        set((state) => ({
          diceValue,
          diceAnimating: false,
          players: state.players.map((player) =>
            player.id === currentPlayer.id
              ? { ...player, lastDice: diceValue }
              : player,
          ),
          message: `${getPlayerName(currentPlayer)} rolled ${diceValue}.`,
        }));

        await sleep(1_100);

        for (
          let nextIndex = startingIndex + 1;
          nextIndex <= landingIndex;
          nextIndex += 1
        ) {
          await sleep(1_560);
          set((state) => ({
            players: state.players.map((player) =>
              player.id === currentPlayer.id
                ? { ...player, positionIndex: nextIndex }
                : player,
            ),
          }));
        }

        const landedRoom = rooms[landingIndex];

        if (landingIndex === rooms.length - 1) {
          set({
            phase: "finished",
            rolling: false,
            message: `${getPlayerName(currentPlayer)} reached ${landedRoom.name} and wins.`,
            uiToast: createRoomToast(currentPlayer, landingIndex, "win"),
          });

          return;
        }

        let message = `${getPlayerName(currentPlayer)} arrived at ${landedRoom.name}.`;
        set({ uiToast: createRoomToast(currentPlayer, landingIndex) });

        const roomEffect = landedRoom.effect;

        if (roomEffect) {
          message = roomEffect.message;
          set({ message });

          await sleep(2_000);

          set((state) => ({
            players: state.players.map((player) =>
              player.id === currentPlayer.id
                ? { ...player, positionIndex: roomEffect.toIndex }
                : player,
            ),
            uiToast: createRoomToast(currentPlayer, roomEffect.toIndex),
          }));
        }

        await sleep(2_400);

        set((state) => {
          const nextPlayerIndex = getNextPlayerIndex(
            state.players,
            state.currentPlayerIndex,
          );
          const nextPlayer = state.players[nextPlayerIndex];

          return {
            rolling: false,
            currentPlayerIndex: nextPlayerIndex,
            message: `${message} Turn: ${getPlayerName(nextPlayer)}.`,
            uiToast: createTurnToast(nextPlayer),
          };
        });
      },

      resetGame: () => {
        set({
          ...initialPersistedState,
          diceAnimating: false,
          rolling: false,
          uiToast: null,
        });
      },
    }),
    {
      name: "space-board-demo",
      version: 2,
      migrate: migratePersistedState,
      partialize: (state): PersistedState => ({
        phase: state.phase,
        players: state.players,
        currentPlayerIndex: state.currentPlayerIndex,
        diceValue: state.diceValue,
        message: state.message,
      }),
    },
  ),
);
