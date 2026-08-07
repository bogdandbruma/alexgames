export type RoomEnvelopeKind = "action" | "state" | "ui_event";

export type RoomEnvelope = {
  v: 1;
  game_slug: string;
  kind: RoomEnvelopeKind;
  room_id: string;
  sent_at: string;
  sender_device_id?: string;
  /** Opaque to platform; interpreted only by the game client for game_slug */
  payload: unknown;
};

export type CreateRoomEnvelopeInput = {
  gameSlug: string;
  kind: RoomEnvelopeKind;
  roomId: string;
  payload: unknown;
  sentAt?: string;
  senderDeviceId?: string;
};

const KINDS = new Set<RoomEnvelopeKind>(["action", "state", "ui_event"]);

export function createRoomEnvelope(
  input: CreateRoomEnvelopeInput,
): RoomEnvelope {
  const envelope: RoomEnvelope = {
    v: 1,
    game_slug: input.gameSlug,
    kind: input.kind,
    room_id: input.roomId,
    sent_at: input.sentAt ?? new Date().toISOString(),
    payload: input.payload,
  };
  if (input.senderDeviceId !== undefined) {
    envelope.sender_device_id = input.senderDeviceId;
  }
  return envelope;
}

export function isRoomEnvelope(value: unknown): value is RoomEnvelope {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<RoomEnvelope>;
  return (
    candidate.v === 1 &&
    typeof candidate.game_slug === "string" &&
    typeof candidate.kind === "string" &&
    KINDS.has(candidate.kind as RoomEnvelopeKind) &&
    typeof candidate.room_id === "string" &&
    typeof candidate.sent_at === "string" &&
    "payload" in candidate &&
    (candidate.sender_device_id === undefined ||
      typeof candidate.sender_device_id === "string")
  );
}

export function parseRoomEnvelope(value: unknown): RoomEnvelope | null {
  return isRoomEnvelope(value) ? value : null;
}
