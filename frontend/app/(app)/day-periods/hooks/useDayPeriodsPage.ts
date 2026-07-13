"use client";

import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";

import { useDayPeriodActions } from "./actions/useDayPeriodActions";
import { useDayPeriodsData } from "./data/useDayPeriodsData";

export function useDayPeriodsPage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();

  const data = useDayPeriodsData({
    showError: infoDialog.showError,
  });

  const actions = useDayPeriodActions({
    activeCinemaId: data.activeCinemaId,
    needsMasterCinemaSelection: data.needsMasterCinemaSelection,
    fetchDayPeriods: data.fetchDayPeriods,
    confirm: confirmDialog.confirm,
    show: infoDialog.show,
    showError: infoDialog.showError,
  });

  return {
    confirmDialog,
    infoDialog,
    dayPeriods: data.dayPeriods,
    loading: data.loading,
    showArchived: data.showArchived,
    setShowArchived: data.setShowArchived,
    needsMasterCinemaSelection: data.needsMasterCinemaSelection,
    activeCount: data.activeCount,
    archivedCount: data.archivedCount,
    fetchDayPeriods: data.fetchDayPeriods,
    saving: actions.saving,
    form: actions.form,
    setForm: actions.setForm,
    formModalOpen: actions.formModalOpen,
    isEditing: actions.isEditing,
    closeFormModal: actions.closeFormModal,
    openCreateModal: actions.openCreateModal,
    openEditModal: actions.openEditModal,
    submitForm: actions.submitForm,
    archiveDayPeriod: actions.archiveDayPeriod,
    reactivateDayPeriod: actions.reactivateDayPeriod,
  };
}
