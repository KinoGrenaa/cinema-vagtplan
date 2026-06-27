"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";

import type { TimeEntry } from "../types";
import { readErrorMessage } from "../utils";
import { getSelectedCinemaQuery } from "../helpers/timeApprovalRequests";

type InfoDialog = {
  showError: (title: string, description: string) => void;
};

type UseTimeApprovalDataOptions = {
  infoDialog: InfoDialog;
  enabled?: boolean;
};

export function useTimeApprovalData({
  infoDialog,
  enabled = true,
}: UseTimeApprovalDataOptions) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const showErrorRef = useRef(infoDialog.showError);

  useEffect(() => {
    showErrorRef.current = infoDialog.showError;
  }, [infoDialog.showError]);

  const fetchEntries = useCallback(async () => {
    if (!enabled) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch(
        `/time-entries${getSelectedCinemaQuery()}`,
      );

      if (!response.ok) {
        if (response.status !== 401) {
          const message = await readErrorMessage(
            response,
            "Kunne ikke hente tidsregistreringer",
          );

          showErrorRef.current("Kunne ikke hente tidsregistreringer", message);
        }

        setEntries([]);
        return;
      }

      const data = await response.json();
      const nextEntries = Array.isArray(data) ? data : [];

      setEntries(nextEntries);
    } catch (error) {
      showErrorRef.current(
        "Kunne ikke hente tidsregistreringer",
        error instanceof Error && error.message
          ? error.message
          : "Der opstod en fejl, da tidsregistreringerne skulle hentes. Prøv igen.",
      );
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useRealtimeCore({
    onTimeEntry: fetchEntries,
  });

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    loading,
    fetchEntries,
  };
}
