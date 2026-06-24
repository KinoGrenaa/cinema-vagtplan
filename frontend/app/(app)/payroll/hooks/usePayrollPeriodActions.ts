import { useState } from "react";

import {
  lockPayrollPeriod,
  unlockPayrollPeriod,
} from "../services/payrollService";

type ConfirmDialog = {
  confirm: (options: {
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    confirmVariant?: "danger";
    onConfirm: () => Promise<void> | void;
  }) => void;
};

type InputDialog = {
  prompt: (options: {
    title: string;
    description: string;
    label: string;
    placeholder: string;
    confirmText: string;
    cancelText: string;
    required?: boolean;
    onConfirm: (value: string) => Promise<void> | void;
  }) => void;
};

type InfoDialog = {
  showError: (title: string, description: string) => void;
};

type UsePayrollPeriodActionsOptions = {
  confirmDialog: ConfirmDialog;
  endDate: string;
  infoDialog: InfoDialog;
  inputDialog: InputDialog;
  periodId?: Parameters<typeof unlockPayrollPeriod>[0] | null;
  refreshPayroll: () => Promise<unknown> | unknown;
  startDate: string;
};

export function usePayrollPeriodActions({
  confirmDialog,
  endDate,
  infoDialog,
  inputDialog,
  periodId,
  refreshPayroll,
  startDate,
}: UsePayrollPeriodActionsOptions) {
  const [locking, setLocking] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  function lockPeriod() {
    confirmDialog.confirm({
      title: "Lås lønperiode",
      description: `Er du sikker på, at du vil låse lønperioden ${startDate} til ${endDate}?`,
      confirmText: "Lås lønperiode",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          setLocking(true);

          await lockPayrollPeriod({
            startDate,
            endDate,
          });

          await refreshPayroll();
        } catch (error) {
          infoDialog.showError(
            "Lønperioden kunne ikke låses",
            error instanceof Error && error.message
              ? error.message
              : "Låsning fejlede. Prøv igen.",
          );
        } finally {
          setLocking(false);
        }
      },
    });
  }

  function unlockPeriod() {
    if (!periodId) return;

    inputDialog.prompt({
      title: "Genåbn lønperiode",
      description: `Skriv en intern note om hvorfor lønperioden ${startDate} til ${endDate} skal genåbnes.`,
      label: "Intern note",
      placeholder: "Skriv intern note...",
      confirmText: "Genåbn lønperiode",
      cancelText: "Annuller",
      required: true,
      onConfirm: async (value) => {
        const note = value.trim();

        if (!note) {
          return;
        }

        try {
          setUnlocking(true);

          await unlockPayrollPeriod(periodId, note);

          await refreshPayroll();
        } catch (error) {
          infoDialog.showError(
            "Lønperioden kunne ikke genåbnes",
            error instanceof Error && error.message
              ? error.message
              : "Genåbning fejlede. Prøv igen.",
          );
        } finally {
          setUnlocking(false);
        }
      },
    });
  }

  return {
    locking,
    lockPeriod,
    unlocking,
    unlockPeriod,
  };
}
