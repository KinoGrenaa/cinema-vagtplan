import {
  useInfoModal,
} from "@/app/hooks/useInfoModal";

import {
  useLeaveRequestCancel,
} from "../actions/useLeaveRequestCancel";
import {
  useLeaveRequestsData,
} from "../data/useLeaveRequestsData";
import {
  useLeaveRequestEmployeeOptions,
} from "../form/useLeaveRequestEmployeeOptions";
import {
  useLeaveRequestForm,
} from "../form/useLeaveRequestForm";

export function useLeaveRequestsPage(
  focusedRequestId?:
    number | null,
) {
  const infoDialog =
    useInfoModal();

  const data =
    useLeaveRequestsData({
      focusedRequestId,
      showError:
        (
          title,
          description,
        ) =>
          infoDialog.showError(
            title,
            description ??
              "",
          ),
    });

  const employeeSelection =
    useLeaveRequestEmployeeOptions({
      activeCinemaId:
        data.activeCinemaId,
      currentUser:
        data.currentUser,
      showError:
        (
          title,
          description,
        ) =>
          infoDialog.showError(
            title,
            description ??
              "",
          ),
    });

  const form =
    useLeaveRequestForm({
      activeCinemaId:
        data.activeCinemaId,
      canCreateForEmployees:
        employeeSelection.canCreateForEmployees,
      currentUserId:
        data.currentUserId,
      employeeOptions:
        employeeSelection.employeeOptions,
      fetchRequests:
        data.fetchRequests,
      isMasterWithoutOwnCinema:
        data.isMasterWithoutOwnCinema,
      showError:
        (
          title,
          description,
        ) =>
          infoDialog.showError(
            title,
            description ??
              "",
          ),
      showInfo:
        (
          title,
          description,
        ) =>
          infoDialog.show({
            title,
            description,
            variant:
              "success",
            buttonText:
              "OK",
          }),
    });

  const cancel =
    useLeaveRequestCancel({
      fetchRequests:
        data.fetchRequests,
      setSuccess:
        form.setSuccess,
      showError:
        (
          title,
          description,
        ) =>
          infoDialog.showError(
            title,
            description ??
              "",
          ),
    });

  return {
    cancel,
    currentUserId:
      data.currentUserId,
    employeeSelection,
    filters:
      data.filters,
    form,
    infoDialog,
    isMasterWithoutOwnCinema:
      data.isMasterWithoutOwnCinema,
    requests:
      data.requests,
  };
}
