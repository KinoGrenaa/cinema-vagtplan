"use client";

import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";

import { usePayrollTypeActions } from "./actions/usePayrollTypeActions";
import { usePayrollTypesData } from "./data/usePayrollTypesData";

export function usePayrollTypesPage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();

  const data = usePayrollTypesData({
    showError: infoDialog.showError,
  });
  const actions = usePayrollTypeActions({
    confirm: confirmDialog.confirm,
    fetchPayrollTypes: data.fetchPayrollTypes,
    showError: infoDialog.showError,
  });

  return {
    payrollTypes: data.payrollTypes,
    loading: data.loading,
    saving: actions.saving,
    name: actions.name,
    setName: actions.setName,
    payrollCode: actions.payrollCode,
    setPayrollCode: actions.setPayrollCode,
    exportCode: actions.exportCode,
    setExportCode: actions.setExportCode,
    description: actions.description,
    setDescription: actions.setDescription,
    color: actions.color,
    setColor: actions.setColor,
    isDefault: actions.isDefault,
    setIsDefault: actions.setIsDefault,
    message: actions.message,
    confirmDialog,
    infoDialog,
    createPayrollType: actions.createPayrollType,
    toggleActive: actions.toggleActive,
    setDefault: actions.setDefault,
    updateSystemExportCode: actions.updateSystemExportCode,
    removePayrollType: actions.removePayrollType,
  };
}
