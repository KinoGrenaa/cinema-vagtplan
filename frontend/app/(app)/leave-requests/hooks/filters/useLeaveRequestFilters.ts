"use client";

import { useMemo, useState } from "react";

import {
  countLeaveStatuses,
  getActiveFilterCount,
  getFilterSummary,
  getGroupKey,
  isRequestVisibleByStatus,
  requestOverlapsDateFilter,
} from "../../helpers/core/leaveRequestHelpers";
import {
  DEFAULT_STATUS_FILTERS,
  type LeaveRequest,
  type LeaveStatusFilters,
} from "../../helpers/core/leaveRequestTypes";

export function useLeaveRequestFilters(requests: LeaveRequest[]) {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [statusFilters, setStatusFilters] = useState<LeaveStatusFilters>(
    DEFAULT_STATUS_FILTERS,
  );
  const [draftStatusFilters, setDraftStatusFilters] =
    useState<LeaveStatusFilters>(DEFAULT_STATUS_FILTERS);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [draftFilterStartDate, setDraftFilterStartDate] = useState("");
  const [draftFilterEndDate, setDraftFilterEndDate] = useState("");
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<string[]>([]);

  const visibleRequests = useMemo(() => {
    return requests.filter(
      (request) =>
        isRequestVisibleByStatus(request, statusFilters) &&
        requestOverlapsDateFilter(request, filterStartDate, filterEndDate),
    );
  }, [filterEndDate, filterStartDate, requests, statusFilters]);

  const statusCounts = useMemo(() => countLeaveStatuses(requests), [requests]);

  const activeFilterCount = useMemo(
    () => getActiveFilterCount(statusFilters, filterStartDate, filterEndDate),
    [filterEndDate, filterStartDate, statusFilters],
  );

  const filterSummary = useMemo(
    () => getFilterSummary(statusFilters, filterStartDate, filterEndDate),
    [filterEndDate, filterStartDate, statusFilters],
  );

  const groupedRequests = useMemo(() => {
    const groups = new Map<string, LeaveRequest[]>();

    for (const request of visibleRequests) {
      const key = getGroupKey(request);
      const existing = groups.get(key) || [];
      groups.set(key, [...existing, request]);
    }

    return Array.from(groups.entries())
      .map(([key, groupRequests]) => ({
        key,
        requests: groupRequests.sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        ),
      }))
      .sort(
        (a, b) =>
          new Date(a.requests[0].startDate).getTime() -
          new Date(b.requests[0].startDate).getTime(),
      );
  }, [visibleRequests]);

  function openFilterModal() {
    setDraftStatusFilters(statusFilters);
    setDraftFilterStartDate(filterStartDate);
    setDraftFilterEndDate(filterEndDate);
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
    setFilterStartDate(draftFilterStartDate);
    setFilterEndDate(draftFilterEndDate);
    setExpandedGroupKeys([]);
    setShowFilterModal(false);
  }

  function resetFilter() {
    setDraftStatusFilters(DEFAULT_STATUS_FILTERS);
    setStatusFilters(DEFAULT_STATUS_FILTERS);
    setDraftFilterStartDate("");
    setDraftFilterEndDate("");
    setFilterStartDate("");
    setFilterEndDate("");
    setExpandedGroupKeys([]);
    setShowFilterModal(false);
  }

  function showPendingOnly() {
    setStatusFilters({
      pending: true,
      approved: false,
      rejected: false,
      cancelled: false,
    });
    setFilterStartDate("");
    setFilterEndDate("");
    setExpandedGroupKeys([]);
  }

  function toggleGroup(groupKey: string) {
    setExpandedGroupKeys((current) =>
      current.includes(groupKey)
        ? current.filter((key) => key !== groupKey)
        : [...current, groupKey],
    );
  }

  return {
    activeFilterCount,
    draftFilterEndDate,
    draftFilterStartDate,
    draftStatusFilters,
    expandedGroupKeys,
    filterSummary,
    groupedRequests,
    showFilterModal,
    statusCounts,
    visibleRequests,
    applyFilter,
    closeFilterModal,
    openFilterModal,
    resetFilter,
    setDraftFilterEndDate,
    setDraftFilterStartDate,
    showPendingOnly,
    toggleGroup,
    updateDraftStatusFilter,
  };
}
