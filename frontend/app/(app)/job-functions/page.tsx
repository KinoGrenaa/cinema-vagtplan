"use client";

import { useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import JobFunctionEmployeeModal from "./components/JobFunctionEmployeeModal";
import JobFunctionFormModal from "./components/JobFunctionFormModal";
import JobFunctionTimingRuleModal from "./components/JobFunctionTimingRuleModal";
import JobFunctionsMasterCinemaRequired from "./components/JobFunctionsMasterCinemaRequired";
import JobFunctionsOverviewSection from "./components/JobFunctionsOverviewSection";
import JobFunctionsPageHeader from "./components/JobFunctionsPageHeader";
import {
  emptyJobFunctionForm,
  parseJobFunctionForm,
  toJobFunctionFormState,
} from "./helpers/jobFunctionFormHelpers";
import type { JobFunctionFormState } from "./helpers/jobFunctionFormHelpers";
import type { JobFunctionWithWorkType } from "./helpers/jobFunctionPayrollHelpers";
import { appendCinemaId, readErrorMessage } from "./helpers/jobFunctionHelpers";
import type { JobFunction } from "./helpers/jobFunctionTypes";
import { useJobFunctionEmployeeAssignments } from "./hooks/useJobFunctionEmployeeAssignments";
import { useJobFunctionTimingRule } from "./hooks/useJobFunctionTimingRule";
import { useJobFunctionsData } from "./hooks/useJobFunctionsData";
import { useJobFunctionsMasterCinema } from "./hooks/useJobFunctionsMasterCinema";

export default function JobFunctionsPage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();
  const { activeCinemaId, currentUser, needsMasterCinemaSelection } =
    useJobFunctionsMasterCinema();
  const {
    activeCount,
    archivedCount,
    dayPeriods,
    fetchData,
    jobFunctions,
    loading,
    missingPayrollTypeWarning,
    payrollTypes,
    setShowArchived,
    showArchived,
    users,
  } = useJobFunctionsData({
    activeCinemaId,
    currentUserReady: currentUser !== null,
    needsMasterCinemaSelection,
    showError: infoDialog.showError,
  });

  const [saving, setSaving] = useState(false);
  const [expandedJobFunctionIds, setExpandedJobFunctionIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [form, setForm] = useState<JobFunctionFormState>(emptyJobFunctionForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);

  const {
    assignmentLoading,
    assignmentSaving,
    assignments,
    availableUsers,
    closeEmployeeModal,
    employeeModalJobFunction,
    openEmployeeModal,
    removeAssignedUser,
    assignSelectedUser,
    selectedUserId,
    setSelectedUserId,
  } = useJobFunctionEmployeeAssignments({
    activeCinemaId,
    confirm: confirmDialog.confirm,
    refreshData: fetchData,
    showError: infoDialog.showError,
    users,
  });
  const {
    archiveTimingRule,
    closeTimingRuleModal,
    openTimingRuleModal,
    saveTimingRule,
    setTimingRuleForm,
    timingModalJobFunction,
    timingRule,
    timingRuleForm,
    timingRuleLoading,
    timingRuleSaving,
  } = useJobFunctionTimingRule({
    activeCinemaId,
    confirm: confirmDialog.confirm,
    refreshData: fetchData,
    showError: infoDialog.showError,
  });

  const isEditing = editingId !== null;

  const toggleJobFunctionDetails = (jobFunctionId: number) => {
    setExpandedJobFunctionIds((current) => {
      const next = new Set(current);
      if (next.has(jobFunctionId)) {
        next.delete(jobFunctionId);
      } else {
        next.add(jobFunctionId);
      }
      return next;
    });
  };

  const resetForm = () => {
    setForm(emptyJobFunctionForm);
    setEditingId(null);
  };

  const closeFormModal = () => {
    if (saving) {
      return;
    }

    resetForm();
    setFormModalOpen(false);
  };

  const openCreateModal = () => {
    resetForm();
    setFormModalOpen(true);
  };

  const openEditModal = (jobFunction: JobFunctionWithWorkType) => {
    setEditingId(jobFunction.id);
    setForm(toJobFunctionFormState(jobFunction));
    setFormModalOpen(true);
  };

  const submitForm = async () => {
    if (needsMasterCinemaSelection) {
      infoDialog.showError(
        "Biograf mangler",
        "Vælg først en biograf i MASTER-panelet, før du gemmer jobfunktioner.",
      );
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...parseJobFunctionForm(form),
        cinemaId: activeCinemaId,
      };
      const response = await apiFetch(
        editingId
          ? appendCinemaId(`/job-functions/${editingId}`, activeCinemaId)
          : "/job-functions",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            editingId
              ? "Kunne ikke opdatere jobfunktion"
              : "Kunne ikke oprette jobfunktion",
          ),
        );
      }

      closeFormModal();
      await fetchData();
      infoDialog.show({
        title: editingId ? "Jobfunktion opdateret" : "Jobfunktion oprettet",
        description: editingId
          ? "Jobfunktionen er gemt."
          : "Jobfunktionen er oprettet og kan bruges i vagtplanlægning.",
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        editingId
          ? "Kunne ikke opdatere jobfunktion"
          : "Kunne ikke oprette jobfunktion",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da jobfunktionen skulle gemmes. Prøv igen.",
      );
    } finally {
      setSaving(false);
    }
  };

  const archiveJobFunction = (jobFunction: JobFunctionWithWorkType) => {
    confirmDialog.confirm({
      title: "Arkivér jobfunktion",
      description:
        `Vil du arkivere jobfunktionen "${jobFunction.name}"?\n\n` +
        "Historik bevares. Jobfunktionen skjules fra aktive valg og kan genaktiveres igen.",
      confirmText: "Arkivér",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            appendCinemaId(`/job-functions/${jobFunction.id}`, activeCinemaId),
            { method: "DELETE" },
          );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(
                response,
                "Kunne ikke arkivere jobfunktion",
              ),
            );
          }

          if (editingId === jobFunction.id) {
            closeFormModal();
          }

          await fetchData();
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke arkivere jobfunktion",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da jobfunktionen skulle arkiveres. Prøv igen.",
          );
        }
      },
    });
  };

  const reactivateJobFunction = (jobFunction: JobFunction) => {
    confirmDialog.confirm({
      title: "Genaktivér jobfunktion",
      description:
        `Vil du genaktivere jobfunktionen "${jobFunction.name}"?\n\n` +
        "Jobfunktionen kan igen bruges i vagtplanlægning.",
      confirmText: "Genaktivér",
      cancelText: "Annuller",
      confirmVariant: "success",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            appendCinemaId(
              `/job-functions/${jobFunction.id}/reactivate`,
              activeCinemaId,
            ),
            { method: "PATCH" },
          );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(
                response,
                "Kunne ikke genaktivere jobfunktion",
              ),
            );
          }

          await fetchData();
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke genaktivere jobfunktion",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da jobfunktionen skulle genaktiveres. Prøv igen.",
          );
        }
      },
    });
  };

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <JobFunctionsPageHeader />

          {needsMasterCinemaSelection && <JobFunctionsMasterCinemaRequired />}

          {!needsMasterCinemaSelection && (
            <JobFunctionsOverviewSection
              activeCount={activeCount}
              archivedCount={archivedCount}
              expandedJobFunctionIds={expandedJobFunctionIds}
              jobFunctions={jobFunctions}
              loading={loading}
              missingPayrollTypeWarning={missingPayrollTypeWarning}
              showArchived={showArchived}
              onArchive={archiveJobFunction}
              onCreate={openCreateModal}
              onEdit={openEditModal}
              onOpenEmployees={openEmployeeModal}
              onOpenTimingRule={openTimingRuleModal}
              onReactivate={reactivateJobFunction}
              onRefresh={fetchData}
              onShowArchivedChange={setShowArchived}
              onToggleDetails={toggleJobFunctionDetails}
            />
          )}
        </div>
      </main>

      {formModalOpen && (
        <JobFunctionFormModal
          form={form}
          isEditing={isEditing}
          payrollTypes={payrollTypes}
          saving={saving}
          setForm={setForm}
          onClose={closeFormModal}
          onSubmit={submitForm}
        />
      )}

      {timingModalJobFunction && (
        <JobFunctionTimingRuleModal
          dayPeriods={dayPeriods}
          jobFunction={timingModalJobFunction}
          timingRule={timingRule}
          timingRuleForm={timingRuleForm}
          timingRuleLoading={timingRuleLoading}
          timingRuleSaving={timingRuleSaving}
          setTimingRuleForm={setTimingRuleForm}
          onArchive={archiveTimingRule}
          onClose={closeTimingRuleModal}
          onSubmit={saveTimingRule}
        />
      )}

      {employeeModalJobFunction && (
        <JobFunctionEmployeeModal
          jobFunction={employeeModalJobFunction}
          assignments={assignments}
          assignmentLoading={assignmentLoading}
          assignmentSaving={assignmentSaving}
          availableUsers={availableUsers}
          selectedUserId={selectedUserId}
          onSelectedUserIdChange={setSelectedUserId}
          onAssignSelectedUser={assignSelectedUser}
          onRemoveAssignedUser={removeAssignedUser}
          onClose={closeEmployeeModal}
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
