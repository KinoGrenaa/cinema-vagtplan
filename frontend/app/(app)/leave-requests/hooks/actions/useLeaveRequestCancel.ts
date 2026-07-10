import { useState } from "react";

import { apiFetch } from "@/app/lib/api";

import { readErrorMessage } from "../../helpers/core/leaveRequestHelpers";
import type { LeaveRequest } from "../../helpers/core/leaveRequestTypes";

type UseLeaveRequestCancelOptions = {
  fetchRequests: () => Promise<void>;
  setSuccess: (message: string) => void;
  showError: (title: string, description?: string) => void;
};

export function useLeaveRequestCancel({
  fetchRequests,
  setSuccess,
  showError,
}: UseLeaveRequestCancelOptions) {
  const [requestToCancel, setRequestToCancel] = useState<LeaveRequest | null>(
    null,
  );

  async function cancelLeaveRequest(requestId: number) {
    setSuccess("");

    try {
      const response = await apiFetch(`/leave-requests/${requestId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Fraværsansøgningen kunne ikke annulleres.",
          ),
        );
      }

      setRequestToCancel(null);
      setSuccess("Fraværsansøgningen er annulleret.");

      await fetchRequests();
    } catch (error) {
      showError(
        "Fraværsansøgningen kunne ikke annulleres",
        error instanceof Error ? error.message : "Der opstod en fejl.",
      );
    }
  }

  return {
    cancelLeaveRequest,
    requestToCancel,
    setRequestToCancel,
  };
}
