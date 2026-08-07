import { ChevronDown, ChevronUp, MessageCircle, Send } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CHAT_BODY_MAX_LENGTH,
  CHAT_EMOJI,
  sendRoomMessage,
  subscribeRoomMessages,
  type ChatMessage,
  type RoomMessagesHandle,
} from "./chat";

type RoomChatProps = {
  client: SupabaseClient;
  roomId: string;
  deviceId: string;
  username: string;
};

export function RoomChat({
  client,
  roomId,
  deviceId,
  username,
}: RoomChatProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let handle: RoomMessagesHandle | null = null;

    void (async () => {
      try {
        const next = await subscribeRoomMessages(client, {
          roomId,
          onMessage: (message) => {
            if (!cancelled) {
              setMessages((prev) =>
                prev.some((entry) => entry.id === message.id)
                  ? prev
                  : [...prev, message],
              );
            }
          },
        });
        if (cancelled) {
          await next.unsubscribe();
          return;
        }
        handle = next;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Chatul a eșuat.");
        }
      }
    })();

    return () => {
      cancelled = true;
      void handle?.unsubscribe();
    };
  }, [client, roomId]);

  const send = async (body: string) => {
    const trimmed = body.trim();
    if (!trimmed || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const message = await sendRoomMessage(client, {
        roomId,
        deviceId,
        username,
        body: trimmed,
      });
      setMessages((prev) =>
        prev.some((entry) => entry.id === message.id)
          ? prev
          : [...prev, message],
      );
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trimiterea a eșuat.");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(draft);
  };

  return (
    <aside
      className={`online-room-chat${open ? " online-room-chat--open" : ""}`}
      aria-label="Chat cameră"
    >
      <button
        type="button"
        className="secondary-button online-room-chat-toggle"
        aria-expanded={open}
        aria-controls={`room-chat-panel-${roomId}`}
        onClick={() => setOpen((value) => !value)}
      >
        <MessageCircle aria-hidden="true" size={18} />
        <span>Chat</span>
        {open ? (
          <ChevronDown aria-hidden="true" size={16} />
        ) : (
          <ChevronUp aria-hidden="true" size={16} />
        )}
      </button>

      {open ? (
        <div
          id={`room-chat-panel-${roomId}`}
          className="online-room-chat-panel"
        >
          <ul className="online-room-chat-list" aria-label="Mesaje chat" aria-live="polite">
            {messages.length === 0 ? (
              <li className="online-lobby-empty">Niciun mesaj încă.</li>
            ) : (
              messages.map((message) => (
                <li key={message.id} className="online-room-chat-item">
                  <strong>{message.username}</strong>
                  <span>{message.body}</span>
                </li>
              ))
            )}
          </ul>

          <div
            className="online-room-chat-emoji"
            role="group"
            aria-label="Emoji rapide"
          >
            {CHAT_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="online-room-chat-emoji-btn"
                disabled={busy}
                onClick={() => void send(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>

          <form className="online-room-chat-form" onSubmit={onSubmit}>
            <label className="sr-only" htmlFor={`room-chat-${roomId}`}>
              Mesaj chat
            </label>
            <input
              id={`room-chat-${roomId}`}
              type="text"
              value={draft}
              maxLength={CHAT_BODY_MAX_LENGTH}
              disabled={busy}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Scrie un mesaj…"
            />
            <button
              type="submit"
              className="primary-button"
              disabled={busy || !draft.trim()}
              aria-label="Trimite"
            >
              <Send aria-hidden="true" size={16} />
              <span>Trimite</span>
            </button>
          </form>

          {error ? (
            <p
              className="online-entry-status online-entry-status--error"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
