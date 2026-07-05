import {
  buildJobFunctionsPageContentProps,
  buildJobFunctionsPageModalsProps,
} from "../helpers/jobFunctionsPageControllerProps";
import type { JobFunctionsPageControllerResult } from "../helpers/jobFunctionsPageControllerTypes";
import { useJobFunctionArchiveActions } from "./useJobFunctionArchiveActions";
import { useJobFunctionDetailsExpansion } from "./useJobFunctionDetailsExpansion";
import { useJobFunctionEmployeeAssignments } from "./useJobFunctionEmployeeAssignments";
import { useJobFunctionForm } from "./useJobFunctionForm";
import { useJobFunctionsFeedbackDialogs } from "./useJobFunctionsFeedbackDialogs";
import { useJobFunctionTimingRule } from "./useJobFunctionTimingRule";
import { useJobFunctionsData } from "./useJobFunctionsData";
import { useJobFunctionsMasterCinema } from "./useJobFunctionsMasterCinema";

export function useJobFunctionsPageController(): JobFunctionsPageControllerResult {
  const { confirmDialog, feedbackModalProps, infoDialog } =
    useJobFunctionsFeedbackDialogs();
  const { activeCinemaId, currentUser, needsMasterCinemaSelection } =
    useJobFunctionsMasterCinema();

  const data = useJobFunctionsData({
    activeCinemaId,
    currentUserReady: currentUser !== null,
    needsMasterCinemaSelection,
    showError: infoDialog.showError,
  });

  const detailsExpansion = useJobFunctionDetailsExpansion();

  const form = useJobFunctionForm({
    activeCinemaId,
    needsMasterCinemaSelection,
    refreshData: data.fetchData,
    show: infoDialog.show,
    showError: infoDialog.showError,
  });

  const assignments = useJobFunctionEmployeeAssignments({
    activeCinemaId,
    confirm: confirmDialog.confirm,
    refreshData: data.fetchData,
    showError: infoDialog.showError,
    users: data.users,
  });

  const timingRule = useJobFunctionTimingRule({
    activeCinemaId,
    confirm: confirmDialog.confirm,
    refreshData: data.fetchData,
    showError: infoDialog.showError,
  });

  const archiveActions = useJobFunctionArchiveActions({
    activeCinemaId,
    closeFormModal: form.closeFormModal,
    confirm: confirmDialog.confirm,
    editingId: form.editingId,
    refreshData: data.fetchData,
    showError: infoDialog.showError,
  });

  return {
    contentProps: buildJobFunctionsPageContentProps({
      archiveActions,
      assignments,
      data,
      detailsExpansion,
      form,
      needsMasterCinemaSelection,
      timingRule,
    }),
    pageModalProps: buildJobFunctionsPageModalsProps({
      assignments,
      data,
      form,
      timingRule,
    }),
    feedbackModalProps,
  };
}
