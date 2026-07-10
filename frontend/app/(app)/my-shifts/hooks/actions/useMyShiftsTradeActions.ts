import { useState } from "react";

import type { useConfirm } from "@/app/hooks/useConfirm";
import type { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";

import {
  getShiftConfirmText,
  hasOwnCinema,
  readErrorMessage,
} from "../../helpers/core/myShiftsHelpers";
import type {
  CurrentUser,
  Shift,
  ShiftTrade,
  User,
} from "../../helpers/core/myShiftsTypes";

type UseMyShiftsTradeActionsOptions = {
  currentUser: CurrentUser | null;
  shifts: Shift[];
  users: User[];
  shiftTrades: ShiftTrade[];
  confirmDialog: ReturnType<typeof useConfirm>;
  infoDialog: ReturnType<typeof useInfoModal>;
  refreshData: () => Promise<void>;
};

export function useMyShiftsTradeActions({
  currentUser,
  shifts,
  users,
  shiftTrades,
  confirmDialog,
  infoDialog,
  refreshData,
}: UseMyShiftsTradeActionsOptions) {
  const [message, setMessage] = useState("");

  function sendToPool(shiftId: number) {
    if (!currentUser || !hasOwnCinema(currentUser)) return;

    const shift = shifts.find((item) => item.id === shiftId);

    if (!shift) {
      infoDialog.showError(
        "Vagten blev ikke fundet",
        "Vagten kunne ikke findes.\nPrøv at opdatere siden.",
      );
      return;
    }

    confirmDialog.confirm({
      title: "Send vagt i vagtpulje",
      description: `Er du sikker på, at du vil sende denne vagt i vagtpuljen? ${getShiftConfirmText(
        shift,
      )}`,
      confirmText: "Send i pulje",
      cancelText: "Annuller",
      confirmVariant: "primary",
      onConfirm: async () => {
        const response = await apiFetch("/shift-trades", {
          method: "POST",
          body: JSON.stringify({
            shiftId,
            offeredByUserId: currentUser.id,
            cinemaId: currentUser.cinemaId,
            type: "POOL",
          }),
        });

        if (!response.ok) {
          infoDialog.showError(
            "Vagten kunne ikke sendes til puljen",
            await readErrorMessage(response, "Kunne ikke sende vagten til puljen."),
          );
          return;
        }

        setMessage("Vagten er sendt til fælles pulje.");
        await refreshData();
      },
    });
  }

  function sendDirect(shiftId: number, targetUserId: number) {
    if (!currentUser || !targetUserId || !hasOwnCinema(currentUser)) return;

    const shift = shifts.find((item) => item.id === shiftId);

    if (!shift) {
      infoDialog.showError(
        "Vagten blev ikke fundet",
        "Vagten kunne ikke findes.\nPrøv at opdatere siden.",
      );
      return;
    }

    const targetUser = users.find((user) => user.id === targetUserId);
    const targetName = targetUser
      ? `${targetUser.firstName} ${targetUser.lastName}`
      : "den valgte kollega";

    confirmDialog.confirm({
      title: "Send vagt direkte",
      description: `Er du sikker på, at du vil sende denne vagt direkte til ${targetName}? ${getShiftConfirmText(
        shift,
      )}`,
      confirmText: "Send vagt",
      cancelText: "Annuller",
      confirmVariant: "primary",
      onConfirm: async () => {
        const response = await apiFetch("/shift-trades", {
          method: "POST",
          body: JSON.stringify({
            shiftId,
            offeredByUserId: currentUser.id,
            cinemaId: currentUser.cinemaId,
            type: "DIRECT",
            targetUserId,
          }),
        });

        if (!response.ok) {
          infoDialog.showError(
            "Vagten kunne ikke sendes til kollegaen",
            await readErrorMessage(
              response,
              "Kunne ikke sende vagten til kollegaen.",
            ),
          );
          return;
        }

        setMessage(`Vagten er sendt direkte til ${targetName}.`);
        await refreshData();
      },
    });
  }

  function getTradeShift(tradeId: number) {
    const trade = shiftTrades.find((item) => item.id === tradeId);

    return trade?.shift ?? null;
  }

  function acceptTrade(tradeId: number) {
    if (!currentUser) return;

    const shift = getTradeShift(tradeId);

    if (!shift) {
      infoDialog.showError(
        "Vagten blev ikke fundet",
        "Vagten kunne ikke findes.\nPrøv at opdatere siden.",
      );
      return;
    }

    confirmDialog.confirm({
      title: "Acceptér vagt",
      description: `Er du sikker på, at du vil acceptere denne vagt? ${getShiftConfirmText(
        shift,
      )}`,
      confirmText: "Acceptér",
      cancelText: "Annuller",
      confirmVariant: "success",
      onConfirm: async () => {
        const response = await apiFetch(`/shift-trades/${tradeId}/accept`, {
          method: "PATCH",
          body: JSON.stringify({
            acceptedByUserId: currentUser.id,
          }),
        });

        if (!response.ok) {
          infoDialog.showError(
            "Vagten kunne ikke accepteres",
            await readErrorMessage(response, "Kunne ikke acceptere vagten."),
          );
          return;
        }

        setMessage("Vagten er accepteret.");
        await refreshData();
      },
    });
  }

  function rejectTrade(tradeId: number) {
    const shift = getTradeShift(tradeId);

    if (!shift) {
      infoDialog.showError(
        "Vagten blev ikke fundet",
        "Vagten kunne ikke findes.\nPrøv at opdatere siden.",
      );
      return;
    }

    confirmDialog.confirm({
      title: "Afvis vagt",
      description: `Er du sikker på, at du vil afvise denne vagt? ${getShiftConfirmText(
        shift,
      )}`,
      confirmText: "Afvis",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        const response = await apiFetch(`/shift-trades/${tradeId}/reject`, {
          method: "PATCH",
        });

        if (!response.ok) {
          infoDialog.showError(
            "Vagten kunne ikke afvises",
            await readErrorMessage(response, "Kunne ikke afvise vagten."),
          );
          return;
        }

        setMessage("Vagten er afvist.");
        await refreshData();
      },
    });
  }

  function cancelTrade(tradeId: number) {
    confirmDialog.confirm({
      title: "Annullér udsendelse",
      description: "Er du sikker på, at du vil annullere udsendelsen af denne vagt?",
      confirmText: "Annullér",
      cancelText: "Tilbage",
      confirmVariant: "danger",
      onConfirm: async () => {
        const response = await apiFetch(`/shift-trades/${tradeId}/cancel`, {
          method: "PATCH",
        });

        if (!response.ok) {
          infoDialog.showError(
            "Udsendelsen kunne ikke annulleres",
            await readErrorMessage(
              response,
              "Kunne ikke annullere udsendelsen.",
            ),
          );
          return;
        }

        setMessage("Udsendelsen er annulleret.");
        await refreshData();
      },
    });
  }

  return {
    message,
    sendToPool,
    sendDirect,
    acceptTrade,
    rejectTrade,
    cancelTrade,
  };
}
