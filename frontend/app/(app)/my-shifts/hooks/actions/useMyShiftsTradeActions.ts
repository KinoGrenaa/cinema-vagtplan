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
      confirmText: "Send i vagtpulje",
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
            "Vagten kunne ikke sendes til vagtpuljen",
            await readErrorMessage(response, "Kunne ikke sende vagten til vagtpuljen."),
          );
          return;
        }

        setMessage("Vagten er sendt til vagtpuljen.");
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
      title: "Tak nej til vagten?",
      description: `Vil du takke nej til denne vagt? ${getShiftConfirmText(
        shift,
      )}`,
      confirmText: "Tak nej",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        const response = await apiFetch(`/shift-trades/${tradeId}/reject`, {
          method: "PATCH",
        });

        if (!response.ok) {
          infoDialog.showError(
            "Kunne ikke takke nej til vagten",
            await readErrorMessage(
              response,
              "Der opstod en fejl, da du forsøgte at takke nej til vagten.",
            ),
          );
          return;
        }

        setMessage("Du har takket nej til vagten.");
        await refreshData();
      },
    });
  }

  function cancelTrade(tradeId: number) {
    const trade = shiftTrades.find(
      (item) => item.id === tradeId,
    );
    const shift = trade?.shift ?? null;

    if (!trade || !shift) {
      infoDialog.showError(
        "Tilbuddet blev ikke fundet",
        "Tilbuddet eller vagten kunne ikke findes.\nPrøv at opdatere siden.",
      );
      return;
    }

    const isDirect =
      trade.type === "DIRECT";
    const targetName =
      trade.targetUser
        ? `${trade.targetUser.firstName} ${trade.targetUser.lastName}`.trim()
        : "den valgte kollega";

    confirmDialog.confirm({
      title: isDirect
        ? "Træk tilbuddet tilbage?"
        : "Annullér udsendelse",
      description: isDirect
        ? `${getShiftConfirmText(
            shift,
          )}\nSendt til ${targetName}\n\nVil du trække dette direkte tilbud tilbage?`
        : `Er du sikker på, at du vil annullere udsendelsen af denne vagt? ${getShiftConfirmText(
            shift,
          )}`,
      confirmText: isDirect
        ? "Træk tilbage"
        : "Annullér",
      cancelText: "Tilbage",
      confirmVariant: "danger",
      onConfirm: async () => {
        const response = await apiFetch(`/shift-trades/${tradeId}/cancel`, {
          method: "PATCH",
        });

        if (!response.ok) {
          infoDialog.showError(
            isDirect
              ? "Kunne ikke trække tilbuddet tilbage"
              : "Udsendelsen kunne ikke annulleres",
            await readErrorMessage(
              response,
              isDirect
                ? "Kunne ikke trække det direkte tilbud tilbage."
                : "Kunne ikke annullere udsendelsen.",
            ),
          );
          return;
        }

        setMessage(
          isDirect
            ? "Det direkte tilbud er trukket tilbage."
            : "Udsendelsen er annulleret.",
        );
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
