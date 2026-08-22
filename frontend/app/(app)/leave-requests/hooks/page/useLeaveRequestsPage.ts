import {
  useCallback,
} from "react";

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

  const showError =
    useCallback(
      (
        title: string,
        description?: string,
      ) =>
        infoDialog.showError(
          title,
          description ??
            "",
        ),
      [
        infoDialog.showError,
      ],
    );
  const data =
    useLeaveRequestsData({
      focusedRequestId,
      showError,
    });

  const employeeSelection =
    useLeaveRequestEmployeeOptions({
      activeCinemaId:
        data.activeCinemaId,
      currentUser:
        data.currentUser,
      showError,
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
      showError,
      showInfo:
        infoDialog.showSuccess,
    });

  const cancel =
    useLeaveRequestCancel({
      fetchRequests:
        data.fetchRequests,
      setSuccess:
        form.setSuccess,
      showError,
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
