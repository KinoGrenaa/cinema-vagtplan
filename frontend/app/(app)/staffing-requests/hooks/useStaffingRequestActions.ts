import { useCallback, useState } from "react";
import { appendCinemaId, readErrorMessage } from "../helpers/staffingRequestHelpers";

type ApiFetch = (endpoint: string, init?: RequestInit) => Promise<Response>;

type UseStaffingRequestActionsParams = {
  apiFetch: ApiFetch;
  activeCinemaId: number | null;
  fetchRequests: () => Promise<void>;
  showError: (title: string, description: string) => void;
};

export function useStaffingRequestActions({
  apiFetch,
  activeCinemaId,
  fetchRequests,
  showError,
}: UseStaffingRequestActionsParams) {
  const [processingId, setProcessingId] = useState<number | null>(null);

  const acceptRequest = useCallback(
    async (id: number) => {
      try {
        setProcessingId(id);

        const response = await apiFetch(
          appendCinemaId(`/staffing-requests/${id}/accept`, activeCinemaId),
          {
            method: "PATCH",
          },
        );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Kunne ikke acceptere bemandingsforespørgsel",
            ),
          );
        }

        await fetchRequests();
      } catch (error) {
        showError(
          "Bemandingsforespørgslen kunne ikke accepteres",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl, da bemandingsforespørgslen skulle accepteres. Prøv igen.",
        );
      } finally {
        setProcessingId(null);
      }
    },
    [activeCinemaId, apiFetch, fetchRequests, showError],
  );

  const rejectRequest = useCallback(
    async (id: number) => {
      try {
        setProcessingId(id);

        const response = await apiFetch(
          appendCinemaId(`/staffing-requests/${id}/reject`, activeCinemaId),
          {
            method: "PATCH",
          },
        );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Kunne ikke afvise bemandingsforespørgsel",
            ),
          );
        }

        await fetchRequests();
      } catch (error) {
        showError(
          "Bemandingsforespørgslen kunne ikke afvises",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl, da bemandingsforespørgslen skulle afvises. Prøv igen.",
        );
      } finally {
        setProcessingId(null);
      }
    },
    [activeCinemaId, apiFetch, fetchRequests, showError],
  );

  const cancelRequest = useCallback(
    async (id: number) => {
      try {
        setProcessingId(id);

        const response = await apiFetch(
          appendCinemaId(`/staffing-requests/${id}/cancel`, activeCinemaId),
          {
            method: "PATCH",
          },
        );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Kunne ikke annullere bemandingsforespørgsel",
            ),
          );
        }

        await fetchRequests();
      } catch (error) {
        showError(
          "Bemandingsforespørgslen kunne ikke annulleres",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl, da bemandingsforespørgslen skulle annulleres. Prøv igen.",
        );
      } finally {
        setProcessingId(null);
      }
    },
    [activeCinemaId, apiFetch, fetchRequests, showError],
  );

  return {
    acceptRequest,
    cancelRequest,
    processingId,
    rejectRequest,
  };
}
