"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  io,
  type Socket,
} from "socket.io-client";

import { useAuth } from "../providers/AuthProvider";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";
const MASTER_SELECTED_CINEMA_ID_KEY =
  "masterSelectedCinemaId";

export type RealtimeShiftTradePayload = {
  acceptedByUserId?:
    | number
    | string
    | null;
  offeredByUserId?:
    | number
    | string
    | null;
  rejectedByUserId?:
    | number
    | string
    | null;
  targetUserId?:
    | number
    | string
    | null;
  shift?: {
    startTime?: string;
    endTime?: string;
    jobFunction?: {
      name?: string;
    };
  } | null;
  offeredByUser?: {
    firstName: string;
    lastName: string;
  } | null;
  rejectedByUser?: {
    firstName: string;
    lastName: string;
  } | null;
};

type RealtimeUser = {
  id: number | string;
  role?: string | null;
  cinemaId?:
    | number
    | string
    | null;
};

type UseRealtimeCoreInput = {
  enabled?: boolean;
  onLeaveRequestUpdated?: () => void;
  onShiftUpdated?: () => void;
  onShiftTradeUpdated?: () => void;
  onMovieShowingUpdated?: () => void;
  onNotification?: () => void;
  onMessage?: () => void;
  onTimeEntry?: () => void;
  onStaffingRequestUpdated?: () => void;
  onShiftAccepted?: (
    payload: RealtimeShiftTradePayload,
  ) => void;
  onNewShiftTrade?: (
    payload: RealtimeShiftTradePayload,
  ) => void;
  onNewDirectShiftTrade?: (
    payload: RealtimeShiftTradePayload,
  ) => void;
  onShiftRejected?: (
    payload: RealtimeShiftTradePayload,
  ) => void;
};

let sharedSocket: Socket | null = null;
let sharedSocketKey: string | null =
  null;
let sharedConsumerCount = 0;
let pendingDisconnectTimer:
  | ReturnType<typeof setTimeout>
  | null = null;

function readSelectedMasterCinemaId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(
    MASTER_SELECTED_CINEMA_ID_KEY,
  );
}

function resolveRealtimeCinemaId(
  user: RealtimeUser,
  selectedMasterCinemaId:
    | string
    | null,
) {
  const userCinemaId = Number(
    user.cinemaId,
  );

  if (
    Number.isFinite(userCinemaId) &&
    userCinemaId > 0
  ) {
    return userCinemaId;
  }

  if (user.role !== "MASTER") {
    return null;
  }

  const selectedCinemaId = Number(
    selectedMasterCinemaId,
  );

  if (
    Number.isFinite(
      selectedCinemaId,
    ) &&
    selectedCinemaId > 0
  ) {
    return selectedCinemaId;
  }

  return null;
}

function getSharedSocketKey(
  token: string,
  user: RealtimeUser,
  cinemaId: number | null,
) {
  return `${token}:${user.id}:${
    cinemaId ?? "no-cinema"
  }`;
}

function closeSharedSocket() {
  if (!sharedSocket) {
    return;
  }

  sharedSocket.removeAllListeners();
  sharedSocket.disconnect();
  sharedSocket = null;
  sharedSocketKey = null;
}

const REALTIME_ROOM_REJOIN_DELAYS_MS = [
  0,
  250,
  1000,
] as const;

function joinRealtimeRooms(
  socket: Socket,
  params: {
    user: RealtimeUser;
    cinemaId: number | null;
  },
) {
  const joinRooms = () => {
    if (!socket.connected) {
      return;
    }

    if (params.cinemaId) {
      socket.emit(
        "joinCinema",
        params.cinemaId,
      );
    }

    socket.emit(
      "joinUser",
      params.user.id,
    );
  };

  for (
    const delay of
      REALTIME_ROOM_REJOIN_DELAYS_MS
  ) {
    if (delay === 0) {
      joinRooms();
      continue;
    }

    window.setTimeout(
      joinRooms,
      delay,
    );
  }
}

