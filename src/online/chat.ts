import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import {
  openFreshChannel,
  roomMessagesChannelName,
} from "./channelNames";

export const CHAT_BODY_MAX_LENGTH = 200;

/** Fixed emoji set for room chat picker (text + emoji only). */
export const CHAT_EMOJI = [
  "👍",
  "👎",
  "😂",
  "❤️",
  "🎉",
  "🚀",
  "👀",
  "🔥",
] as const;

export type ChatMessage = {
  id: string;
  roomId: string;
  deviceId: string;
  username: string;
  body: string;
  createdAt: string;
};

export type SendRoomMessageInput = {
  roomId: string;
  deviceId: string;
  username: string;
  body: string;
};

export type SubscribeRoomMessagesInput = {
  roomId: string;
  onMessage: (message: ChatMessage) => void;
};

export type RoomMessagesHandle = {
  unsubscribe: () => Promise<void>;
};

type MessageRow = {
  id: string;
  room_id: string;
  device_id: string;
  username: string;
  body: string;
  created_at: string;
};

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    deviceId: row.device_id,
    username: row.username,
    body: row.body,
    createdAt: row.created_at,
  };
}

function throwIfError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export function normalizeChatBody(body: string): string {
  return body.trim().slice(0, CHAT_BODY_MAX_LENGTH);
}

export async function sendRoomMessage(
  client: SupabaseClient,
  input: SendRoomMessageInput,
): Promise<ChatMessage> {
  const body = normalizeChatBody(input.body);
  if (!body) {
    throw new Error("Chat body is empty");
  }

  const { data, error } = await client
    .from("room_messages")
    .insert({
      room_id: input.roomId,
      device_id: input.deviceId,
      username: input.username,
      body,
    })
    .select(
      "id, room_id, device_id, username, body, created_at",
    )
    .single();

  throwIfError(error);
  return mapMessage(data as MessageRow);
}

/**
 * Live INSERT subscription only — never selects history.
 * UI is session-ephemeral: messages appear only after this subscribe.
 */
export async function subscribeRoomMessages(
  client: SupabaseClient,
  input: SubscribeRoomMessagesInput,
): Promise<RoomMessagesHandle> {
  const channelName = roomMessagesChannelName(input.roomId);
  const channel: RealtimeChannel = await openFreshChannel(
    client,
    channelName,
    undefined,
    async (ch) => {
      ch.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_messages",
          filter: `room_id=eq.${input.roomId}`,
        },
        (payload: { new: MessageRow }) => {
          const row = payload.new;
          if (!row?.id || !row.room_id) {
            return;
          }
          input.onMessage(mapMessage(row));
        },
      );

      await new Promise<void>((resolve, reject) => {
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            resolve();
            return;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            reject(new Error(`Chat subscribe failed: ${status}`));
          }
        });
      });
    },
  );

  return {
    unsubscribe: async () => {
      await client.removeChannel(channel);
    },
  };
}
