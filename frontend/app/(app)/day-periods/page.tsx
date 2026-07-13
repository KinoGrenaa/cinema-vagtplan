"use client";

import AdminGuard from "@/app/components/access/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";

import DayPeriodFormModal from "./components/form/DayPeriodFormModal";
import DayPeriodsHeader from "./components/layout/DayPeriodsHeader";
import DayPeriodsMasterCinemaRequired from "./components/layout/DayPeriodsMasterCinemaRequired";
import DayPeriodsOverviewSection from "./components/list/DayPeriodsOverviewSection";
import { useDayPeriodsPage } from "./hooks/useDayPeriodsPage";

export default function DayPeriodsPage() {
  const {
    confirmDialog,
    infoDialog,
    dayPeriods,
    loading,
    saving,
    showArchived,
    setShowArchived,
    form,
    setForm,
    formModalOpen,
    needsMasterCinemaSelection,
    isEditing,
    activeCount,
    archivedCount,
    fetchDayPeriods,
    closeFormModal,
    openCreateModal,
    openEditModal,
    submitForm,
    archiveDayPeriod,
    reactivateDayPeriod,
  } = useDayPeriodsPage();

  return (
    <AdminGuard>
      <main className="min-h-screen space-y-6 bg-gray-50 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <DayPeriodsHeader />

        {needsMasterCinemaSelection && <DayPeriodsMasterCinemaRequired />}

        {!needsMasterCinemaSelection && (
          <DayPeriodsOverviewSection
            dayPeriods={dayPeriods}
            loading={loading}
            showArchived={showArchived}
            activeCount={activeCount}
            archivedCount={archivedCount}
            onCreate={openCreateModal}
            onShowArchivedChange={setShowArchived}
            onRefresh={fetchDayPeriods}
            onEdit={openEditModal}
            onArchive={archiveDayPeriod}
            onReactivate={reactivateDayPeriod}
          />
        )}
      </main>

      {formModalOpen && (
        <DayPeriodFormModal
          form={form}
          setForm={setForm}
          isEditing={isEditing}
          saving={saving}
          onClose={closeFormModal}
          onSubmit={submitForm}
        />
      )}

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
