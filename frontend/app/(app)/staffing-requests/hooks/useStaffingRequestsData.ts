import { useCallback, useEffect, useMemo, useState } from "react";
import {
  appendCinemaId,
  getCurrentUserId,
  getSelectedMasterCinemaId,
  groupStaffingRequests,
  readErrorMessage,
} from "../helpers/staffingRequestHelpers";
import type { StaffingRequest } from "../helpers/staffingRequestTypes";

type ApiFetch = (endpoint: string, init?: RequestInit) => Promise<Response>;

type AuthUser = {
  id?: number;
  sub?: number;
  role?: string | null;
  cinemaId?: number | string | null;
} | null;

type UseStaffingRequestsDataParams = {
  user: AuthUser | undefined;
  apiFetch: ApiFetch;
  showError: (title: string, description: string) => void;
};

export function useStaffingRequestsData({
  user,
  apiFetch,
  showError,
}: UseStaffingRequestsDataParams) {
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);
  const [requests, setRequests] = useState<StaffingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompletedRequests, setShowCompletedRequests] = useState(false);

  const activeCinemaId = useMemo(() => {
    if (!user) return null;

    const userCinemaId = Number(user.cinemaId);

    if (Number.isInteger(userCinemaId) && userCinemaId > 0) {
      return userCinemaId;
    }

    if (user.role === "MASTER") {
      return selectedMasterCinemaId;
    }

    return null;
  }, [selectedMasterCinemaId, user]);

  const currentUserId = useMemo(() => getCurrentUserId(user), [user]);

  const isManager = user?.role === "MASTER" || user?.role === "ADMIN";

  const needsMasterCinemaSelection =
    user?.role === "MASTER" && !user.cinemaId && !selectedMasterCinemaId;

  useEffect(() => {
    function updateSelectedCinema() {
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    }

    updateSelectedCinema();

    window.addEventListener("storage", updateSelectedCinema);
    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedCinema,
    );

    return () => {
      window.removeEventListener("storage", updateSelectedCinema);
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedCinema,
      );
    };
  }, []);

  const fetchRequests = useCallback(async () => {
    if (needsMasterCinemaSelection) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch(
        appendCinemaId("/staffing-requests", activeCinemaId),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke hente bemandingsforespørgsler",
          ),
        );
      }

      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      setRequests([]);

      showError(
        "Kunne ikke hente bemandingsforespørgsler",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da bemandingsforespørgsler skulle hentes. Prøv igen.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeCinemaId, apiFetch, needsMasterCinemaSelection, showError]);

  useEffect(() => {
    if (!user) return;

    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeCinemaId, needsMasterCinemaSelection]);

  const groupedRequests = useMemo(
    () => groupStaffingRequests(requests),
    [requests],
  );

  const visibleRequests = showCompletedRequests
    ? requests
    : groupedRequests.pending;

  return {
    activeCinemaId,
    currentUserId,
    fetchRequests,
    groupedRequests,
    isManager,
    loading,
    needsMasterCinemaSelection,
    requests,
    setShowCompletedRequests,
    showCompletedRequests,
    visibleRequests,
  };
}
