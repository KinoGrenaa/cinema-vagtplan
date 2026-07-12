import { useCallback, useState } from "react";

import { apiFetch } from "@/app/lib/api";

import {
  appendCinemaId,
  readErrorMessage,
} from "../../helpers/core/workTypeHelpers";

type InfoDialog = {
  showError: (title: string, description: string) => void;
};

type ConfirmDialog = {
  confirm: (input: {
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    confirmVariant: "danger" | "success";
    onConfirm: () => Promise<void>;
  }) => void;
};

type UseWorkTypeActionsOptions = {
  activeCinemaId: number | null;
  needsMasterCinemaSelection: boolean;
  confirmDialog: ConfirmDialog;
  infoDialog: InfoDialog;
  refreshWorkTypes: () => Promise<void>;
};

export function useWorkTypeActions({
  activeCinemaId,
  needsMasterCinemaSelection,
  confirmDialog,
  infoDialog,
  refreshWorkTypes,
}: UseWorkTypeActionsOptions) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [payrollTypeId, setPayrollTypeId] = useState("");

  const createWorkType = useCallback(async () => {
    if (needsMasterCinemaSelection) {
      infoDialog.showError(
        "Biograf mangler",
        "Vælg først en biograf i MASTER-panelet, før du opretter vagttyper.",
      );
      return;
    }

    if (!name.trim()) {
      infoDialog.showError(
        "Navn mangler",
        "Indtast et navn på vagttypen, før du opretter den.",
      );
      return;
    }

    try {
      const response = await apiFetch("/work-types", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          color,
          payrollTypeId: payrollTypeId ? Number(payrollTypeId) : null,
          cinemaId: activeCinemaId,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke oprette vagttype"),
        );
      }

      setName("");
      setColor("#2563eb");
      setPayrollTypeId("");
      await refreshWorkTypes();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke oprette vagttype",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagttypen skulle oprettes. Prøv igen.",
      );
    }
  }, [
    activeCinemaId,
    color,
    infoDialog,
    name,
    needsMasterCinemaSelection,
    payrollTypeId,
    refreshWorkTypes,
  ]);

  const removeWorkType = useCallback(
    (id: number) => {
      confirmDialog.confirm({
        title: "Arkivér vagttype",
        description:
          "Er du sikker på, at du vil arkivere denne vagttype?\n\n" +
          "Historiske vagter, løndata og rapporter bevares.\n\n" +
          "Vagttypen kan genaktiveres senere.",
        confirmText: "Arkivér",
        cancelText: "Annuller",
        confirmVariant: "danger",
        onConfirm: async () => {
          try {
            const response = await apiFetch(
              appendCinemaId(`/work-types/${id}`, activeCinemaId),
              {
                method: "DELETE",
              },
            );

            if (!response.ok) {
              throw new Error(
                await readErrorMessage(
                  response,
                  "Kunne ikke arkivere vagttype",
                ),
              );
            }

            await refreshWorkTypes();
          } catch (error) {
            infoDialog.showError(
              "Kunne ikke arkivere vagttype",
              error instanceof Error
                ? error.message
                : "Der opstod en fejl, da vagttypen skulle arkiveres. Prøv igen.",
            );
          }
        },
      });
    },
    [activeCinemaId, confirmDialog, infoDialog, refreshWorkTypes],
  );

  const reactivateWorkType = useCallback(
    (id: number) => {
      confirmDialog.confirm({
        title: "Genaktivér vagttype",
        description:
          "Vil du genaktivere denne vagttype?\n\n" +
          "Vagttypen kan igen bruges ved oprettelse og redigering af vagter.",
        confirmText: "Genaktivér",
        cancelText: "Annuller",
        confirmVariant: "success",
        onConfirm: async () => {
          try {
            const response = await apiFetch(
              appendCinemaId(`/work-types/${id}/reactivate`, activeCinemaId),
              {
                method: "PATCH",
              },
            );

            if (!response.ok) {
              throw new Error(
                await readErrorMessage(
                  response,
                  "Kunne ikke genaktivere vagttype",
                ),
              );
            }

            await refreshWorkTypes();
          } catch (error) {
            infoDialog.showError(
              "Kunne ikke genaktivere vagttype",
              error instanceof Error
                ? error.message
                : "Der opstod en fejl, da vagttypen skulle genaktiveres. Prøv igen.",
            );
          }
        },
      });
    },
    [activeCinemaId, confirmDialog, infoDialog, refreshWorkTypes],
  );

  return {
    name,
    setName,
    color,
    setColor,
    payrollTypeId,
    setPayrollTypeId,
    createWorkType,
    removeWorkType,
    reactivateWorkType,
  };
}
