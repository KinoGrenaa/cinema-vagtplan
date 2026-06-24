"use client";

import { useState } from "react";

import { apiFetch } from "@/app/lib/api";
import type { TimeEntry } from "../types";
import { readErrorMessage } from "../utils";
import { getSelectedCinemaQuery } from "../helpers/timeApprovalRequests";

type TimeEntryRevision = {
  id: number;
  action: string;
  reason?: string | null;
  createdAt: string;

  previousStatus?: string | null;
  newStatus?: string | null;

  previousClockIn?: string | null;
  newClockIn?: string | null;

  previousClockOut?: string | null;
  newClockOut?: string | null;

  previousClockInNote?: string | null;
  newClockInNote?: string | null;

  previousClockOutNote?: string | null;
  newClockOutNote?: string | null;

  previousAdminNote?: string | null;
  newAdminNote?: string | null;

  changedByUser?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
};

type InfoDialog = {
  showError: (title: string, description: string) => void;
};

type UseTimeApprovalHistoryOptions = {
  infoDialog: InfoDialog;
};

export function useTimeApprovalHistory({
  infoDialog,
}: UseTimeApprovalHistoryOptions) {
  const [historyItems, setHistoryItems] = useState<TimeEntryRevision[]>([]);
  const [, setHistoryLoading] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<TimeEntry | null>(null);

  async function openHistory(entry: TimeEntry) {
    try {
      setHistoryEntry(entry);
      setHistoryLoading(true);

      const response = await apiFetch(
        `/time-entries/${entry.id}/revisions${getSelectedCinemaQuery()}`,
      );

      if (!response.ok) {
        if (response.status === 401) {
          setHistoryItems([]);
          return;
        }

        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente historik"),
        );
      }

      const data = await response.json();

      setHistoryItems(Array.isArray(data) ? data : []);
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke hente historik",
        error instanceof Error ? error.message : "Kunne ikke hente historik",
      );

      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  function closeHistory() {
    setHistoryEntry(null);
    setHistoryItems([]);
  }

  return {
    historyItems,
    historyEntry,
    openHistory,
    closeHistory,
  };
}
