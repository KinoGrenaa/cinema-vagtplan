import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import {
  getActionLabel,
  getEntityTypeLabel,
  getPerformedBy,
  getSubjectName,
  groupLogsByDate,
  readErrorMessage,
} from "../../helpers/core/auditLogHelpers";
import type { AuditLog } from "../../helpers/core/auditLogTypes";

type AuditLogUserContext = {
  role?: string;
  cinemaId?: number | string | null;
} | null | undefined;

type UseAuditLogDataParams = {
  isMaster: boolean;
  user: AuditLogUserContext;
  showError: (title: string, description: string) => void;
};

export function useAuditLogData({
  isMaster,
  user,
  showError,
}: UseAuditLogDataParams) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [expandedDateKeys, setExpandedDateKeys] = useState<string[]>([]);
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

  const entityTypes = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.entityType))).sort();
  }, [logs]);

  const visibleLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return logs.filter((log) => {
      if (entityFilter !== "ALL" && log.entityType !== entityFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        log.action,
        getActionLabel(log.action),
        log.entityType,
        getEntityTypeLabel(log.entityType),
        log.entityId?.toString(),
        log.description,
        getSubjectName(log),
        getPerformedBy(log),
        log.user?.email,
        log.subjectUser?.email,
        isMaster ? log.cinema?.name : undefined,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [logs, search, entityFilter, isMaster]);

  const groupedLogs = useMemo(() => {
    return groupLogsByDate(visibleLogs);
  }, [visibleLogs]);

  useEffect(() => {
    setExpandedDateKeys((current) => {
      const validKeys = groupedLogs.map((group) => group.dateKey);
      if (validKeys.length === 0) {
        return [];
      }

      const currentValidKeys = current.filter((dateKey) =>
        validKeys.includes(dateKey),
      );
      const latestDateKey = validKeys[0];
      const nextKeys = currentValidKeys.includes(latestDateKey)
        ? currentValidKeys
        : [latestDateKey, ...currentValidKeys];
      const isUnchanged =
        nextKeys.length === current.length &&
        nextKeys.every((dateKey, index) => dateKey === current[index]);

      return isUnchanged ? current : nextKeys;
    });
  }, [groupedLogs]);

  function toggleDateGroup(dateKey: string) {
    setExpandedDateKeys((current) =>
      current.includes(dateKey)
        ? current.filter((currentDateKey) => currentDateKey !== dateKey)
        : [dateKey, ...current],
    );
  }

  return {
    logs,
    loading,
    search,
    setSearch,
    entityFilter,
    setEntityFilter,
    expandedDateKeys,
    needsMasterCinemaSelection,
    entityTypes,
    visibleLogs,
    groupedLogs,
    toggleDateGroup,
  };
}
