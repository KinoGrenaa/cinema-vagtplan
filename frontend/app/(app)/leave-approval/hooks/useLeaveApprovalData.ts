"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import {
  appendCinemaId,
  getSelectedMasterCinemaId,
  getStoredUser,
  readErrorMessage,
} from "../helpers/leaveApprovalHelpers";
import type {
  LeaveRequest,
  LeaveStatus,
  StoredUser,
} from "../helpers/leaveApprovalTypes";

type InfoDialog = {
  showError: (title: string, description: string) => void;
};

export function useLeaveApprovalData(infoDialog: InfoDialog) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);

  const activeCinemaId = useMemo(() => {
    if (!currentUser) {
      return null;
    }

    if (currentUser.role === "MASTER" && !currentUser.cinemaId) {
      return selectedMasterCinemaId;
    }

    return currentUser.cinemaId ?? null;
  }, [currentUser, selectedMasterCinemaId]);

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" &&
    !currentUser.cinemaId &&
    !selectedMasterCinemaId;

  const appendActiveCinemaId = useCallback(
    (endpoint: string) => {
      if (currentUser?.role === "MASTER" && !currentUser.cinemaId) {
        return appendCinemaId(endpoint, activeCinemaId);
      }

      return endpoint;
    },
    [activeCinemaId, currentUser],
  );

  const fetchRequests = useCallback(
    async (showError = true) => {
      if (!currentUser) {
        return;
      }

      if (needsMasterCinemaSelection) {
        setRequests([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response = await apiFetch(
          appendActiveCinemaId("/leave-requests?includeAll=true"),
        );

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

        if (showError) {
          infoDialog.showError(
            "Fraværsansøgninger kunne ikke hentes",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl ved hentning af fraværsansøgninger.",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [appendActiveCinemaId, currentUser, needsMasterCinemaSelection],
  );

  useRealtimeCore({
    onLeaveRequestUpdated: () => fetchRequests(false),
  });

  useEffect(() => {
    function syncActiveCinemaContext() {
      setCurrentUser(getStoredUser());
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    }

    syncActiveCinemaContext();

    window.addEventListener(
      "masterSelectedCinemaChanged",
      syncActiveCinemaContext,
    );
    window.addEventListener("storage", syncActiveCinemaContext);

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        syncActiveCinemaContext,
      );
      window.removeEventListener("storage", syncActiveCinemaContext);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    fetchRequests();
  }, [currentUser, fetchRequests, selectedMasterCinemaId]);

  const statusCounts = useMemo(() => {
    return requests.reduce(
      (counts, request) => ({
        ...counts,
        [request.status]: counts[request.status] + 1,
      }),
      {
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
        CANCELLED: 0,
      } satisfies Record<LeaveStatus, number>,
    );
  }, [requests]);

  async function updateStatus(requestId: number, status: LeaveStatus) {
    try {
      if (needsMasterCinemaSelection) {
        infoDialog.showError(
          "Ingen aktiv biograf valgt",
          "Vælg en biograf i MASTER-panelet, før du behandler fravær.",
        );
        return;
      }

      const response = await apiFetch(
        appendActiveCinemaId(`/leave-requests/${requestId}/status`),
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Status kunne ikke opdateres."),
        );
      }

      await fetchRequests();
    } catch (error) {
      infoDialog.showError(
        "Status kunne ikke opdateres",
        error instanceof Error ? error.message : "Der opstod en fejl.",
      );
    }
  }

  return {
    requests,
    loading,
    statusCounts,
    needsMasterCinemaSelection,
    updateStatus,
  };
}
