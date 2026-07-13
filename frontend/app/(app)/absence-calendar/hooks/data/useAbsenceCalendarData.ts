"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";
import { readErrorMessage } from "../../helpers/core/absenceCalendarHelpers";
import type { LeaveRequest } from "../../helpers/core/absenceCalendarTypes";

function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem("masterSelectedCinemaId");
  if (!value) {
    return null;
  }

  const parsedId = Number(value);
  return Number.isInteger(parsedId) && parsedId > 0 ? String(parsedId) : null;
}

export function useAbsenceCalendarData() {
  const { user } = useAuth();
  const infoDialog = useInfoModal();
  const showErrorRef = useRef(infoDialog.showError);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    string | null
  >(null);

  useEffect(() => {
    showErrorRef.current = infoDialog.showError;
  }, [infoDialog.showError]);

  useEffect(() => {
    function syncSelectedCinema() {
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    }

    syncSelectedCinema();
    window.addEventListener("masterSelectedCinemaChanged", syncSelectedCinema);
    window.addEventListener("storage", syncSelectedCinema);

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        syncSelectedCinema,
      );
      window.removeEventListener("storage", syncSelectedCinema);
    };
  }, []);

  const needsMasterCinemaSelection =
    user?.role === "MASTER" && !user.cinemaId && !selectedMasterCinemaId;

  const fetchRequests = useCallback(async () => {
    if (needsMasterCinemaSelection) {
      setRequests([]);
      return;
    }

    const endpoint =
      user?.role === "MASTER" && !user.cinemaId && selectedMasterCinemaId
        ? `/leave-requests?cinemaId=${encodeURIComponent(
            selectedMasterCinemaId,
          )}`
        : "/leave-requests";

    try {
      const response = await apiFetch(endpoint);
      if (!response.ok) {
        setRequests([]);
        showErrorRef.current(
          "Fraværskalenderen kunne ikke hentes",
          await readErrorMessage(
            response,
            "Der opstod en fejl, da fraværskalenderen skulle hentes.",
          ),
        );
        return;
      }

      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      setRequests([]);
      showErrorRef.current(
        "Fraværskalenderen kunne ikke hentes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da fraværskalenderen skulle hentes.",
      );
    }
  }, [needsMasterCinemaSelection, selectedMasterCinemaId, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    fetchRequests();
  }, [fetchRequests, user]);

  return {
    infoDialog,
    needsMasterCinemaSelection,
    requests,
  };
}
