"use client";

import { useCallback, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import type { TimeEntry, TimeEntryRevision } from "../helpers/myTimeTypes";

type ShowHistoryError = (title: string, description: string) => void;

export function useMyTimeHistory(showError: ShowHistoryError) {
  const [historyEntry, setHistoryEntry] = useState<TimeEntry | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<TimeEntryRevision[]>([]);

  const openHistory = useCallback(
    async (entry: TimeEntry) => {
      try {
        setHistoryLoading(true);
        setHistoryEntry(entry);

        const response = await apiFetch(`/time-entries/${entry.id}/revisions`);

        if (!response.ok) {
          showError(
            "Kunne ikke hente historik",
            "Der opstod en fejl, da historikken skulle hentes. Prøv igen.",
          );

          setHistoryEntry(null);
          return;
        }

        const data = await response.json();

        setHistoryItems(Array.isArray(data) ? data : []);
      } catch {
        showError(
          "Kunne ikke hente historik",
          "Der opstod en fejl, da historikken skulle hentes. Prøv igen.",
        );

        setHistoryEntry(null);
      } finally {
        setHistoryLoading(false);
      }
    },
    [showError],
  );

  const closeHistory = useCallback(() => {
    setHistoryEntry(null);
    setHistoryItems([]);
  }, []);

  return {
    historyEntry,
    historyLoading,
    historyItems,
    openHistory,
    closeHistory,
  };
}