function acquireSharedSocket(params: {
  token: string;
  user: RealtimeUser;
  cinemaId: number | null;
}) {
  if (pendingDisconnectTimer) {
    clearTimeout(
      pendingDisconnectTimer,
    );
    pendingDisconnectTimer = null;
  }

  const nextSocketKey =
    getSharedSocketKey(
      params.token,
      params.user,
      params.cinemaId,
    );

  if (
    sharedSocket &&
    sharedSocketKey !== nextSocketKey
  ) {
    closeSharedSocket();
  }

  if (!sharedSocket) {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: {
        token: params.token,
      },
    });

    sharedSocket = socket;
    sharedSocketKey = nextSocketKey;

    socket.on("connect", () => {
      console.log(
        "Realtime connected:",
        socket.id,
      );

      joinRealtimeRooms(
        socket,
        params,
      );
    });

    socket.on("disconnect", () => {
      console.log(
        "Realtime disconnected",
      );
    });
  }

  if (sharedSocket.connected) {
    joinRealtimeRooms(
      sharedSocket,
      params,
    );
  }

  sharedConsumerCount += 1;

  return sharedSocket;
}

function releaseSharedSocket() {
  sharedConsumerCount = Math.max(
    0,
    sharedConsumerCount - 1,
  );

  if (
    sharedConsumerCount > 0 ||
    pendingDisconnectTimer
  ) {
    return;
  }

  pendingDisconnectTimer =
    setTimeout(() => {
      pendingDisconnectTimer = null;

      if (
        sharedConsumerCount === 0
      ) {
        closeSharedSocket();
      }
    }, 500);
}

