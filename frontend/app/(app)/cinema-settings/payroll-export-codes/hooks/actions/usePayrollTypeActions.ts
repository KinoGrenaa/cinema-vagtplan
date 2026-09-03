"use client";

import { useState } from "react";
import { toast } from "sonner";

import { apiFetch } from "@/app/lib/api";

import {
  getErrorMessage,
  readErrorMessage,
} from "../../helpers/core/payrollTypeHelpers";
import type { PayrollType } from "../../helpers/core/payrollTypeTypes";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  confirmVariant: "danger";
  onConfirm: () => Promise<void>;
};

type UsePayrollTypeActionsOptions = {
  confirm: (options: ConfirmOptions) => void;
  fetchPayrollTypes: () => Promise<void>;
  showError: (title: string, description: string) => void;
};

export function usePayrollTypeActions({
  confirm,
  fetchPayrollTypes,
  showError,
}: UsePayrollTypeActionsOptions) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [payrollCode, setPayrollCode] = useState("");
  const [exportCode, setExportCode] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [isDefault, setIsDefault] = useState(false);
  const [message, setMessage] = useState("");

  async function createPayrollType() {
    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch("/payroll-types", {
        method: "POST",
        body: JSON.stringify({
          name,
          payrollCode,
          exportCode,
          description,
          color,
          isDefault,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke oprette eksportkode"),
        );
      }

      setName("");
      setPayrollCode("");
      setExportCode("");
      setDescription("");
      setColor("#2563eb");
      setIsDefault(false);
      await fetchPayrollTypes();
      setMessage("Eksportkode oprettet.");
    } catch (error) {
      showError(
        "Kunne ikke oprette eksportkode",
        getErrorMessage(error, "Eksportkoden kunne ikke oprettes. Prøv igen."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(payrollType: PayrollType) {
    try {
      const response = await apiFetch(`/payroll-types/${payrollType.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          isActive: !payrollType.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke opdatere eksportkode"),
        );
      }
      await fetchPayrollTypes();
    } catch (error) {
      showError(
        "Kunne ikke opdatere eksportkode",
        getErrorMessage(error, "Eksportkoden kunne ikke opdateres. Prøv igen."),
      );
    }
  }

  async function setDefault(payrollType: PayrollType) {
    try {
      const response = await apiFetch(`/payroll-types/${payrollType.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          isDefault: true,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke vælge standardeksportkode"),
        );
      }

      await fetchPayrollTypes();
    } catch (error) {
      showError(
        "Kunne ikke vælge standardeksportkode",
        getErrorMessage(error, "Standardeksportkode kunne ikke vælges. Prøv igen."),
      );
    }
  }

  async function updateSystemExportCode(
    payrollType: PayrollType,
    nextExportCode: string,
  ) {
    try {
      const response = await apiFetch(
        `/payroll-types/${payrollType.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            exportCode: nextExportCode,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke gemme eksportkode til manuel registrering",
          ),
        );
      }

      await fetchPayrollTypes();
      toast.success(
        "Eksportkode til manuel registrering gemt",
      );
    } catch (error) {
      showError(
        "Kunne ikke gemme eksportkode",
        getErrorMessage(
          error,
          "Eksportkoden til manuel registrering kunne ikke gemmes. Prøv igen.",
        ),
      );
    }
  }

  function removePayrollType(id: number) {
    confirm({
      title: "Slet eksportkode",
      description: "Er du sikker på at du vil slette denne eksportkode?",
      confirmText: "Slet",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const response = await apiFetch(`/payroll-types/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            throw new Error(
              await readErrorMessage(response, "Kunne ikke slette eksportkode"),
            );
          }

          await fetchPayrollTypes();
          toast.success("Eksportkode slettet");
        } catch (error) {
          showError(
            "Kunne ikke slette eksportkode",
            getErrorMessage(error, "Eksportkoden kunne ikke slettes. Prøv igen."),
          );
        }
      },
    });
  }

  return {
    color,
    createPayrollType,
    description,
    exportCode,
    isDefault,
    message,
    name,
    payrollCode,
    removePayrollType,
    saving,
    setColor,
    setDefault,
    setDescription,
    setExportCode,
    setIsDefault,
    setName,
    setPayrollCode,
    toggleActive,
    updateSystemExportCode,
  };
}
