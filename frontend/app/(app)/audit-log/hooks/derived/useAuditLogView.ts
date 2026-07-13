import { useEffect, useMemo, useState } from "react";
import {
  getActionLabel,
  getEntityTypeLabel,
  getPerformedBy,
  getSubjectName,
  groupLogsByDate,
} from "../../helpers/core/auditLogHelpers";
import type { AuditLog } from "../../helpers/core/auditLogTypes";

type UseAuditLogViewParams = {
  isMaster: boolean;
  logs: AuditLog[];
};

export function useAuditLogView({
  isMaster,
  logs,
}: UseAuditLogViewParams) {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [expandedDateKeys, setExpandedDateKeys] = useState<string[]>([]);

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
    search,
    setSearch,
    entityFilter,
    setEntityFilter,
    expandedDateKeys,
    entityTypes,
    visibleLogs,
    groupedLogs,
    toggleDateGroup,
  };
}
