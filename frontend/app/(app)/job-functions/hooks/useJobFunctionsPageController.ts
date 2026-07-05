import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import {
  buildJobFunctionsFeedbackModalsProps,
  buildJobFunctionsPageContentProps,
  buildJobFunctionsPageModalsProps,
} from "../helpers/jobFunctionsPageControllerProps";
import type { JobFunctionsFeedbackModalsProps } from "../components/JobFunctionsFeedbackModals";
import type { JobFunctionsPageContentProps } from "../components/JobFunctionsPageContent";
import type { JobFunctionsPageModalsProps } from "../components/JobFunctionsPageModals";
import { useJobFunctionArchiveActions } from "./useJobFunctionArchiveActions";
import { useJobFunctionDetailsExpansion } from "./useJobFunctionDetailsExpansion";
import { useJobFunctionEmployeeAssignments } from "./useJobFunctionEmployeeAssignments";
import { useJobFunctionForm } from "./useJobFunctionForm";
import { useJobFunctionTimingRule } from "./useJobFunctionTimingRule";
import { useJobFunctionsData } from "./useJobFunctionsData";
import { useJobFunctionsMasterCinema } from "./useJobFunctionsMasterCinema";

type UseJobFunctionsPageControllerResult = {
  contentProps: JobFunctionsPageContentProps;
  feedbackModalProps: JobFunctionsFeedbackModalsProps;
  pageModalProps: JobFunctionsPageModalsProps;
};

export function useJobFunctionsPageController(): UseJobFunctionsPageControllerResult {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();
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
    feedbackModalProps: buildJobFunctionsFeedbackModalsProps({
      confirmDialog,
      infoDialog,
    }),
  };
}
