"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import {
  formatShiftDate,
  formatShiftTime,
} from "../../helpers/core/shiftTradeHelpers";
import type { ShiftTrade } from "../../helpers/core/shiftTradeTypes";

type ApiFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

type ShiftTradeUser = {
  id: number;
};

type ConfirmModal = {
  confirm: (input: {
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    confirmVariant: "success" | "danger";
    onConfirm: () => Promise<void>;
  }) => void;
};

type InfoDialog = {
  showError: (title: string, description: string) => void;
};

type UseShiftTradeActionsArgs = {
  apiFetch: ApiFetch;
  user: ShiftTradeUser | null;
  confirmModal: ConfirmModal;
  infoDialog: InfoDialog;
  fetchTrades: () => Promise<void>;
  setMessage: Dispatch<SetStateAction<string>>;
};

function getApprovedLeaveWarning(trade: ShiftTrade) {
  const conflict = trade.approvedLeaveConflict;

  if (!conflict) {
    return "";
  }

  return `

ADVARSEL: Du har godkendt fravær, der overlapper vagten.
Fravær: ${formatShiftDate(conflict.startDate)} · ${formatShiftTime(
    conflict.startDate,
    conflict.endDate,
  )}

Du kan stadig acceptere vagten, men dit godkendte fravær ændres ikke automatisk.`;
}

export function useShiftTradeActions({
  apiFetch,
  user,
  confirmModal,
  infoDialog,
  fetchTrades,
  setMessage,
}: UseShiftTradeActionsArgs) {
  const acceptTrade = useCallback(
    (trade: ShiftTrade) => {
      if (!user) {
        return;
      }

      const offeredBy = `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`;
      const shiftInfo = `${trade.shift.workType.name} - ${formatShiftDate(
        trade.shift.startTime,
      )} kl. ${formatShiftTime(
        trade.shift.startTime,
        trade.shift.endTime,
      )}`;
      const approvedLeaveWarning =
        getApprovedLeaveWarning(trade);

      confirmModal.confirm({
        title: trade.approvedLeaveConflict
          ? "Acceptér vagt trods fravær"
          : "Acceptér vagt",
        description: `Er du sikker på, at du vil acceptere denne vagt fra ${offeredBy}?

${shiftInfo}${approvedLeaveWarning}`,
        confirmText: trade.approvedLeaveConflict
          ? "Acceptér trods fravær"
          : "Acceptér",
        cancelText: "Annuller",
        confirmVariant: "success",
        onConfirm: async () => {
          const response = await apiFetch(
            `/shift-trades/${trade.id}/accept`,
            {
              method: "PATCH",
              body: JSON.stringify({
                acceptedByUserId: user.id,
              }),
            },
          );

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            infoDialog.showError(
              "Kunne ikke acceptere vagt",
              data?.message ||
                "Vagten kunne ikke accepteres. Prøv igen.",
            );
            return;
          }

          setMessage("Vagten er accepteret.");
          await fetchTrades();
        },
      });
    },
    [
      apiFetch,
      confirmModal,
      fetchTrades,
      infoDialog,
      setMessage,
      user,
    ],
  );

  const rejectTrade = useCallback(
    (trade: ShiftTrade) => {
      const shiftInfo = `${trade.shift.workType.name} - ${formatShiftDate(
        trade.shift.startTime,
      )} kl. ${formatShiftTime(
        trade.shift.startTime,
        trade.shift.endTime,
      )}`;

      confirmModal.confirm({
        title: "Afvis vagt",
        description: `Er du sikker på, at du vil afvise denne vagt?

${shiftInfo}`,
        confirmText: "Afvis",
        cancelText: "Annuller",
        confirmVariant: "danger",
        onConfirm: async () => {
          const response = await apiFetch(
            `/shift-trades/${trade.id}/reject`,
            {
              method: "PATCH",
            },
          );

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            infoDialog.showError(
              "Kunne ikke afvise vagt",
              data?.message ||
                "Vagten kunne ikke afvises. Prøv igen.",
            );
            return;
          }

          setMessage("Vagten er afvist.");
          await fetchTrades();
        },
      });
    },
    [
      apiFetch,
      confirmModal,
      fetchTrades,
      infoDialog,
      setMessage,
    ],
  );

  return { acceptTrade, rejectTrade };
}
