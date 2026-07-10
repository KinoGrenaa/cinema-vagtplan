import { useInfoModal } from "@/app/hooks/useInfoModal";

import { useLeaveRequestCancel } from "../useLeaveRequestCancel";
import { useLeaveRequestEmployeeOptions } from "../useLeaveRequestEmployeeOptions";
import { useLeaveRequestFilters } from "../useLeaveRequestFilters";
import { useLeaveRequestForm } from "../useLeaveRequestForm";
import { useLeaveRequestsData } from "../useLeaveRequestsData";

export function useLeaveRequestsPage() {
  const infoDialog = useInfoModal();

  const {
    activeCinemaId,
    currentUser,
    currentUserId,
    fetchRequests,
    isMasterWithoutOwnCinema,
    requests,
  } = useLeaveRequestsData({
    showError: (title, description) =>
      infoDialog.showError(title, description ?? ""),
  });

  const employeeSelection = useLeaveRequestEmployeeOptions({
    activeCinemaId,
    currentUser,
    showError: (title, description) =>
      infoDialog.showError(title, description ?? ""),
  });

  const form = useLeaveRequestForm({
    activeCinemaId,
    canCreateForEmployees: employeeSelection.canCreateForEmployees,
    currentUserId,
    employeeOptions: employeeSelection.employeeOptions,
    fetchRequests,
    isMasterWithoutOwnCinema,
    showError: (title, description) =>
      infoDialog.showError(title, description ?? ""),
    showInfo: (title, description) =>
      infoDialog.show({
        title,
        description,
        variant: "success",
        buttonText: "OK",
      }),
  });

  const cancel = useLeaveRequestCancel({
    fetchRequests,
    setSuccess: form.setSuccess,
    showError: (title, description) =>
      infoDialog.showError(title, description ?? ""),
  });

  const filters = useLeaveRequestFilters(requests);

  return {
    cancel,
    currentUserId,
    employeeSelection,
    filters,
    form,
    infoDialog,
    isMasterWithoutOwnCinema,
    requests,
  };
}
