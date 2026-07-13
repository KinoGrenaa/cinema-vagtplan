"use client";

import { useState } from "react";
import { toast } from "sonner";

import { apiFetch } from "@/app/lib/api";
import type {
  PayrollAdjustmentConfirmation,
  PayrollAdjustmentEditData,
} from "../../components/modals/PayrollAdjustmentConfirmationModal";
import {
  getPayrollConflictDetails,
  getSelectedCinemaQuery,
} from "../../helpers/core/timeApprovalRequests";
import type { TimeEntry } from "../../types";
import { formatDateTime, readErrorMessage } from "../../utils";

type InfoDialog = {
  showError: (title: string, description: string) => void;
};

type InputDialog = {
  prompt: (input: any) => void;
};

type ConfirmDialog = {
  confirm: (input: any) => void;
};

type SaveEditData = PayrollAdjustmentEditData;

type UseTimeApprovalActionsOptions = {
  inputDialog: InputDialog;
  infoDialog: InfoDialog;
  errorDialog: ConfirmDialog;
  fetchEntries: () => Promise<unknown>;
};

export function useTimeApprovalActions({
  inputDialog,
  infoDialog,
  errorDialog,
  fetchEntries,
}: UseTimeApprovalActionsOptions) {
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [payrollAdjustmentConfirmation, setPayrollAdjustmentConfirmation] =
    useState<PayrollAdjustmentConfirmation | null>(null);
  const [confirmingPayrollAdjustment, setConfirmingPayrollAdjustment] =
    useState(false);

  async function submitEdit(
    data: SaveEditData,
    confirmPayrollAdjustment: boolean,
  ) {
    if (!editEntry) return false;

    try {
      setSavingEdit(true);
      const response = await apiFetch(
        `/time-entries/${editEntry.id}${getSelectedCinemaQuery()}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...data,
            confirmPayrollAdjustment,
          }),
        },
      );

      if (!response.ok) {
        if (response.status === 401) return false;

        if (response.status === 409) {
          const payload = await response.json().catch(() => null);
          const details = getPayrollConflictDetails(payload);

          if (details.code === "PAYROLL_PERIOD_LOCKED") {
            infoDialog.showError(
              "Lønperioden er låst",
              details.message ||
                "Lås lønperioden op før tidsregistreringen kan rettes.",
            );
            return false;
          }

          if (details.code === "PAYROLL_PERIOD_EXPORTED") {
            setPayrollAdjustmentConfirmation({
              entry: editEntry,
              details,
              action: "EDIT",
              editData: data,
            });
            return false;
          }
        }

        const message = await readErrorMessage(
          response,
          "Kunne ikke redigere timeregistrering",
        );
        infoDialog.showError("Kunne ikke gemme rettelsen", message);
        return false;
      }

      await fetchEntries();
      setEditEntry(null);
      toast.success(
        confirmPayrollAdjustment
          ? "Timeregistrering opdateret som efterregulering"
          : "Timeregistrering opdateret",
      );
      return true;
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke gemme rettelsen",
        error instanceof Error && error.message
          ? error.message
          : "Der opstod en fejl, da rettelsen skulle gemmes. Prøv igen.",
      );
      return false;
    } finally {
      setSavingEdit(false);
    }
  }

  async function saveEdit(data: SaveEditData) {
    if (!editEntry) return;

    const hasChanges =
      data.clockIn !== editEntry.clockIn ||
      (data.clockOut ?? null) !== (editEntry.clockOut ?? null);

    if (!hasChanges) {
      errorDialog.confirm({
        title: "Ingen ændringer",
        description: "Der er ikke foretaget nogen ændringer i tidsregistreringen.",
        confirmText: "OK",
        onConfirm: async () => {},
      });
      return;
    }

    const employeeName = `${editEntry.user.firstName} ${editEntry.user.lastName}`;
    const oldTime = `${formatDateTime(editEntry.clockIn)} - ${
      editEntry.clockOut ? formatDateTime(editEntry.clockOut) : "-"
    }`;
    const newTime = `${formatDateTime(data.clockIn)} - ${
      data.clockOut ? formatDateTime(data.clockOut) : "-"
    }`;

    errorDialog.confirm({
      title: "Bekræft rettelse",
      description: [
        "Du er ved at rette en tidsregistrering.",
        "",
        "Medarbejder:",
        employeeName,
        "",
        "Tidligere registrering:",
        oldTime,
        "",
        "Ny registrering:",
        newTime,
        "",
        "Ændringen gemmes i historikken.",
        "",
        "Hvis registreringen allerede indgår i en eksporteret lønperiode, får du en ekstra bekræftelse med perioderne.",
      ].join("\n"),
      confirmText: "Gem rettelse",
      cancelText: "Annuller",
      confirmVariant: "primary",
      onConfirm: async () => {
        await submitEdit(data, false);
      },
    });
  }

  async function approve(
    entry: TimeEntry,
    options?: { confirmPayrollAdjustment?: boolean },
  ) {
    try {
      const response = await apiFetch(
        `/time-entries/${entry.id}/approve${getSelectedCinemaQuery()}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            confirmPayrollAdjustment:
              options?.confirmPayrollAdjustment ?? false,
          }),
        },
      );

      if (!response.ok) {
        if (response.status === 401) return false;

        if (response.status === 409) {
          const payload = await response.json().catch(() => null);
          const details = getPayrollConflictDetails(payload);

          if (details.code === "PAYROLL_PERIOD_LOCKED") {
            infoDialog.showError(
              "Lønperioden er låst",
              details.message ||
                "Lås lønperioden op før tidsregistreringen kan godkendes.",
            );
            return false;
          }

          if (details.code === "PAYROLL_PERIOD_EXPORTED") {
            setPayrollAdjustmentConfirmation({
              entry,
              details,
              action: "APPROVE",
            });
            return false;
          }
        }

        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke godkende timeregistrering",
          ),
        );
      }

      await fetchEntries();
      if (options?.confirmPayrollAdjustment) {
        toast.success("Timeregistrering godkendt som efterregulering");
      } else if (entry.deviation?.hasDeviation) {
        toast.success("Timeregistrering med afvigelse er godkendt");
      } else {
        toast.success("Timeregistrering godkendt");
      }
      return true;
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke godkende timeregistrering",
        error instanceof Error
          ? error.message
          : "Kunne ikke godkende timeregistrering",
      );
      return false;
    }
  }

  async function confirmPayrollAdjustmentApproval() {
    if (!payrollAdjustmentConfirmation) return;

    const confirmation = payrollAdjustmentConfirmation;

    try {
      setConfirmingPayrollAdjustment(true);

      if (confirmation.action === "EDIT") {
        if (!confirmation.editData) return;
        const updated = await submitEdit(confirmation.editData, true);
        if (updated) {
          setPayrollAdjustmentConfirmation(null);
        }
        return;
      }

      const approved = await approve(confirmation.entry, {
        confirmPayrollAdjustment: true,
      });
      if (approved) {
        setPayrollAdjustmentConfirmation(null);
      }
    } finally {
      setConfirmingPayrollAdjustment(false);
    }
  }

  async function unapprove(id: number) {
    try {
      const response = await apiFetch(
        `/time-entries/${id}/unapprove${getSelectedCinemaQuery()}`,
        { method: "PATCH" },
      );
      if (!response.ok) {
        if (response.status === 401) return;
        throw new Error(
          await readErrorMessage(response, "Kunne ikke fjerne godkendelse"),
        );
      }
      await fetchEntries();
      toast.success("Godkendelse fjernet");
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke fjerne godkendelse",
        error instanceof Error
          ? error.message
          : "Kunne ikke fjerne godkendelse",
      );
    }
  }

  function sendBackForChanges(id: number) {
    inputDialog.prompt({
      title: "Send retur til rettelse",
      description:
        "Skriv hvorfor tidsregistreringen skal rettes. Beskeden vises til medarbejderen.",
      label: "Besked til medarbejderen",
      placeholder:
        "Fx forkert mødetid, manglende fyraften eller manglende note...",
      confirmText: "Send retur",
      cancelText: "Annuller",
      required: true,
      onConfirm: async (value: string) => {
        const adminNote = value.trim();
        if (!adminNote) {
          infoDialog.showError(
            "Besked mangler",
            "Du skal skrive en besked til medarbejderen.",
          );
          return;
        }

        try {
          const response = await apiFetch(
            `/time-entries/${id}/reject${getSelectedCinemaQuery()}`,
            {
              method: "PATCH",
              body: JSON.stringify({ adminNote }),
            },
          );
          if (!response.ok) {
            if (response.status === 401) return;
            const message = await readErrorMessage(
              response,
              "Kunne ikke sende timeregistrering retur",
            );
            infoDialog.showError("Kan ikke sendes retur", message);
            return;
          }
          await fetchEntries();
          toast.success("Timeregistrering sendt retur til rettelse");
        } catch (error) {
          infoDialog.showError(
            "Kan ikke sendes retur",
            error instanceof Error && error.message
              ? error.message
              : "Der opstod en fejl, da timeregistreringen skulle sendes retur. Prøv igen.",
          );
        }
      },
    });
  }

  function voidEntry(id: number) {
    inputDialog.prompt({
      title: "Afvis registrering",
      description:
        "Denne tidsregistrering markeres som afvist og kommer ikke med i løn. Den slettes ikke fra historikken.",
      label: "Intern note",
      placeholder:
        "Fx fejlregistrering, dobbeltregistrering eller registrering der ikke skal lønbehandles...",
      confirmText: "Afvis registrering",
      cancelText: "Annuller",
      required: true,
      onConfirm: async (value: string) => {
        const adminNote = value.trim();
        if (!adminNote) {
          infoDialog.showError(
            "Intern note mangler",
            "Du skal skrive en intern note for annulleringen.",
          );
          return;
        }

        try {
          const response = await apiFetch(
            `/time-entries/${id}/void${getSelectedCinemaQuery()}`,
            {
              method: "PATCH",
              body: JSON.stringify({ adminNote }),
            },
          );
          if (!response.ok) {
            if (response.status === 401) return;
            const message = await readErrorMessage(
              response,
              "Kunne ikke annullere tidsregistrering",
            );
            infoDialog.showError(
              "Kunne ikke annullere tidsregistrering",
              message,
            );
            return;
          }
          await fetchEntries();
          toast.success("Tidsregistrering annulleret");
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke annullere tidsregistrering",
            error instanceof Error && error.message
              ? error.message
              : "Der opstod en fejl, da tidsregistreringen skulle annulleres. Prøv igen.",
          );
        }
      },
    });
  }

  return {
    editEntry,
    setEditEntry,
    savingEdit,
    saveEdit,
    payrollAdjustmentConfirmation,
    setPayrollAdjustmentConfirmation,
    confirmingPayrollAdjustment,
    confirmPayrollAdjustmentApproval,
    approve,
    unapprove,
    sendBackForChanges,
    voidEntry,
  };
}
