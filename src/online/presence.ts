import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import {
  openFreshChannel,
  roomPresenceChannelName,
} from "./channelNames";
import type { MemberRole } from "./rooms";

export type PresenceMember = {
  deviceId: string;
  displayName: string;
  role: MemberRole;
};

export type SubscribeRoomPresenceInput = {
  roomId: string;
  self: PresenceMember;
  onSync: (members: PresenceMember[]) => void;
};

export type RoomPresenceHandle = {
  unsubscribe: () => Promise<void>;
};

type PresencePayload = {
  device_id: string;
  display_name: string;
  role: MemberRole;
};

function mapPresenceState(
  state: Record<string, PresencePayload[]>,
): PresenceMember[] {
  const seen = new Set<string>();
  const members: PresenceMember[] = [];
  for (const presets of Object.values(state)) {
    for (const entry of presets) {
      if (!entry?.device_id || seen.has(entry.device_id)) {
        continue;
      }
      seen.add(entry.device_id);
      members.push({
        deviceId: entry.device_id,
        displayName: entry.display_name,
        role: entry.role,
      });
    }
  }
  return members;
}

export async function subscribeRoomPresence(
  client: SupabaseClient,
  input: SubscribeRoomPresenceInput,
): Promise<RoomPresenceHandle> {
  const channelName = roomPresenceChannelName(input.roomId);
  const channel: RealtimeChannel = await openFreshChannel(
    client,
    channelName,
    {
      config: {
        presence: {
          key: input.self.deviceId,
        },
      },
    },
    async (ch) => {
      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState() as Record<string, PresencePayload[]>;
        input.onSync(mapPresenceState(state));
      });

      await new Promise<void>((resolve, reject) => {
        ch.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            try {
              await ch.track({
                device_id: input.self.deviceId,
                display_name: input.self.displayName,
                role: input.self.role,
              } satisfies PresencePayload);
              resolve();
            } catch (error) {
              reject(error);
            }
            return;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            reject(new Error(`Presence subscribe failed: ${status}`));
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
