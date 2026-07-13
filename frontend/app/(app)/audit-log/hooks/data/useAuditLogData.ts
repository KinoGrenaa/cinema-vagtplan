import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { readErrorMessage } from "../../helpers/core/auditLogHelpers";
import type { AuditLog } from "../../helpers/core/auditLogTypes";

type AuditLogUserContext = {
  role?: string;
  cinemaId?: number | string | null;
} | null | undefined;

type UseAuditLogDataParams = {
  user: AuditLogUserContext;
  showError: (title: string, description: string) => void;
};

export function useAuditLogData({
  user,
  showError,
}: UseAuditLogDataParams) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    string | null
  >(null);

  const needsMasterCinemaSelection =
    user?.role === "MASTER" && !user.cinemaId && !selectedMasterCinemaId;

  useEffect(() => {
    function updateSelectedMasterCinema() {
      setSelectedMasterCinemaId(
        window.localStorage.getItem("masterSelectedCinemaId"),
      );
    }

    updateSelectedMasterCinema();
    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedMasterCinema,
    );
    window.addEventListener("storage", updateSelectedMasterCinema);

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedMasterCinema,
      );
      window.removeEventListener("storage", updateSelectedMasterCinema);
    };
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedMasterCinemaId, user?.role, user?.cinemaId]);

  async function fetchLogs() {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    if (needsMasterCinemaSelection) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const endpoint =
        user.role === "MASTER" && !user.cinemaId && selectedMasterCinemaId
          ? `/audit-logs?cinemaId=${encodeURIComponent(selectedMasterCinemaId)}`
          : "/audit-logs";

      const response = await apiFetch(endpoint);
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke hente ændringshistorik.",
          ),
        );
      }

      const data = await response.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      showError(
        "Kunne ikke hente ændringshistorik",
        error instanceof Error
          ? error.message
          : "Der opstod en uventet fejl under hentning af ændringshistorikken.",
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    logs,
    loading,
    needsMasterCinemaSelection,
  };
}
