"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

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

export function useLeaveRequestFilters(
  requests: LeaveRequest[],
  focusedRequestId?:
    number | null,
) {
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

  const requestsInDateRange = useMemo(() => {
    return requests.filter((request) =>
      requestOverlapsDateFilter(request, filterStartDate, filterEndDate),
    );
  }, [filterEndDate, filterStartDate, requests]);

  const visibleRequests = useMemo(() => {
    return requestsInDateRange.filter((request) =>
      isRequestVisibleByStatus(request, statusFilters),
    );
  }, [requestsInDateRange, statusFilters]);

  const focusedVisibleRequests =
    useMemo(() => {
      if (!focusedRequestId) {
        return visibleRequests;
      }

      const focusedRequest =
        requests.find(
          (request) =>
            request.id ===
            focusedRequestId,
        );

      if (
        !focusedRequest ||
        visibleRequests.some(
          (request) =>
            request.id ===
            focusedRequestId,
        )
      ) {
        return visibleRequests;
      }

      return [
        focusedRequest,
        ...visibleRequests,
      ];
    }, [
      focusedRequestId,
      requests,
      visibleRequests,
    ]);

  const statusCounts = useMemo(
    () => countLeaveStatuses(requestsInDateRange),
    [requestsInDateRange],
  );
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

    for (const request of focusedVisibleRequests) {
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
  }, [focusedVisibleRequests]);

  useEffect(() => {
    if (!focusedRequestId) {
      return;
    }

    const focusedRequest =
      requests.find(
        (request) =>
          request.id ===
          focusedRequestId,
      );

    if (!focusedRequest) {
      return;
    }

    const focusedGroupKey =
      getGroupKey(
        focusedRequest,
      );

    setExpandedGroupKeys(
      (current) =>
        current.includes(
          focusedGroupKey,
        )
          ? current
          : [
              ...current,
              focusedGroupKey,
            ],
    );
  }, [
    focusedRequestId,
    requests,
  ]);

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
      expired: false,
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
    dateFilteredRequestCount: requestsInDateRange.length,
    draftFilterEndDate,
    draftFilterStartDate,
    draftStatusFilters,
    expandedGroupKeys,
    filterSummary,
    groupedRequests,
    showFilterModal,
    statusCounts,
    visibleRequests:

      focusedVisibleRequests,
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
