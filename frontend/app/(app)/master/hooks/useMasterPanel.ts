"use client";

import { useInfoModal } from "@/app/hooks/useInfoModal";

import { useMasterCinemaActions } from "./actions/useMasterCinemaActions";
import { useMasterPanelData } from "./data/useMasterPanelData";

export function useMasterPanel() {
  const infoDialog = useInfoModal();

  const data = useMasterPanelData({
    showError: infoDialog.showError,
  });

  const actions = useMasterCinemaActions({
    saveSelectedCinema: data.saveSelectedCinema,
    selectedCinemaId: data.selectedCinemaId,
    setCinemas: data.setCinemas,
    setMessage: data.setMessage,
    showError: infoDialog.showError,
  });

  return {
    infoDialog,
    checkedAccess: data.checkedAccess,
    currentUser: data.currentUser,
    cinemas: data.cinemas,
    loading: data.loading,
    creating: actions.creating,
    savingCinemaId: actions.savingCinemaId,
    newCinemaName: actions.newCinemaName,
    selectedCinemaId: data.selectedCinemaId,
    editingCinemaId: actions.editingCinemaId,
    editingCinemaName: actions.editingCinemaName,
    message: data.message,
    selectedCinema: data.selectedCinema,
    fetchCinemas: data.fetchCinemas,
    saveSelectedCinema: data.saveSelectedCinema,
    createCinema: actions.createCinema,
    startEditingCinema: actions.startEditingCinema,
    cancelEditingCinema: actions.cancelEditingCinema,
    saveCinemaName: actions.saveCinemaName,
    setNewCinemaName: actions.setNewCinemaName,
    setEditingCinemaName: actions.setEditingCinemaName,
  };
}
