import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  groupLogsByDate,
} from "../../helpers/core/auditLogHelpers";
import type {
  AuditLog,
} from "../../helpers/core/auditLogTypes";

type UseAuditLogViewParams = {
  logs:
    AuditLog[];
};

export function useAuditLogView({
  logs,
}: UseAuditLogViewParams) {
  const [
    expandedDateKeys,
    setExpandedDateKeys,
  ] =
    useState<string[]>([]);

  const groupedLogs =
    useMemo(
      () =>
        groupLogsByDate(
          logs,
        ),
      [logs],
    );

  useEffect(() => {
    setExpandedDateKeys(
      (current) => {
        const validKeys =
          groupedLogs.map(
            (group) =>
              group.dateKey,
          );

        if (
          validKeys.length ===
          0
        ) {
          return [];
        }

        const currentValidKeys =
          current.filter(
            (dateKey) =>
              validKeys.includes(
                dateKey,
              ),
          );
        const latestDateKey =
          validKeys[0];
        const nextKeys =
          currentValidKeys.includes(
            latestDateKey,
          )
            ? currentValidKeys
            : [
                latestDateKey,
                ...currentValidKeys,
              ];
        const isUnchanged =
          nextKeys.length ===
            current.length &&
          nextKeys.every(
            (
              dateKey,
              index,
            ) =>
              dateKey ===
              current[index],
          );

        return isUnchanged
          ? current
          : nextKeys;
      },
    );
  }, [groupedLogs]);

  function toggleDateGroup(
    dateKey: string,
  ) {
    setExpandedDateKeys(
      (current) =>
        current.includes(
          dateKey,
        )
          ? current.filter(
              (
                currentDateKey,
              ) =>
                currentDateKey !==
                dateKey,
            )
          : [
              dateKey,
              ...current,
            ],
    );
  }

  return {
    expandedDateKeys,
    groupedLogs,
    toggleDateGroup,
  };
}
