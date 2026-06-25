"use client";

import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";

import { PayrollTypeCreateForm } from "./components/PayrollTypeCreateForm";
import { PayrollTypesHeader } from "./components/PayrollTypesHeader";
import { PayrollTypesTable } from "./components/PayrollTypesTable";
import { usePayrollTypesPage } from "./hooks/usePayrollTypesPage";

export default function PayrollTypesPage() {
  const {
    payrollTypes,
    loading,
    saving,
    name,
    setName,
    payrollCode,
    setPayrollCode,
    exportCode,
    setExportCode,
    description,
    setDescription,
    color,
    setColor,
    isDefault,
    setIsDefault,
    message,
    confirmDialog,
    infoDialog,
    createPayrollType,
    toggleActive,
    setDefault,
    removePayrollType,
  } = usePayrollTypesPage();

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
