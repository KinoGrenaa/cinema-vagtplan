"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useSearchParams,
} from "next/navigation";

import {
  getActiveFilterCount,
  getGroupedEntries,
  getTimeApprovalStatusCounts,
  getVisibleEntries,
} from "../../helpers/core/timeApprovalFilters";
import {
  includeTargetedTimeEntry,
  parseTimeApprovalEntryTarget,
} from "../../helpers/core/timeApprovalEntryTarget";
import type {
  TimeEntry,
} from "../../types";

export function useTimeApprovalFilters(
  entries: TimeEntry[],
) {
  const searchParams =
    useSearchParams();
  const entryTarget =
    parseTimeApprovalEntryTarget(
      searchParams.get(
        "entryId",
      ),
    );

  const [
    showFilterModal,
    setShowFilterModal,
  ] = useState(false);
  const [
    employeeSearch,
    setEmployeeSearch,
  ] = useState("");
  const [
    showPending,
    setShowPending,
  ] = useState(true);
  const [
    showNeedsChanges,
    setShowNeedsChanges,
  ] = useState(true);
  const [
    showApproved,
    setShowApproved,
  ] = useState(false);
  const [
    showVoided,
    setShowVoided,
  ] = useState(false);
  const [
    showPlannedEntries,
    setShowPlannedEntries,
  ] = useState(true);
  const [
    showManualEntries,
    setShowManualEntries,
  ] = useState(true);
  const [
    onlyWithDeviations,
    setOnlyWithDeviations,
  ] = useState(false);
  const [
    onlyWithNotes,
    setOnlyWithNotes,
  ] = useState(false);
  const [
    dateFrom,
    setDateFrom,
  ] = useState("");
  const [
    dateTo,
    setDateTo,
  ] = useState("");
  const [
    expandedEntryIds,
    setExpandedEntryIds,
  ] = useState<number[]>([]);
  const [
    expandedUserIds,
    setExpandedUserIds,
  ] = useState<string[]>([]);

  useEffect(() => {
    if (!entryTarget.entryId) {
      return;
    }

    const targetEntry =
      entries.find(
        (entry) =>
          entry.id ===
          entryTarget.entryId,
      );

    if (!targetEntry) {
      return;
    }

    setExpandedEntryIds(
      (current) =>
        current.includes(
          targetEntry.id,
        )
          ? current
          : [
              ...current,
              targetEntry.id,
            ],
    );

    setExpandedUserIds(
      (current) =>
        current.includes(
          targetEntry.user.email,
        )
          ? current
          : [
              ...current,
              targetEntry.user.email,
            ],
    );
  }, [
    entries,
    entryTarget.entryId,
  ]);

  const toggleEntryDetails = (
    entryId: number,
  ) => {
    setExpandedEntryIds(
      (current) =>
        current.includes(entryId)
          ? current.filter(
              (id) =>
                id !== entryId,
            )
          : [
              ...current,
              entryId,
            ],
    );
  };

  const toggleUserGroup = (
    userId: string,
  ) => {
    setExpandedUserIds(
      (current) =>
        current.includes(userId)
          ? current.filter(
              (id) =>
                id !== userId,
            )
          : [
              ...current,
              userId,
            ],
    );
  };

  const filters = {
    employeeSearch,
    showPending,
    showNeedsChanges,
    showApproved,
    showVoided,
    showPlannedEntries,
    showManualEntries,
    onlyWithDeviations,
    onlyWithNotes,
    dateFrom,
    dateTo,
  };

  const filteredEntries =
    getVisibleEntries(
      entries,
      filters,
    );
  const visibleEntries =
    includeTargetedTimeEntry(
      entries,
      filteredEntries,
      entryTarget.entryId,
    );

  const {
    pendingCount,
    approvedCount,
    needsChangesCount,
    voidedCount,
  } =
    getTimeApprovalStatusCounts(
      entries,
    );

  const activeFilterCount =
    getActiveFilterCount(filters);

  function resetFilters() {
    setShowPending(true);
    setShowNeedsChanges(true);
    setShowApproved(false);
    setShowVoided(false);
    setShowPlannedEntries(true);
    setShowManualEntries(true);
    setOnlyWithDeviations(false);
    setOnlyWithNotes(false);
    setDateFrom("");
    setDateTo("");
  }

  const groupedEntries =
    getGroupedEntries(
      visibleEntries,
    );

  return {
    showFilterModal,
    setShowFilterModal,
    employeeSearch,
    setEmployeeSearch,
    showPending,
    setShowPending,
    showNeedsChanges,
    setShowNeedsChanges,
    showApproved,
    setShowApproved,
    showVoided,
    setShowVoided,
    showPlannedEntries,
    setShowPlannedEntries,
    showManualEntries,
    setShowManualEntries,
    onlyWithDeviations,
    setOnlyWithDeviations,
    onlyWithNotes,
    setOnlyWithNotes,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    expandedEntryIds,
    expandedUserIds,
    toggleEntryDetails,
    toggleUserGroup,
    visibleEntries,
    pendingCount,
    approvedCount,
    needsChangesCount,
    voidedCount,
    activeFilterCount,
    resetFilters,
    groupedEntries,
  };
}