export function useRealtimeCore(
  input: UseRealtimeCoreInput,
) {
  const { token, user } = useAuth();
  const enabled =
    input.enabled !== false;
  const socketRef =
    useRef<Socket | null>(null);
  const inputRef = useRef(input);
  const [
    selectedMasterCinemaId,
    setSelectedMasterCinemaId,
  ] = useState<string | null>(
    () =>
      readSelectedMasterCinemaId(),
  );

  inputRef.current = input;

  useEffect(() => {
    function updateSelectedMasterCinemaId() {
      setSelectedMasterCinemaId(
        readSelectedMasterCinemaId(),
      );
    }

    window.addEventListener(
      "storage",
      updateSelectedMasterCinemaId,
    );
    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedMasterCinemaId,
    );

    return () => {
      window.removeEventListener(
        "storage",
        updateSelectedMasterCinemaId,
      );
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedMasterCinemaId,
      );
    };
  }, []);

  const realtimeCinemaId =
    useMemo(() => {
      if (!user) {
        return null;
      }

      return resolveRealtimeCinemaId(
        user,
        selectedMasterCinemaId,
      );
    }, [
      selectedMasterCinemaId,
      user,
    ]);

  useEffect(() => {
    if (
      !enabled ||
      !token ||
      !user
    ) {
      return;
    }

    const socket =
      acquireSharedSocket({
        token,
        user,
        cinemaId:
          realtimeCinemaId,
      });

    socketRef.current = socket;

    const triggerShiftUpdated =
      () => {
        inputRef.current
          .onShiftUpdated?.();
      };
    const triggerShiftTradeUpdated =
      () => {
        inputRef.current
          .onShiftTradeUpdated?.();
      };
    const triggerMovieShowingUpdated =
      () => {
        inputRef.current
          .onMovieShowingUpdated?.();
      };
    const triggerStaffingRequestUpdated =
      () => {
        inputRef.current
          .onStaffingRequestUpdated?.();
      };
    const triggerLeaveRequestUpdated =
      () => {
        inputRef.current
          .onLeaveRequestUpdated?.();
      };
    const triggerNotificationUpdated =
      () => {
        inputRef.current
          .onNotification?.();
      };
    const triggerMessageUpdated =
      () => {
        inputRef.current
          .onMessage?.();
      };
    const triggerTimeEntryUpdated =
      () => {
        inputRef.current
          .onTimeEntry?.();
      };

    const handleShiftAccepted = (
      payload:
        RealtimeShiftTradePayload,
    ) => {
      inputRef.current
        .onShiftAccepted?.(payload);
      triggerShiftTradeUpdated();
      triggerShiftUpdated();
    };

    const handleNewShiftTrade = (
      payload:
        RealtimeShiftTradePayload,
    ) => {
      inputRef.current
        .onNewShiftTrade?.(payload);
      triggerShiftTradeUpdated();
    };

    const handleNewDirectShiftTrade = (
      payload:
        RealtimeShiftTradePayload,
    ) => {
      inputRef.current
        .onNewDirectShiftTrade?.(
          payload,
        );
      triggerShiftTradeUpdated();
    };

    const handleShiftRejected = (
      payload:
        RealtimeShiftTradePayload,
    ) => {
      inputRef.current
        .onShiftRejected?.(payload);
      triggerShiftTradeUpdated();
    };

    socket.on(
      "shiftUpdated",
      triggerShiftUpdated,
    );
    socket.on(
      "shiftsUpdated",
      triggerShiftUpdated,
    );
    socket.on(
      "shiftTradeUpdated",
      triggerShiftTradeUpdated,
    );
    socket.on(
      "shiftTradesUpdated",
      triggerShiftTradeUpdated,
    );
    socket.on(
      "movieShowingUpdated",
      triggerMovieShowingUpdated,
    );
    socket.on(
      "movieShowingsUpdated",
      triggerMovieShowingUpdated,
    );
    socket.on(
      "staffingRequestsUpdated",
      triggerStaffingRequestUpdated,
    );
    socket.on(
      "staffingRequestAccepted",
      triggerStaffingRequestUpdated,
    );
    socket.on(
      "staffingRequestRejected",
      triggerStaffingRequestUpdated,
    );
    socket.on(
      "staffingRequestCancelled",
      triggerStaffingRequestUpdated,
    );
    socket.on(
      "leaveRequestsUpdated",
      triggerLeaveRequestUpdated,
    );
    socket.on(
      "notificationCreated",
      triggerNotificationUpdated,
    );
    socket.on(
      "notificationsUpdated",
      triggerNotificationUpdated,
    );
    socket.on(
      "messageCreated",
      triggerMessageUpdated,
    );
    socket.on(
      "messagesUpdated",
      triggerMessageUpdated,
    );
    socket.on(
      "timeEntryUpdated",
      triggerTimeEntryUpdated,
    );
    socket.on(
      "timeEntriesUpdated",
      triggerTimeEntryUpdated,
    );
    socket.on(
      "shiftAccepted",
      handleShiftAccepted,
    );
    socket.on(
      "newShiftTrade",
      handleNewShiftTrade,
    );
    socket.on(
      "newDirectShiftTrade",
      handleNewDirectShiftTrade,
    );
    socket.on(
      "shiftRejected",
      handleShiftRejected,
    );

    return () => {
      socket.off(
        "shiftUpdated",
        triggerShiftUpdated,
      );
      socket.off(
        "shiftsUpdated",
        triggerShiftUpdated,
      );
      socket.off(
        "shiftTradeUpdated",
        triggerShiftTradeUpdated,
      );
      socket.off(
        "shiftTradesUpdated",
        triggerShiftTradeUpdated,
      );
      socket.off(
        "movieShowingUpdated",
        triggerMovieShowingUpdated,
      );
      socket.off(
        "movieShowingsUpdated",
        triggerMovieShowingUpdated,
      );
      socket.off(
        "staffingRequestsUpdated",
        triggerStaffingRequestUpdated,
      );
      socket.off(
        "staffingRequestAccepted",
        triggerStaffingRequestUpdated,
      );
      socket.off(
        "staffingRequestRejected",
        triggerStaffingRequestUpdated,
      );
      socket.off(
        "staffingRequestCancelled",
        triggerStaffingRequestUpdated,
      );
      socket.off(
        "leaveRequestsUpdated",
        triggerLeaveRequestUpdated,
      );
      socket.off(
        "notificationCreated",
        triggerNotificationUpdated,
      );
      socket.off(
        "notificationsUpdated",
        triggerNotificationUpdated,
      );
      socket.off(
        "messageCreated",
        triggerMessageUpdated,
      );
      socket.off(
        "messagesUpdated",
        triggerMessageUpdated,
      );
      socket.off(
        "timeEntryUpdated",
        triggerTimeEntryUpdated,
      );
      socket.off(
        "timeEntriesUpdated",
        triggerTimeEntryUpdated,
      );
      socket.off(
        "shiftAccepted",
        handleShiftAccepted,
      );
      socket.off(
        "newShiftTrade",
        handleNewShiftTrade,
      );
      socket.off(
        "newDirectShiftTrade",
        handleNewDirectShiftTrade,
      );
      socket.off(
        "shiftRejected",
        handleShiftRejected,
      );

      socketRef.current = null;
      releaseSharedSocket();
    };
  }, [
    enabled,
    realtimeCinemaId,
    token,
    user,
  ]);

  return {
    socket: socketRef.current,
  };
}
