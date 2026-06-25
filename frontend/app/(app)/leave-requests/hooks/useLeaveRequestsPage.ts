import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useLeaveRequestCancel } from "./useLeaveRequestCancel";
import { useLeaveRequestFilters } from "./useLeaveRequestFilters";
import { useLeaveRequestForm } from "./useLeaveRequestForm";
import { useLeaveRequestsData } from "./useLeaveRequestsData";

export function useLeaveRequestsPage() {
  const infoDialog = useInfoModal();

  const { currentUserId, fetchRequests, isMasterWithoutOwnCinema, requests } =
    useLeaveRequestsData({
      showError: (title, description) =>
        infoDialog.showError(title, description ?? ""),
    });

  const form = useLeaveRequestForm({
    fetchRequests,
    isMasterWithoutOwnCinema,
    showError: (title, description) =>
      infoDialog.showError(title, description ?? ""),
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
    filters,
    form,
    infoDialog,
    isMasterWithoutOwnCinema,
    requests,
  };
}
