import { buildJobFunctionsPageContentProps } from "../../helpers/page/jobFunctionsPageContentProps";
import { buildJobFunctionsPageModalsProps } from "../../helpers/page/jobFunctionsPageModalProps";
import type { JobFunctionsPageControllerResult } from "../../helpers/types/jobFunctionsPageControllerTypes";
import { useJobFunctionArchiveActions } from "../actions/useJobFunctionArchiveActions";
import { useJobFunctionDetailsExpansion } from "../ui/useJobFunctionDetailsExpansion";
import { useJobFunctionEmployeeAssignments } from "../actions/useJobFunctionEmployeeAssignments";
import { useJobFunctionForm } from "../actions/useJobFunctionForm";
import { useJobFunctionsFeedbackDialogs } from "./useJobFunctionsFeedbackDialogs";
import { useJobFunctionTimingRule } from "../actions/useJobFunctionTimingRule";
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
