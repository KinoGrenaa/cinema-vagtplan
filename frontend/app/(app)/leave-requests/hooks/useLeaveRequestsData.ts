"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import { readErrorMessage } from "../helpers/leaveRequestHelpers";
import type { LeaveRequest } from "../helpers/leaveRequestTypes";

type UseLeaveRequestsDataOptions = {
  showError: (title: string, description: string) => void;
};

export function useLeaveRequestsData({
  showError,
}: UseLeaveRequestsDataOptions) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isMasterWithoutOwnCinema, setIsMasterWithoutOwnCinema] =
    useState(false);

  const fetchRequests = useCallback(
    async (showFetchError = true) => {
      if (isMasterWithoutOwnCinema) {
        setRequests([]);
        return;
      }

      try {
        const response = await apiFetch("/leave-requests");

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
    [isMasterWithoutOwnCinema],
  );

  useRealtimeCore({
    onLeaveRequestUpdated: () => fetchRequests(false),
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const masterWithoutOwnCinema =
          parsedUser.role === "MASTER" && !parsedUser.cinemaId;

        setCurrentUserId(parsedUser.id ?? parsedUser.sub ?? null);
        setIsMasterWithoutOwnCinema(masterWithoutOwnCinema);

        if (masterWithoutOwnCinema) {
          setRequests([]);
          return;
        }
      } catch {
        setCurrentUserId(null);
        setIsMasterWithoutOwnCinema(false);
      }
    }

    fetchRequests();
  }, [fetchRequests]);

  return {
    currentUserId,
    fetchRequests,
    isMasterWithoutOwnCinema,
    requests,
  };
}
