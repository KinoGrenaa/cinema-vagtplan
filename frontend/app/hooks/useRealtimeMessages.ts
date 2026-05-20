"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

type UseRealtimeMessagesProps = {
  onNewMessage?: () => void;
  onMessageRead?: () => void;
  onMessageArchived?: () => void;
  onMessagesUpdated?: () => void;
  onMessageRecalled?: () => void;
};

export function useRealtimeMessages({
  onNewMessage,
  onMessageRead,
  onMessageArchived,
  onMessagesUpdated,
  onMessageRecalled,
}: UseRealtimeMessagesProps) {
  useEffect(() => {
    if (!socket) {
      socket = io("http://127.0.0.1:3001", {
        transports: ["websocket"],
        });
    }

    if (onNewMessage) {
      socket.on("newMessage", onNewMessage);
    }

    if (onMessageRead) {
      socket.on("messageRead", onMessageRead);
    }

    if (onMessageArchived) {
      socket.on("messageArchived", onMessageArchived);
    }

    if (onMessagesUpdated) {
      socket.on("messagesUpdated", onMessagesUpdated);
    }

    if (onMessageRecalled) {
      socket.on("messageRecalled", onMessageRecalled);
    }

    return () => {
      if (onNewMessage) {
        socket?.off("newMessage", onNewMessage);
      }

      if (onMessageRead) {
        socket?.off("messageRead", onMessageRead);
      }

      if (onMessageArchived) {
        socket?.off(
          "messageArchived",
          onMessageArchived
        );
      }

      if (onMessagesUpdated) {
        socket?.off(
          "messagesUpdated",
          onMessagesUpdated
        );
      }

      if (onMessageRecalled) {
        socket?.off(
          "messageRecalled",
          onMessageRecalled
        );
      }
    };
  }, [
    onNewMessage,
    onMessageRead,
    onMessageArchived,
    onMessagesUpdated,
    onMessageRecalled,
  ]);
}