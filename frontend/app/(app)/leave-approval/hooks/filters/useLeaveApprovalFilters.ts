"use client";

import { useMemo, useState } from "react";

import { formatDateDK } from "@/app/utils/dateTime";

import {
  getActiveFilterCount,
  getLeaveDateGroupMeta,
  getStatusFilterSummary,
  getUserName,
  makeDateGroupExpansionKey,
  matchesDateFilter,
  matchesStatusFilter,
} from "../../helpers/leaveApprovalHelpers";
import type {
  LeaveDateGroup,
  LeaveRequest,
  LeaveStatusFilters,
} from "../../helpers/leaveApprovalTypes";
import { DEFAULT_STATUS_FILTERS } from "../../helpers/leaveApprovalTypes";

export function useLeaveApprovalFilters(requests: LeaveRequest[]) {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [statusFilters, setStatusFilters] = useState<LeaveStatusFilters>(
    DEFAULT_STATUS_FILTERS,
  );
  const [draftStatusFilters, setDraftStatusFilters] =
    useState<LeaveStatusFilters>(DEFAULT_STATUS_FILTERS);
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [draftStartDateFilter, setDraftStartDateFilter] = useState("");
  const [draftEndDateFilter, setDraftEndDateFilter] = useState("");
  const [expandedUserIds, setExpandedUserIds] = useState<number[]>([]);
  const [expandedDateGroupKeys, setExpandedDateGroupKeys] = useState<string[]>(
    [],
  );

  const visibleRequests = useMemo(() => {
    return requests.filter((request) => {
      return (
        matchesStatusFilter(request, statusFilters) &&
        matchesDateFilter(request, startDateFilter, endDateFilter)
      );
    });
  }, [endDateFilter, requests, startDateFilter, statusFilters]);

  const groupedRequests = useMemo(() => {
    const groups = new Map<number, LeaveRequest[]>();

    for (const request of visibleRequests) {
      const existing = groups.get(request.user.id) || [];
      groups.set(request.user.id, [...existing, request]);
    }

    return Array.from(groups.entries())
      .map(([userId, userRequests]) => {
        const sortedRequests = userRequests.sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        );

        const dateGroups = new Map<string, LeaveDateGroup>();

        for (const request of sortedRequests) {
          const meta = getLeaveDateGroupMeta(request);
          const existing = dateGroups.get(meta.key);

          if (existing) {
            dateGroups.set(meta.key, {
              ...existing,
              requests: [...existing.requests, request],
            });
          } else {
            dateGroups.set(meta.key, {
              ...meta,
              requests: [request],
            });
          }
        }

        return {
          userId,
          userName: getUserName(sortedRequests[0]),
          requests: sortedRequests,
          dateGroups: Array.from(dateGroups.values()).sort(
            (a, b) => a.sortTime - b.sortTime,
          ),
        };
      })
      .sort((a, b) => a.userName.localeCompare(b.userName, "da-DK"));
  }, [visibleRequests]);

  const activeFilterCount = useMemo(() => {
    return getActiveFilterCount(statusFilters, startDateFilter, endDateFilter);
  }, [endDateFilter, startDateFilter, statusFilters]);

  const statusFilterSummary = useMemo(() => {
    return getStatusFilterSummary(statusFilters);
  }, [statusFilters]);

  const dateFilterSummary = useMemo(() => {
    if (startDateFilter && endDateFilter) {
      return `${formatDateDK(startDateFilter)} til ${formatDateDK(
        endDateFilter,
      )}`;
    }

    if (startDateFilter) {
      return `Fra ${formatDateDK(startDateFilter)}`;
    }

    if (endDateFilter) {
      return `Til ${formatDateDK(endDateFilter)}`;
    }

    return "Alle datoer";
  }, [endDateFilter, startDateFilter]);

  function openFilterModal() {
    setDraftStatusFilters(statusFilters);
    setDraftStartDateFilter(startDateFilter);
    setDraftEndDateFilter(endDateFilter);
    setShowFilterModal(true);
  }

  function closeFilterModal() {
    setShowFilterModal(false);
  }

  function updateDraftStatusFilter(
    key: keyof LeaveStatusFilters,
    checked: boolean,
  ) {
    setDraftStatusFilters((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  function applyFilter() {
    setStatusFilters(draftStatusFilters);
    setStartDateFilter(draftStartDateFilter);
    setEndDateFilter(draftEndDateFilter);
    setExpandedUserIds([]);
    setExpandedDateGroupKeys([]);
    setShowFilterModal(false);
  }

  function resetFilter() {
    setStatusFilters(DEFAULT_STATUS_FILTERS);
    setDraftStatusFilters(DEFAULT_STATUS_FILTERS);
    setStartDateFilter("");
    setEndDateFilter("");
    setDraftStartDateFilter("");
    setDraftEndDateFilter("");
    setExpandedUserIds([]);
    setExpandedDateGroupKeys([]);
    setShowFilterModal(false);
  }

  function showOnlyPending() {
    setStatusFilters({
      pending: true,
      approved: false,
      rejected: false,
      cancelled: false,
    });
    setExpandedUserIds([]);
    setExpandedDateGroupKeys([]);
  }

  function toggleUserGroup(userId: number) {
    setExpandedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  function toggleDateGroup(userId: number, dateKey: string) {
    const expansionKey = makeDateGroupExpansionKey(userId, dateKey);

    setExpandedDateGroupKeys((current) =>
      current.includes(expansionKey)
        ? current.filter((key) => key !== expansionKey)
        : [...current, expansionKey],
    );
  }

  return {
    showFilterModal,
    draftStatusFilters,
    draftStartDateFilter,
    draftEndDateFilter,
    setDraftStartDateFilter,
    setDraftEndDateFilter,
    expandedUserIds,
    expandedDateGroupKeys,
    visibleRequests,
    groupedRequests,
    activeFilterCount,
    statusFilterSummary,
    dateFilterSummary,
    openFilterModal,
    closeFilterModal,
    updateDraftStatusFilter,
    applyFilter,
    resetFilter,
    showOnlyPending,
    toggleUserGroup,
    toggleDateGroup,
  };
}
