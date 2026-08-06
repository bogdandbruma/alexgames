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
      pendingEvent: null,
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
      pendingEvent: null,
      rolling: false,
    });
    expect(useGameStore.getState().players[0].positionIndex + 1).toBe(
      finishRoomId,
    );

    useGameStore.setState({
      pendingEvent: {
        type: "trivia",
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
        result: null,
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
      pendingEvent: null,
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
      pendingEvent: null,
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
      pendingEvent: null,
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const state = useGameStore.getState();

    expect(state.pendingEvent).toMatchObject({
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
      pendingEvent: null,
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
    expect(state.pendingEvent).toMatchObject({
      type: "mystery",
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
      pendingEvent: {
      type: "mystery",
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
    expect(useGameStore.getState().pendingEvent).toMatchObject({
      revealedCardId: "phone",
    });
    expect(useGameStore.getState().currentPlayerIndex).toBe(0);

    const acknowledge = useGameStore.getState().acknowledgeMystery();

    await Promise.resolve();

    expect(useGameStore.getState().players[0].coins).toBe(0);

    const state = useGameStore.getState();

    expect(state.uiToast).toMatchObject({
      title: "Apel intergalactic",
      coinsDelta: -1,
      tone: "loss",
    });
    expect(state.pendingEvent).toBeNull();
    expect(state.currentPlayerIndex).toBe(0);

    await vi.advanceTimersByTimeAsync(2_400);
    await acknowledge;

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
      pendingEvent: {
      type: "mystery",
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
      pendingEvent: {
      type: "mystery",
        revealedCardId: "rocket",
      },
    });

    const acknowledge = useGameStore.getState().acknowledgeMystery();

    await vi.advanceTimersByTimeAsync(15_000);
    await acknowledge;

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
    expect(state.pendingEvent).toMatchObject({
      type: "trivia",
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
      pendingEvent: {
      type: "mystery",
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
    expect(useGameStore.getState().pendingEvent).not.toBeNull();
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
      pendingEvent: {
      type: "shop",
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
    expect(state.pendingEvent).toMatchObject({ purchased: true });
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
      pendingEvent: {
      type: "shop",
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

  test("keeps the turn open after rolling when the player can still use an action item", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

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
          inventory: ["claw"],
        },
        {
          id: "player-2",
          name: "Target",
          avatarId: "dog",
          controller: "player",
          positionIndex: 5,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: [],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      message: "Items",
      rolling: false,
      uiToast: null,
      actionItemUsedThisTurn: false,
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const afterRoll = useGameStore.getState();

    expect(afterRoll.currentPlayerIndex).toBe(0);
    expect(afterRoll.diceValue).toBe(1);
    expect(afterRoll.message).toMatch(/inventar/i);

    expect(
      useGameStore.getState().useInventoryItem("claw", "player-2"),
    ).toBe(true);

    useGameStore.getState().endTurn();

    expect(useGameStore.getState().currentPlayerIndex).toBe(1);
    expect(useGameStore.getState().diceValue).toBeNull();
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
      pendingEvent: null,
    });

    expect(useGameStore.getState().useInventoryItem("star")).toBe(true);

    await vi.advanceTimersByTimeAsync(15_000);

    const state = useGameStore.getState();

    expect(state.players[0].positionIndex + 1).toBe(42);
    expect(state.pendingEvent).toMatchObject({
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
      pendingEvent: null,
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
    expect(useGameStore.getState().pendingEvent).toMatchObject({
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

    expect(state.pendingEvent).toBeNull();
    expect(state.players[0]).toMatchObject({
      coins: 2,
      inventory: [],
    });
    expect(state.players[1].positionIndex + 1).toBe(28);
  });

  test("opens a trap pending event instead of auto-escaping with a cosmic key", async () => {
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
      pendingEvent: null,
      uiToast: null,
    });

    await useGameStore.getState().rollDice();

    const state = useGameStore.getState();
    const player = state.players[0];

    expect(state.pendingEvent).toMatchObject({
      type: "trap",
      playerId: "player-1",
      roomId: 52,
    });
    expect(player.coins).toBe(10);
    expect(player.inventory).toEqual(["cosmic-key"]);
    expect(player.trapped).toBe(true);
    expect(player.lastDice).toBeNull();
  });

  test("lets a trapped player escape with a cosmic key from the trap modal", async () => {
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
      pendingEvent: {
        type: "trap",
        playerId: "player-1",
        roomId: 52,
      },
      uiToast: null,
    });

    expect(useGameStore.getState().resolveTrap("key")).toBe(true);

    const afterEscape = useGameStore.getState();
    expect(afterEscape.pendingEvent).toBeNull();
    expect(afterEscape.players[0].trapped).toBe(false);
    expect(afterEscape.players[0].inventory).toEqual([]);
    expect(afterEscape.players[0].coins).toBe(10);

    const roll = useGameStore.getState().rollDice();
    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const player = useGameStore.getState().players[0];
    expect(player.positionIndex + 1).toBe(53);
    expect(player.lastDice).toBe(1);
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

    expect(state.pendingEvent).toBeNull();
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

    expect(useGameStore.getState().pendingEvent).toMatchObject({
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
    expect(state.pendingEvent).toMatchObject({
      type: "shop",
      playerId: "player-1",
      roomId: 28,
      purchased: false,
    });
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

  test("lets a trapped player pay the escape cost from the trap modal and roll", async () => {
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
      pendingEvent: {
        type: "trap",
        playerId: "player-1",
        roomId: 52,
      },
      uiToast: null,
    });

    expect(useGameStore.getState().resolveTrap("pay")).toBe(true);

    const afterPay = useGameStore.getState();
    expect(afterPay.pendingEvent).toBeNull();
    expect(afterPay.players[0].coins).toBe(0);
    expect(afterPay.players[0].trapped).toBe(false);
    expect(afterPay.currentPlayerIndex).toBe(0);

    const roll = useGameStore.getState().rollDice();
    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const player = useGameStore.getState().players[0];
    expect(player.positionIndex + 1).toBe(53);
    expect(player.lastDice).toBe(1);
  });

  test("lets a trapped player stay one turn from the trap modal", async () => {
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
      pendingEvent: {
        type: "trap",
        playerId: "player-1",
        roomId: 52,
      },
      uiToast: null,
    });

    expect(useGameStore.getState().resolveTrap("stay")).toBe(true);

    const state = useGameStore.getState();
    const player = state.players[0];

    expect(player.positionIndex + 1).toBe(52);
    expect(player.coins).toBe(trapEscapeCoinCost - 1);
    expect(player.lastDice).toBeNull();
    expect(player.trapped).toBe(false);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.pendingEvent).toBeNull();
    expect(state.diceValue).toBeNull();
  });

  test("opens a trap pending event when turn advances to a trapped player", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Tester",
          avatarId: "cat",
          controller: "player",
          positionIndex: 3,
          coins: 0,
          lastDice: 2,
          trapped: false,
        },
        {
          id: "player-2",
          name: "Trapped",
          avatarId: "dog",
          controller: "player",
          positionIndex: 51,
          coins: 0,
          lastDice: null,
          trapped: true,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 2,
      diceAnimating: false,
      message: "End turn",
      rolling: false,
      pendingEvent: null,
      uiToast: null,
    });

    useGameStore.getState().endTurn();

    const state = useGameStore.getState();
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.pendingEvent).toMatchObject({
      type: "trap",
      playerId: "player-2",
      roomId: 52,
    });
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
      pendingEvent: null,
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
    expect(state.pendingEvent).toMatchObject({
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
      pendingEvent: {
        type: "trivia",
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
        result: null,
      },
    });

    useGameStore.getState().answerTrivia("correct");

    const feedbackState = useGameStore.getState();

    expect(feedbackState.players[0].coins).toBe(6);
    expect(feedbackState.pendingEvent).toMatchObject({
      type: "trivia",
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

    expect(afterModalState.pendingEvent).toBeNull();
    expect(afterModalState.currentPlayerIndex).toBe(0);
    expect(afterModalState.uiToast).toMatchObject({
      title: "Raspuns corect",
      coinsDelta: 1,
    });

    await vi.advanceTimersByTimeAsync(2_400);

    const state = useGameStore.getState();

    expect(state.pendingEvent).toBeNull();
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.diceValue).toBeNull();
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
      pendingEvent: {
        type: "trivia",
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
        result: null,
      },
    });

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const state = useGameStore.getState();

    expect(state.players[0].positionIndex + 1).toBe(32);
    expect(state.diceValue).toBeNull();
    expect(state.pendingEvent).not.toBeNull();
  });
});
