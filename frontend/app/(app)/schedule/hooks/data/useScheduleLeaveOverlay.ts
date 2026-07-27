"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useApi,
} from "@/app/hooks/useApi";
import {
  useRealtimeCore,
} from "@/app/hooks/useRealtimeCore";
import {
  useAuth,
} from "@/app/providers/AuthProvider";
import type {
  LeaveRequest,
} from "../../../../../../shared/types";

const MASTER_SELECTED_CINEMA_ID_KEY =
  "masterSelectedCinemaId";

type Params = {
  selectedDate: string;
  onError:
    (
      title: string,
      description: string,
    ) => void;
};

function readSelectedMasterCinemaId() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const value =
    Number(
      window.localStorage.getItem(
        MASTER_SELECTED_CINEMA_ID_KEY,
      ),
    );

  return Number.isInteger(
    value,
  ) &&
    value > 0
    ? value
    : null;
}

async function readErrorMessage(
  response: Response,
) {
  const payload =
    await response
      .json()
      .catch(() => null);

  return typeof payload?.message ===
    "string"
    ? payload.message
    : "Fraværsoverlayet kunne ikke hentes.";
}

export function useScheduleLeaveOverlay({
  selectedDate,
  onError,
}: Params) {
  const {
    apiFetch,
  } = useApi();
  const {
    user,
    loading: authLoading,
  } = useAuth();
  const [
    selectedMasterCinemaId,
    setSelectedMasterCinemaId,
  ] =
    useState<number | null>(
      null,
    );
  const [
    leaveRequests,
    setLeaveRequests,
  ] =
    useState<
      LeaveRequest[]
    >([]);

  useEffect(() => {
    function updateSelectedCinema() {
      setSelectedMasterCinemaId(
        readSelectedMasterCinemaId(),
      );
    }

    updateSelectedCinema();
    window.addEventListener(
      "storage",
      updateSelectedCinema,
    );
    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedCinema,
    );

    return () => {
      window.removeEventListener(
        "storage",
        updateSelectedCinema,
      );
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedCinema,
      );
    };
  }, []);

  const activeCinemaId =
    useMemo(() => {
      if (!user) {
        return null;
      }

      if (
        user.role ===
          "MASTER" &&
        !user.cinemaId
      ) {
        return selectedMasterCinemaId;
      }

      return (
        user.cinemaId ??
        null
      );
    }, [
      selectedMasterCinemaId,
      user,
    ]);

  const fetchLeaveRequests =
    useCallback(
      async (
        reportError = true,
      ) => {
        if (
          !user ||
          !activeCinemaId
        ) {
          setLeaveRequests(
            [],
          );
          return;
        }

        const params =
          new URLSearchParams({
            date:
              selectedDate,
          });

        if (
          user.role ===
            "MASTER" &&
          !user.cinemaId
        ) {
          params.set(
            "cinemaId",
            String(
              activeCinemaId,
            ),
          );
        }

        try {
          const response =
            await apiFetch(
              `/leave-requests/schedule-day?${params.toString()}`,
            );

          if (
            !response.ok
          ) {
            throw new Error(
              await readErrorMessage(
                response,
              ),
            );
          }

          const data =
            await response.json();

          setLeaveRequests(
            Array.isArray(
              data,
            )
              ? data
              : [],
          );
        } catch (error) {
          setLeaveRequests(
            [],
          );

          if (reportError) {
            onError(
              "Fravær kunne ikke hentes",
              error instanceof Error
                ? error.message
                : "Fraværsoverlayet kunne ikke hentes.",
            );
          }
        }
      },
      [
        activeCinemaId,
        apiFetch,
        onError,
        selectedDate,
        user,
      ],
    );

  useEffect(() => {
    if (
      authLoading
    ) {
      return;
    }

    void fetchLeaveRequests(
      true,
    );
  }, [
    authLoading,
    fetchLeaveRequests,
  ]);

  useRealtimeCore({
    enabled:
      Boolean(
        user &&
        activeCinemaId,
      ),
    onLeaveRequestUpdated:
      () => {
        void fetchLeaveRequests(
          false,
        );
      },
  });

  return {
    leaveRequests,
    refreshLeaveRequests:
      fetchLeaveRequests,
  };
}
