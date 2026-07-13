"use client";

import { useState } from "react";

import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { apiFetch } from "@/app/lib/api";

import { actionLabels } from "../../helpers/core/systemErrorLogConstants";
import { readErrorMessage } from "../../helpers/core/systemErrorLogHelpers";
import type {
  LogAction,
  SystemErrorLog,
  SystemErrorLogRetentionCleanupResult,
  SystemErrorLogRetentionSummary,
} from "../../types";

type InfoDialog = Pick<
  ReturnType<typeof useInfoModal>,
  "show" | "showError"
>;

type NoteDialog = Pick<ReturnType<typeof useInputModal>, "prompt">;

type UseSystemErrorLogActionsParams = {
  infoDialog: InfoDialog;
  noteDialog: NoteDialog;
  retentionSummary: SystemErrorLogRetentionSummary | null;
  fetchLogs: () => Promise<void>;
  fetchRetentionSummary: () => Promise<void>;
};

export function useSystemErrorLogActions({
  infoDialog,
  noteDialog,
  retentionSummary,
  fetchLogs,
  fetchRetentionSummary,
}: UseSystemErrorLogActionsParams) {
  const [cleaningRetention, setCleaningRetention] = useState(false);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);
  const [updatingLogId, setUpdatingLogId] = useState<number | null>(null);

  async function updateStatus(logId: number, action: LogAction, note?: string) {
    setUpdatingLogId(logId);

    try {
      const options: RequestInit = {
        method: "PATCH",
      };

      if (action !== "seen") {
        options.body = JSON.stringify({ note: note?.trim() ?? "" });
      }

      const response = await apiFetch(
        `/system-error-logs/${logId}/${action}`,
        options,
      );

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Status kunne ikke opdateres.",
        );

        infoDialog.showError("Kunne ikke opdatere status", message);
        return;
      }

      await fetchLogs();
      await fetchRetentionSummary();

      infoDialog.show({
        title: "Status opdateret",
        description: `Fejlen er ${actionLabels[action]}.`,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke opdatere status",
        error instanceof Error ? error.message : "Ukendt fejl",
      );
    } finally {
      setUpdatingLogId(null);
    }
  }

  function requestResolutionNote(
    log: SystemErrorLog,
    action: Extract<LogAction, "resolve" | "ignore">,
  ) {
    const isResolve = action === "resolve";

    noteDialog.prompt({
      title: isResolve ? "Markér systemfejl som løst" : "Ignorer systemfejl",
      description: isResolve
        ? "Skriv en kort intern note om, hvorfor fejlen er løst."
        : "Skriv en kort intern note om, hvorfor fejlen ignoreres.",
      label: "Intern note",
      placeholder: isResolve
        ? "Fx rettet i seneste deploy eller skyldes kendt validering."
        : "Fx dublet, forventet brugerfejl eller ikke relevant.",
      confirmText: isResolve ? "Markér løst" : "Ignorer",
      cancelText: "Annuller",
      required: true,
      onConfirm: async (note) => {
        await updateStatus(log.id, action, note);
      },
    });
  }

  function requestRetentionCleanup() {
    const cleanupCount = retentionSummary?.summary.eligibleForCleanupCount ?? 0;

    if (cleanupCount <= 0) {
      infoDialog.show({
        title: "Ingen gamle logposter",
        description:
          "Der er ingen systemfejl, som opbevaringspolitikken markerer til oprydning lige nu.",
        variant: "info",
        buttonText: "OK",
      });
      return;
    }

    setCleanupConfirmOpen(true);
  }

  async function cleanupRetention() {
    setCleaningRetention(true);

    try {
      const response = await apiFetch("/system-error-logs/retention-cleanup", {
        method: "DELETE",
      });

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Gamle logposter kunne ikke ryddes.",
        );

        infoDialog.showError("Kunne ikke rydde gamle logposter", message);
        return;
      }

      const data =
        (await response.json()) as SystemErrorLogRetentionCleanupResult;

      setCleanupConfirmOpen(false);
      await fetchLogs();
      await fetchRetentionSummary();

      infoDialog.show({
        title: "Gamle logposter er ryddet",
        description: `${data.deletedCount} logposter blev slettet efter opbevaringspolitikken.`,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke rydde gamle logposter",
        error instanceof Error ? error.message : "Ukendt fejl",
      );
    } finally {
      setCleaningRetention(false);
    }
  }

  return {
    cleaningRetention,
    cleanupConfirmOpen,
    setCleanupConfirmOpen,
    updatingLogId,
    updateStatus,
    requestResolutionNote,
    requestRetentionCleanup,
    cleanupRetention,
  };
}
