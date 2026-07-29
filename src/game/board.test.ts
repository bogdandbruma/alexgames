import { describe, expect, test } from "vitest";
import { portalConnections, roomConnections, rooms } from "./board";
import { gameplayRooms } from "./rooms";

const roomById = new Map(rooms.map((room) => [room.id, room]));
const connectionPairs = new Set(
  roomConnections.map(
    ({ fromRoomId, toRoomId }) => `${fromRoomId}->${toRoomId}`,
  ),
);

function expectRoomsInBand(
  roomIds: number[],
  band: { maxX: number; maxZ: number; minX: number; minZ: number },
) {
  for (const roomId of roomIds) {
    const room = roomById.get(roomId);

    expect(room, `room ${roomId} exists`).toBeDefined();

    const [x, , z] = room?.position ?? [Number.NaN, 0, Number.NaN];

    expect(x, `room ${roomId} x`).toBeGreaterThanOrEqual(band.minX);
    expect(x, `room ${roomId} x`).toBeLessThanOrEqual(band.maxX);
    expect(z, `room ${roomId} z`).toBeGreaterThanOrEqual(band.minZ);
    expect(z, `room ${roomId} z`).toBeLessThanOrEqual(band.maxZ);
  }
}

describe("space board visual layout", () => {
  test("places every gameplay room on three spaced islands with sequential orthogonal hallways", () => {
    expect(rooms).toHaveLength(gameplayRooms.length);
    expect(roomConnections).toHaveLength(rooms.length - 1);

    const distinctPositions = new Set(
      rooms.map(({ position }) => position.map((value) => value.toFixed(2)).join(":")),
    );

    expect(distinctPositions).toHaveLength(gameplayRooms.length);

    expectRoomsInBand(
      Array.from({ length: 28 }, (_, index) => index + 1),
      { minX: -30, maxX: 30, minZ: -18, maxZ: 30 },
    );
    expectRoomsInBand(Array.from({ length: 22 }, (_, index) => index + 29), {
      minX: 42,
      maxX: 102,
      minZ: -18,
      maxZ: 18,
    });
    expectRoomsInBand(Array.from({ length: 17 }, (_, index) => index + 51), {
      minX: 42,
      maxX: 102,
      minZ: 42,
      maxZ: 66,
    });

    expect(Array.from(connectionPairs)).toEqual(
      Array.from({ length: 66 }, (_, index) => `${index + 1}->${index + 2}`),
    );

    expect(connectionPairs.has("22->28")).toBe(false);
    expect(connectionPairs.has("35->42")).toBe(false);
    expect(connectionPairs.has("45->38")).toBe(false);
    expect(connectionPairs.has("60->50")).toBe(false);

    expect(
      portalConnections.map(
        ({ fromRoomId, toRoomId }) => `${fromRoomId}->${toRoomId}`,
      ),
    ).toEqual(["22->28", "35->42", "45->38", "60->50"]);

    for (const connection of roomConnections) {
      for (let index = 0; index < connection.points.length - 1; index += 1) {
        const from = connection.points[index];
        const to = connection.points[index + 1];

        expect(
          from[0] === to[0] || from[2] === to[2],
          `${connection.fromRoomId}->${connection.toRoomId} segment ${index} is orthogonal`,
        ).toBe(true);
      }
    }
  });

  test("routes room 46 to 47 down and left into room 47", () => {
    const connection = roomConnections.find(
      ({ fromRoomId, toRoomId }) => fromRoomId === 46 && toRoomId === 47,
    );

    expect(connection, "46->47 connection exists").toBeDefined();
    expect(connection?.fromDirection).toBe("south");
    expect(connection?.toDirection).toBe("east");

    const points = connection?.points ?? [];
    expect(points.length).toBeGreaterThanOrEqual(2);

    const first = points[0];
    const firstTurn = points.find((point) => point[0] !== first[0]);
    const last = points[points.length - 1];
    const previous = points[points.length - 2];

    expect(firstTurn, "46->47 turns left after going down").toBeDefined();
    if (!firstTurn || !last || !previous) {
      throw new Error("46->47 route did not include all expected points.");
    }

    expect(firstTurn[2]).toBeGreaterThan(first[2]);
    expect(firstTurn[0]).toBeLessThan(first[0]);
    expect(last[2]).toBe(previous[2]);
    expect(last[0]).toBeLessThan(previous[0]);
  });

  test("routes room 28 right, up beside rooms 19, 18, and 7, then under room 29", () => {
    const connection = roomConnections.find(
      ({ fromRoomId, toRoomId }) => fromRoomId === 28 && toRoomId === 29,
    );

    expect(connection, "28->29 connection exists").toBeDefined();
    expect(connection?.fromDirection).toBe("east");
    expect(connection?.toDirection).toBe("south");

    const points = connection?.points ?? [];
    expect(points.length).toBe(4);

    const [from, rightTurn, upperTurn, to] = points;
    if (!from || !rightTurn || !upperTurn || !to) {
      throw new Error("28->29 route did not include all expected points.");
    }

    expect(rightTurn[0]).toBeGreaterThan(from[0]);
    expect(rightTurn[2]).toBe(from[2]);
    expect(upperTurn[0]).toBe(rightTurn[0]);
    expect(upperTurn[2]).toBeLessThan(rightTurn[2]);
    expect(to[2]).toBe(upperTurn[2]);
    expect(to[0]).toBeGreaterThan(upperTurn[0]);

    for (const roomId of [19, 18, 7]) {
      const room = roomById.get(roomId);

      expect(room, `room ${roomId} exists`).toBeDefined();
      expect(upperTurn[0], `28->29 vertical route is beside room ${roomId}`).toBeGreaterThan(
        room?.position[0] ?? Number.POSITIVE_INFINITY,
      );
    }
  });
});
