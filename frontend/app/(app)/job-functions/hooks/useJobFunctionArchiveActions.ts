import { useCallback } from "react";

import { apiFetch } from "@/app/lib/api";

import type { JobFunctionWithWorkType } from "../helpers/jobFunctionPayrollHelpers";
import {
  appendCinemaId,
  readErrorMessage,
} from "../helpers/jobFunctionHelpers";
import type { JobFunction } from "../helpers/jobFunctionTypes";

type Confirm = (options: {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  confirmVariant: "danger" | "success";
  onConfirm: () => Promise<void>;
}) => void;

type ShowError = (title: string, description: string) => void;

type UseJobFunctionArchiveActionsOptions = {
  activeCinemaId: number | null;
  closeFormModal: () => void;
  confirm: Confirm;
  editingId: number | null;
  refreshData: () => Promise<void>;
  showError: ShowError;
};

export function useJobFunctionArchiveActions({
  activeCinemaId,
  closeFormModal,
  confirm,
  editingId,
  refreshData,
  showError,
}: UseJobFunctionArchiveActionsOptions) {
  const archiveJobFunction = useCallback(
    (jobFunction: JobFunctionWithWorkType) => {
      confirm({
        title: "Arkivér jobfunktion",
        description:
          `Vil du arkivere jobfunktionen "${jobFunction.name}"?\n\n` +
          "Historik bevares. Jobfunktionen skjules fra aktive valg og kan genaktiveres igen.",
        confirmText: "Arkivér",
        cancelText: "Annuller",
        confirmVariant: "danger",
        onConfirm: async () => {
          try {
            const response = await apiFetch(
              appendCinemaId(
                `/job-functions/${jobFunction.id}`,
                activeCinemaId,
              ),
              { method: "DELETE" },
            );

            if (!response.ok) {
              throw new Error(
                await readErrorMessage(
                  response,
                  "Kunne ikke arkivere jobfunktion",
                ),
              );
            }

            if (editingId === jobFunction.id) {
              closeFormModal();
            }

            await refreshData();
          } catch (error) {
            showError(
              "Kunne ikke arkivere jobfunktion",
              error instanceof Error
                ? error.message
                : "Der opstod en fejl, da jobfunktionen skulle arkiveres. Prøv igen.",
            );
          }
        },
      });
    },
    [
      activeCinemaId,
      closeFormModal,
      confirm,
      editingId,
      refreshData,
      showError,
    ],
  );

  const reactivateJobFunction = useCallback(
    (jobFunction: JobFunction) => {
      confirm({
        title: "Genaktivér jobfunktion",
        description:
          `Vil du genaktivere jobfunktionen "${jobFunction.name}"?\n\n` +
          "Jobfunktionen kan igen bruges i vagtplanlægning.",
        confirmText: "Genaktivér",
        cancelText: "Annuller",
        confirmVariant: "success",
        onConfirm: async () => {
          try {
            const response = await apiFetch(
              appendCinemaId(
                `/job-functions/${jobFunction.id}/reactivate`,
                activeCinemaId,
              ),
              { method: "PATCH" },
            );

            if (!response.ok) {
              throw new Error(
                await readErrorMessage(
                  response,
                  "Kunne ikke genaktivere jobfunktion",
                ),
              );
            }

            await refreshData();
          } catch (error) {
            showError(
              "Kunne ikke genaktivere jobfunktion",
              error instanceof Error
                ? error.message
                : "Der opstod en fejl, da jobfunktionen skulle genaktiveres. Prøv igen.",
            );
          }
        },
      });
    },
    [activeCinemaId, confirm, refreshData, showError],
  );

  return {
    archiveJobFunction,
    reactivateJobFunction,
  };
}
