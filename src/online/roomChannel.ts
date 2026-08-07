import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import {
  openFreshChannel,
  roomSyncChannelName,
} from "./channelNames";
import { parseRoomEnvelope, type RoomEnvelope } from "./envelope";

export const ROOM_ENVELOPE_EVENT = "envelope";

export type SubscribeRoomEnvelopesInput = {
  roomId: string;
  onEnvelope: (envelope: RoomEnvelope) => void;
};

export type RoomEnvelopeHandle = {
  channel: RealtimeChannel;
  unsubscribe: () => Promise<void>;
};

export async function subscribeRoomEnvelopes(
  client: SupabaseClient,
  input: SubscribeRoomEnvelopesInput,
): Promise<RoomEnvelopeHandle> {
  const channelName = roomSyncChannelName(input.roomId);
  const channel: RealtimeChannel = await openFreshChannel(
    client,
    channelName,
    undefined,
    async (ch) => {
      ch.on(
        "broadcast",
        { event: ROOM_ENVELOPE_EVENT },
        (message: { payload?: unknown }) => {
          const envelope = parseRoomEnvelope(message.payload);
          if (envelope) {
            input.onEnvelope(envelope);
          }
        },
      );

      await new Promise<void>((resolve, reject) => {
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            resolve();
            return;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            reject(new Error(`Envelope subscribe failed: ${status}`));
          }
        });
      });
    },
  );

  return {
    channel,
    unsubscribe: async () => {
      await client.removeChannel(channel);
    },
  };
}

export async function broadcastRoomEnvelope(
  channel: RealtimeChannel,
  envelope: RoomEnvelope,
): Promise<void> {
  const status = await channel.send({
    type: "broadcast",
    event: ROOM_ENVELOPE_EVENT,
    payload: envelope,
  });
  if (status !== "ok") {
    throw new Error(`Envelope broadcast failed: ${String(status)}`);
  }
}
