"use client";

import { useCallback, useEffect, useState } from "react";

import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import { readErrorMessage } from "../helpers/leaveRequestHelpers";
import type { LeaveRequest } from "../helpers/leaveRequestTypes";

export type LeaveRequestCurrentUser = {
  id?: number;
  sub?: number;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

type UseLeaveRequestsDataOptions = {
  showError: (title: string, description: string) => void;
};

function readStoredCurrentUser() {
  const savedUser = localStorage.getItem("user");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser) as LeaveRequestCurrentUser;
  } catch {
    return null;
  }
}

function readStoredMasterCinemaId() {
  const savedCinemaId = Number(localStorage.getItem("masterSelectedCinemaId"));

  if (Number.isInteger(savedCinemaId) && savedCinemaId > 0) {
    return savedCinemaId;
  }

  return null;
}

function getActiveCinemaId(
  user: LeaveRequestCurrentUser | null,
  selectedMasterCinemaId: number | null,
) {
  if (!user) {
    return null;
  }

  if (user.role === "MASTER" && !user.cinemaId) {
    return selectedMasterCinemaId;
  }

  return user.cinemaId;
}

function buildOwnLeaveRequestsEndpoint(
  user: LeaveRequestCurrentUser | null,
  activeCinemaId: number | null,
) {
  if (!user) {
    return null;
  }

  if (user.role === "MASTER" && !user.cinemaId) {
    if (!activeCinemaId) {
      return null;
    }

    return `/leave-requests?cinemaId=${activeCinemaId}`;
  }

  return "/leave-requests";
}

export function useLeaveRequestsData({
  showError,
}: UseLeaveRequestsDataOptions) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] =
    useState<LeaveRequestCurrentUser | null>(null);
  const [activeCinemaId, setActiveCinemaId] = useState<number | null>(null);
  const [isMasterWithoutOwnCinema, setIsMasterWithoutOwnCinema] =
    useState(false);
  const [initialized, setInitialized] = useState(false);

  const refreshUserContext = useCallback(() => {
    const storedUser = readStoredCurrentUser();
    const selectedMasterCinemaId = readStoredMasterCinemaId();
    const nextActiveCinemaId = getActiveCinemaId(
      storedUser,
      selectedMasterCinemaId,
    );
    const masterWithoutActiveCinema =
      storedUser?.role === "MASTER" && !storedUser.cinemaId && !nextActiveCinemaId;

    setCurrentUser(storedUser);
    setCurrentUserId(storedUser?.id ?? storedUser?.sub ?? null);
    setActiveCinemaId(nextActiveCinemaId);
    setIsMasterWithoutOwnCinema(masterWithoutActiveCinema);
    setInitialized(true);
  }, []);

  const fetchRequests = useCallback(
    async (showFetchError = true) => {
      if (!initialized) {
        return;
      }

      const endpoint = buildOwnLeaveRequestsEndpoint(
        currentUser,
        activeCinemaId,
      );

      if (!endpoint) {
        setRequests([]);
        return;
      }

      try {
        const response = await apiFetch(endpoint);

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Fraværsansøgninger kunne ikke hentes.",
            ),
          );
        }

        const data = await response.json();
        setRequests(Array.isArray(data) ? data : []);
      } catch (error) {
        setRequests([]);

        if (showFetchError) {
          showError(
            "Fraværsansøgninger kunne ikke hentes",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl ved hentning af fraværsansøgninger.",
          );
        }
      }
    },
    [activeCinemaId, currentUser, initialized],
  );

  useRealtimeCore({
    onLeaveRequestUpdated: () => fetchRequests(false),
  });

  useEffect(() => {
    refreshUserContext();

    window.addEventListener("masterSelectedCinemaChanged", refreshUserContext);

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        refreshUserContext,
      );
    };
  }, [refreshUserContext]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  return {
    activeCinemaId,
    currentUser,
    currentUserId,
    fetchRequests,
    isMasterWithoutOwnCinema,
    requests,
  };
}
