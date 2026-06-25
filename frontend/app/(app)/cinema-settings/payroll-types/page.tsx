"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";

import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";

import { toast } from "sonner";

import { PayrollTypeCreateForm } from "./components/PayrollTypeCreateForm";
import { PayrollTypesHeader } from "./components/PayrollTypesHeader";
import { PayrollTypesTable } from "./components/PayrollTypesTable";
import { getErrorMessage, readErrorMessage } from "./helpers/payrollTypeHelpers";
import type { PayrollType } from "./helpers/payrollTypeTypes";

export default function PayrollTypesPage() {
  const [payrollTypes, setPayrollTypes] = useState<PayrollType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [payrollCode, setPayrollCode] = useState("");
  const [exportCode, setExportCode] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [isDefault, setIsDefault] = useState(false);
  const [message, setMessage] = useState("");
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();

  useEffect(() => {
    fetchPayrollTypes();
  }, []);

  async function fetchPayrollTypes() {
    try {
      setLoading(true);

      const response = await apiFetch("/payroll-types");

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente lønarter"),
        );
      }

      const data = await response.json();
      setPayrollTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      setPayrollTypes([]);

      infoDialog.showError(
        "Kunne ikke hente lønarter",
        getErrorMessage(error, "Lønarterne kunne ikke hentes. Prøv igen."),
      );
    } finally {
      setLoading(false);
    }
  }

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
          await readErrorMessage(response, "Kunne ikke oprette lønart"),
        );
      }

      setName("");
      setPayrollCode("");
      setExportCode("");
      setDescription("");
      setColor("#2563eb");
      setIsDefault(false);

      await fetchPayrollTypes();

      setMessage("Lønart oprettet.");
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke oprette lønart",
        getErrorMessage(error, "Lønarten kunne ikke oprettes. Prøv igen."),
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
          await readErrorMessage(response, "Kunne ikke opdatere lønart"),
        );
      }

      await fetchPayrollTypes();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke opdatere lønart",
        getErrorMessage(error, "Lønarten kunne ikke opdateres. Prøv igen."),
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
          await readErrorMessage(response, "Kunne ikke vælge standard lønart"),
        );
      }

      await fetchPayrollTypes();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke vælge standard lønart",
        getErrorMessage(error, "Standard lønart kunne ikke vælges. Prøv igen."),
      );
    }
  }

  async function removePayrollType(id: number) {
    confirmDialog.confirm({
      title: "Slet lønart",
      description: "Er du sikker på at du vil slette denne lønart?",
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
              await readErrorMessage(response, "Kunne ikke slette lønart"),
            );
          }

          await fetchPayrollTypes();

          toast.success("Lønart slettet");
        } catch (error) {
              infoDialog.showError(
            "Kunne ikke slette lønart",
            getErrorMessage(error, "Lønarten kunne ikke slettes. Prøv igen."),
          );
        }
      },
    });
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <PayrollTypesHeader />

          <PayrollTypeCreateForm
            name={name}
            setName={setName}
            payrollCode={payrollCode}
            setPayrollCode={setPayrollCode}
            exportCode={exportCode}
            setExportCode={setExportCode}
            description={description}
            setDescription={setDescription}
            color={color}
            setColor={setColor}
            isDefault={isDefault}
            setIsDefault={setIsDefault}
            saving={saving}
            message={message}
            onCreate={createPayrollType}
          />

          <PayrollTypesTable
            payrollTypes={payrollTypes}
            loading={loading}
            onToggleActive={toggleActive}
            onSetDefault={setDefault}
            onRemovePayrollType={removePayrollType}
          />
        </div>
      </main>

      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        confirmVariant={confirmDialog.confirmVariant}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </AdminGuard>
  );
}
