import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const storage = new Map<string, string>();

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  storage.clear();
  const localStorage = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
  };

  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", {
    clearTimeout: globalThis.clearTimeout,
    localStorage,
    setTimeout: globalThis.setTimeout,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("space board store", () => {
  test("finishes globally on exact finish room and rematch starts without stale interactive state", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.2);

    const { finishRoomId } = await import("./rooms");
    const { mysteryCards } = await import("./mystery");
    const { createInitialShopStock } = await import("./shop");
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Winner",
          avatarId: "cat",
          controller: "player",
          positionIndex: finishRoomId - 3,
          coins: 20,
          lastDice: null,
          trapped: false,
          inventory: ["star", "dice-x2"],
        },
        {
          id: "player-2",
          name: "Spectator",
          avatarId: "dog",
          controller: "player",
          positionIndex: 10,
          coins: 4,
          lastDice: null,
          trapped: false,
          inventory: ["pistol"],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Finish turn",
      pendingMystery: null,
      pendingShop: null,
      pendingTrivia: null,
      rolling: false,
      shopStock: createInitialShopStock(),
      uiToast: null,
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    expect(useGameStore.getState()).toMatchObject({
      phase: "finished",
      currentPlayerIndex: 0,
      pendingMystery: null,
      pendingShop: null,
      pendingTrivia: null,
      rolling: false,
    });
    expect(useGameStore.getState().players[0].positionIndex + 1).toBe(
      finishRoomId,
    );

    useGameStore.setState({
      pendingMystery: {
        playerId: "player-1",
        roomId: 56,
        cards: mysteryCards.slice(0, 3),
        revealedCardId: null,
      },
      pendingShop: {
        playerId: "player-1",
        roomId: 53,
        purchased: false,
      },
      pendingTrivia: {
        playerId: "player-1",
        roomId: 50,
        question: {
          id: 1,
          question: "Q",
          options: [
            { answer: "Mercur", result: "correct" },
            { answer: "Venus", result: "wrong" },
          ],
        },
      },
    });

    const rollAfterFinish = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await rollAfterFinish;

    expect(useGameStore.getState().useInventoryItem("star")).toBe(false);
    expect(useGameStore.getState().buyShopItem("pistol")).toBe(false);
    expect(useGameStore.getState().pickMysteryCard(mysteryCards[0].id)).toBe(false);
    useGameStore.getState().answerTrivia("correct");

    expect(useGameStore.getState().players[0]).toMatchObject({
      coins: 20,
      inventory: ["star", "dice-x2"],
      positionIndex: 66,
    });
    expect(useGameStore.getState()).toMatchObject({
      phase: "finished",
      currentPlayerIndex: 0,
      pendingMystery: null,
      pendingShop: null,
      pendingTrivia: null,
    });

    useGameStore.setState({
      players: useGameStore.getState().players.map((player) =>
        player.id === "player-1"
          ? { ...player, trapped: true, coins: 99 }
          : player,
      ),
      shopStock: {
        ...useGameStore.getState().shopStock,
        pistol: false,
      },
    });

    useGameStore.getState().startGame([
      { name: "Nou", avatarId: "cat", controller: "player" },
      { name: "Robot", avatarId: "dog", controller: "ai" },
    ]);

    const rematchState = useGameStore.getState();

    expect(rematchState).toMatchObject({
      phase: "playing",
      currentPlayerIndex: 0,
      diceValue: null,
      pendingMystery: null,
      pendingShop: null,
      pendingTrivia: null,
      rolling: false,
    });
    expect(rematchState.players).toEqual([
      expect.objectContaining({
        name: "Nou",
        positionIndex: 0,
        coins: 0,
        trapped: false,
        inventory: [],
      }),
      expect.objectContaining({
        name: "Robot",
        positionIndex: 0,
        coins: 0,
        trapped: false,
        inventory: [],
      }),
    ]);
    expect(rematchState.shopStock.pistol).toBe(true);
  });

  test("rollDice does not emit intermediate positionIndex values", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
        {
          id: "player-2",
          name: "Next",
          avatarId: "dog",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Test turn",
      rolling: false,
      uiToast: null,
    });

    const seen: number[] = [];
    const unsub = useGameStore.subscribe((state) => {
      seen.push(state.players[0].positionIndex);
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(20_000);
    await roll;
    unsub();

    const unique = [...new Set(seen)];
    expect(unique.length).toBeLessThanOrEqual(2);
  });

  test("opens a shop overlay after landing in a shop room", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 11,
          coins: 4,
          lastDice: null,
          trapped: false,
        },
        {
          id: "player-2",
          name: "Next",
          avatarId: "dog",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Test turn",
      rolling: false,
      uiToast: null,
      pendingShop: null,
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const state = useGameStore.getState();

    expect(state.pendingShop).toMatchObject({
      playerId: "player-1",
      roomId: 13,
      purchased: false,
    });
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.rolling).toBe(false);
  });

  test("opens a mystery overlay after landing in a mystery room", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 15,
          coins: 4,
          lastDice: null,
          trapped: false,
        },
        {
          id: "player-2",
          name: "Next",
          avatarId: "dog",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Test turn",
      pendingMystery: null,
      pendingShop: null,
      pendingTrivia: null,
      rolling: false,
      uiToast: null,
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const state = useGameStore.getState();

    expect(state.players[0].positionIndex + 1).toBe(17);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.rolling).toBe(false);
    expect(state.pendingShop).toBeNull();
    expect(state.pendingTrivia).toBeNull();
    expect(state.pendingMystery).toMatchObject({
      playerId: "player-1",
      roomId: 17,
      revealedCardId: null,
      cards: [{ id: "magnet" }, { id: "wand" }, { id: "rocket" }],
    });
  });

  test("reveals a mystery card, applies coin effects, then ends the turn", async () => {
    const { mysteryCards } = await import("./mystery");
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 16,
          coins: 1,
          lastDice: 1,
          trapped: false,
        },
        {
          id: "player-2",
          name: "Next",
          avatarId: "dog",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 1,
      diceAnimating: false,
      message: "Mystery",
      pendingMystery: {
        playerId: "player-1",
        roomId: 17,
        cards: mysteryCards.filter(({ id }) =>
          ["phone", "card", "car"].includes(id),
        ),
        revealedCardId: null,
      },
      rolling: false,
      uiToast: null,
    });

    expect(useGameStore.getState().pickMysteryCard("phone")).toBe(true);

    expect(useGameStore.getState().players[0].coins).toBe(1);
    expect(useGameStore.getState().pendingMystery).toMatchObject({
      revealedCardId: "phone",
    });
    expect(useGameStore.getState().currentPlayerIndex).toBe(0);

    useGameStore.getState().acknowledgeMystery();

    expect(useGameStore.getState().players[0].coins).toBe(0);

    const state = useGameStore.getState();

    expect(state.uiToast).toMatchObject({
      title: "Apel intergalactic",
      coinsDelta: -1,
      tone: "loss",
    });
    expect(state.pendingMystery).toBeNull();
    expect(state.currentPlayerIndex).toBe(0);

    await vi.advanceTimersByTimeAsync(2_400);

    expect(useGameStore.getState().currentPlayerIndex).toBe(1);
    expect(useGameStore.getState().message).toContain("Randul lui Next");
  });

  test("re-checks portals and resolves the destination action after a mystery effect", async () => {
    const { mysteryCards } = await import("./mystery");
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 40,
          coins: 2,
          lastDice: 1,
          trapped: false,
        },
        {
          id: "player-2",
          name: "Ahead",
          avatarId: "dog",
          controller: "player",
          positionIndex: 44,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 1,
      diceAnimating: false,
      message: "Mystery",
      pendingMystery: {
        playerId: "player-1",
        roomId: 41,
        cards: mysteryCards.filter(({ id }) =>
          ["rocket", "card", "phone"].includes(id),
        ),
        revealedCardId: null,
      },
      rolling: false,
      uiToast: null,
    });

    expect(useGameStore.getState().pickMysteryCard("rocket")).toBe(true);

    expect(useGameStore.getState()).toMatchObject({
      pendingMystery: {
        revealedCardId: "rocket",
      },
    });

    useGameStore.getState().acknowledgeMystery();

    expect(useGameStore.getState()).toMatchObject({
      portalTransition: {
        playerId: "player-1",
        fromRoomId: 45,
        toRoomId: 38,
      },
    });

    const state = useGameStore.getState();

    expect(state.players[0].positionIndex + 1).toBe(38);
    expect(state.players[0].trapped).toBe(false);
    expect(state.pendingMystery).toBeNull();
    expect(state.pendingTrivia).toMatchObject({
      playerId: "player-1",
      roomId: 38,
    });
    expect(state.currentPlayerIndex).toBe(0);
  });

  test("does not let pending mystery act as a trap escape flow", async () => {
    const { mysteryCards } = await import("./mystery");
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 51,
          coins: 12,
          lastDice: null,
          trapped: true,
          inventory: ["cosmic-key"],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Mystery",
      pendingMystery: {
        playerId: "player-1",
        roomId: 56,
        cards: mysteryCards.slice(0, 3),
        revealedCardId: null,
      },
      rolling: false,
      uiToast: null,
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    expect(useGameStore.getState().useInventoryItem("cosmic-key")).toBe(false);
    expect(useGameStore.getState().players[0]).toMatchObject({
      coins: 12,
      trapped: true,
      inventory: ["cosmic-key"],
    });
    expect(useGameStore.getState().pendingMystery).not.toBeNull();
  });

  test("buys one in-stock item per shop visit and removes it from global stock", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 12,
          coins: 8,
          lastDice: null,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Shop",
      rolling: false,
      uiToast: null,
      pendingShop: {
        playerId: "player-1",
        roomId: 13,
        purchased: false,
      },
    });

    expect(useGameStore.getState().buyShopItem("dice-x2")).toBe(true);
    expect(useGameStore.getState().buyShopItem("coins-x3")).toBe(false);

    const state = useGameStore.getState();

    expect(state.players[0]).toMatchObject({
      coins: 3,
      inventory: ["dice-x2"],
    });
    expect(state.shopStock["dice-x2"]).toBe(false);
    expect(state.pendingShop).toMatchObject({ purchased: true });
    expect(state.uiToast).toMatchObject({
      coinsDelta: -5,
      tone: "loss",
    });
  });

  test("blocks purchases without enough coins, free inventory space, or stock", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 27,
          coins: 4,
          lastDice: null,
          trapped: false,
          inventory: ["pistol", "star", "bomb"],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Shop",
      rolling: false,
      uiToast: null,
      pendingShop: {
        playerId: "player-1",
        roomId: 28,
        purchased: false,
      },
      shopStock: {
        pistol: false,
        "dice-x2": true,
        "coins-x3": true,
        "trivia-cancel": true,
        claw: true,
        bomb: true,
        star: true,
        "cosmic-key": true,
        "swap-arrow": true,
      },
    });

    expect(useGameStore.getState().buyShopItem("pistol")).toBe(false);
    expect(useGameStore.getState().buyShopItem("dice-x2")).toBe(false);
    expect(useGameStore.getState().buyShopItem("swap-arrow")).toBe(false);

    expect(useGameStore.getState().players[0]).toMatchObject({
      coins: 4,
      inventory: ["pistol", "star", "bomb"],
    });
  });

  test("uses movement items and re-checks portals after position changes", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Active",
          avatarId: "cat",
          controller: "player",
          positionIndex: 26,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: ["star", "bomb"],
        },
        {
          id: "player-2",
          name: "Target",
          avatarId: "dog",
          controller: "player",
          positionIndex: 27,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: [],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 2,
      diceAnimating: false,
      message: "Items",
      rolling: false,
      uiToast: null,
      actionItemUsedThisTurn: false,
    });

    expect(useGameStore.getState().useInventoryItem("star")).toBe(true);
    expect(useGameStore.getState().useInventoryItem("bomb")).toBe(false);

    const state = useGameStore.getState();

    expect(state.players[0].positionIndex + 1).toBe(42);
    expect(state.players[0].inventory).toEqual(["bomb"]);
    expect(state.players[1].positionIndex + 1).toBe(28);
    expect(state.actionItemUsedThisTurn).toBe(true);
  });

  test("resolves destination actions after an inventory movement triggers a portal", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Active",
          avatarId: "cat",
          controller: "player",
          positionIndex: 26,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: ["star"],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 2,
      diceAnimating: false,
      message: "Items",
      rolling: false,
      uiToast: null,
      actionItemUsedThisTurn: false,
      pendingTrivia: null,
    });

    expect(useGameStore.getState().useInventoryItem("star")).toBe(true);

    const state = useGameStore.getState();

    expect(state.players[0].positionIndex + 1).toBe(42);
    expect(state.pendingTrivia).toMatchObject({
      playerId: "player-1",
      roomId: 42,
    });
    expect(state.portalTransition).toMatchObject({
      playerId: "player-1",
      fromRoomId: 35,
      toRoomId: 42,
    });
    expect(state.currentPlayerIndex).toBe(0);
  });

  test("re-checks portals after swapping positions with another player", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Active",
          avatarId: "cat",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: ["swap-arrow"],
        },
        {
          id: "player-2",
          name: "Target",
          avatarId: "dog",
          controller: "player",
          positionIndex: 21,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: [],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 2,
      diceAnimating: false,
      message: "Swap",
      rolling: false,
      uiToast: null,
      actionItemUsedThisTurn: false,
    });

    expect(useGameStore.getState().useInventoryItem("swap-arrow", "player-2")).toBe(
      true,
    );

    const state = useGameStore.getState();

    expect(state.players[0].positionIndex + 1).toBe(28);
    expect(state.players[1].positionIndex + 1).toBe(1);
  });

  test("does not use inventory items while a roll is in progress", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: ["dice-x2", "star"],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: true,
      message: "Rolling",
      rolling: true,
      uiToast: null,
    });

    expect(useGameStore.getState().useInventoryItem("dice-x2")).toBe(false);
    expect(useGameStore.getState().useInventoryItem("star")).toBe(false);

    const player = useGameStore.getState().players[0];

    expect(player.inventory).toEqual(["dice-x2", "star"]);
    expect(player.positionIndex + 1).toBe(1);
    expect(player.armedDiceX2).toBeFalsy();
  });

  test("arms x2 dice for the next roll and x3 coins for the next coins room only", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: ["dice-x2", "coins-x3"],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Buffs",
      rolling: false,
      uiToast: null,
    });

    expect(useGameStore.getState().useInventoryItem("dice-x2")).toBe(true);
    expect(useGameStore.getState().useInventoryItem("coins-x3")).toBe(true);

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const player = useGameStore.getState().players[0];

    expect(player.positionIndex + 1).toBe(3);
    expect(player.coins).toBe(6);
    expect(player.armedDiceX2).toBe(false);
    expect(player.armedCoinsX3).toBe(false);
  });

  test("keeps x3 armed through non-coin rooms until the next coins room", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 11,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: ["coins-x3"],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Buffs",
      pendingShop: null,
      rolling: false,
      uiToast: null,
    });

    expect(useGameStore.getState().useInventoryItem("coins-x3")).toBe(true);

    const shopRoll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await shopRoll;

    expect(useGameStore.getState().players[0]).toMatchObject({
      coins: 0,
      armedCoinsX3: true,
    });
    expect(useGameStore.getState().pendingShop).toMatchObject({
      roomId: 13,
    });

    useGameStore.getState().closeShop();

    const coinsRoll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await coinsRoll;

    const player = useGameStore.getState().players[0];

    expect(player.positionIndex + 1).toBe(14);
    expect(player.coins).toBe(6);
    expect(player.armedCoinsX3).toBe(false);
  });

  test("uses trivia cancel without consuming the action item slot", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 30,
          coins: 2,
          lastDice: null,
          trapped: false,
          inventory: ["trivia-cancel", "pistol"],
        },
        {
          id: "player-2",
          name: "Target",
          avatarId: "dog",
          controller: "player",
          positionIndex: 20,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: [],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 2,
      diceAnimating: false,
      message: "Trivia cancel",
      rolling: false,
      uiToast: null,
    });

    expect(useGameStore.getState().useInventoryItem("pistol", "player-2")).toBe(
      true,
    );

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const state = useGameStore.getState();

    expect(state.pendingTrivia).toBeNull();
    expect(state.players[0]).toMatchObject({
      coins: 2,
      inventory: [],
    });
    expect(state.players[1].positionIndex + 1).toBe(28);
  });

  test("uses a cosmic key to escape a blocked trap turn before paying coins", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 51,
          coins: 10,
          lastDice: null,
          trapped: true,
          inventory: ["cosmic-key"],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Trap",
      rolling: false,
      uiToast: null,
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const player = useGameStore.getState().players[0];

    expect(player.positionIndex + 1).toBe(53);
    expect(player.coins).toBe(10);
    expect(player.inventory).toEqual([]);
    expect(player.trapped).toBe(false);
  });

  test("lets AI buy one random affordable in-stock shop item", async () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9);

    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Robot",
          avatarId: "cat",
          controller: "ai",
          positionIndex: 11,
          coins: 6,
          lastDice: null,
          trapped: false,
          inventory: [],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "AI shop",
      rolling: false,
      uiToast: null,
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const state = useGameStore.getState();

    expect(state.pendingShop).toBeNull();
    expect(state.players[0].inventory).toEqual(["cosmic-key"]);
    expect(state.players[0].coins).toBe(0);
    expect(state.shopStock["cosmic-key"]).toBe(false);
  });

  test("checks portals after dice movement in the turn loop", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 20,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Test turn",
      rolling: false,
      uiToast: null,
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);

    expect(useGameStore.getState().pendingPortal).toMatchObject({
      playerId: "player-1",
      fromRoomId: 22,
      toRoomId: 28,
    });
    expect(useGameStore.getState().players[0].positionIndex).toBe(21);

    useGameStore.getState().acknowledgePortalTransition();

    await vi.advanceTimersByTimeAsync(3_000);
    await roll;

    const state = useGameStore.getState();
    const player = state.players[0];

    expect(player.positionIndex + 1).toBe(28);
    expect(player.coins).toBe(0);
    expect(state.pendingPortal).toBeNull();
    expect(state.portalTransition).toMatchObject({
      playerId: "player-1",
      fromRoomId: 22,
      toRoomId: 28,
    });
  });

  test("traps a player on their next turn after entering a trap room", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 50,
          coins: 4,
          lastDice: null,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Test turn",
      rolling: false,
      uiToast: null,
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const player = useGameStore.getState().players[0];

    expect(player.positionIndex + 1).toBe(52);
    expect(player.trapped).toBe(true);
  });

  test("lets a trapped player pay the escape cost at turn start and roll normally", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { trapEscapeCoinCost } = await import("./rooms");
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 51,
          coins: trapEscapeCoinCost,
          lastDice: null,
          trapped: true,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Test turn",
      rolling: false,
      uiToast: null,
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const player = useGameStore.getState().players[0];

    expect(player.positionIndex + 1).toBe(53);
    expect(player.coins).toBe(0);
    expect(player.lastDice).toBe(1);
    expect(player.trapped).toBe(false);
  });

  test("skips a trapped player's turn without rolling when they cannot pay", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { trapEscapeCoinCost } = await import("./rooms");
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 51,
          coins: trapEscapeCoinCost - 1,
          lastDice: null,
          trapped: true,
        },
        {
          id: "player-2",
          name: "Next",
          avatarId: "dog",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Test turn",
      rolling: false,
      uiToast: null,
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const state = useGameStore.getState();
    const player = state.players[0];

    expect(player.positionIndex + 1).toBe(52);
    expect(player.coins).toBe(trapEscapeCoinCost - 1);
    expect(player.lastDice).toBeNull();
    expect(player.trapped).toBe(false);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.diceValue).toBeNull();
  });

  test("opens trivia instead of ending the turn when landing on a trivia room", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 30,
          coins: 5,
          lastDice: null,
          trapped: false,
        },
        {
          id: "player-2",
          name: "Next",
          avatarId: "dog",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Test turn",
      rolling: false,
      uiToast: null,
      pendingTrivia: null,
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const state = useGameStore.getState();
    const player = state.players[0];

    expect(player.positionIndex + 1).toBe(32);
    expect(player.coins).toBe(5);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.rolling).toBe(false);
    expect(state.pendingTrivia).toMatchObject({
      playerId: "player-1",
      roomId: 32,
      question: {
        id: 1,
        options: [
          { answer: "Mercur", result: "correct" },
          { answer: "Venus", result: "wrong" },
        ],
      },
    });
  });

  test("answers trivia and returns to the normal turn end", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 31,
          coins: 5,
          lastDice: 1,
          trapped: false,
        },
        {
          id: "player-2",
          name: "Next",
          avatarId: "dog",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 1,
      diceAnimating: false,
      message: "Trivia",
      rolling: false,
      uiToast: null,
      pendingTrivia: {
        playerId: "player-1",
        roomId: 32,
        question: {
          id: 1,
          question: "Q",
          options: [
            { answer: "Mercur", result: "correct" },
            { answer: "Venus", result: "wrong" },
          ],
        },
      },
    });

    useGameStore.getState().answerTrivia("correct");

    const feedbackState = useGameStore.getState();

    expect(feedbackState.players[0].coins).toBe(6);
    expect(feedbackState.pendingTrivia).toMatchObject({
      result: {
        answer: "correct",
        coinsDelta: 1,
      },
    });
    expect(feedbackState.currentPlayerIndex).toBe(0);
    expect(feedbackState.message).toContain("primeste 1 coin");
    expect(feedbackState.uiToast).toBeNull();

    await vi.advanceTimersByTimeAsync(1_800);

    const afterModalState = useGameStore.getState();

    expect(afterModalState.pendingTrivia).toBeNull();
    expect(afterModalState.currentPlayerIndex).toBe(0);
    expect(afterModalState.uiToast).toMatchObject({
      title: "Raspuns corect",
      coinsDelta: 1,
    });

    await vi.advanceTimersByTimeAsync(2_400);

    const state = useGameStore.getState();

    expect(state.pendingTrivia).toBeNull();
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.message).toContain("Randul lui Next");
  });

  test("does not roll while a trivia question is pending", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 31,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Trivia",
      rolling: false,
      uiToast: null,
      pendingTrivia: {
        playerId: "player-1",
        roomId: 32,
        question: {
          id: 1,
          question: "Q",
          options: [
            { answer: "Mercur", result: "correct" },
            { answer: "Venus", result: "wrong" },
          ],
        },
      },
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const state = useGameStore.getState();

    expect(state.players[0].positionIndex + 1).toBe(32);
    expect(state.diceValue).toBeNull();
    expect(state.pendingTrivia).not.toBeNull();
  });
});
