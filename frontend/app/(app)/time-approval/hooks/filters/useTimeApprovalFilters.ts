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

type TimeApprovalModalFilters = {
  showPending: boolean;
  showNeedsChanges: boolean;
  showApproved: boolean;
  showVoided: boolean;
  showPlannedEntries: boolean;
  showManualEntries: boolean;
  onlyWithDeviations: boolean;
  onlyWithNotes: boolean;
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_MODAL_FILTERS:
  TimeApprovalModalFilters = {
    showPending: true,
    showNeedsChanges: true,
    showApproved: false,
    showVoided: false,
    showPlannedEntries: true,
    showManualEntries: true,
    onlyWithDeviations: false,
    onlyWithNotes: false,
    dateFrom: "",
    dateTo: "",
  };

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
    setFilterModalOpen,
  ] =
    useState(false);

  const [
    employeeSearch,
    setEmployeeSearch,
  ] =
    useState("");

  const [
    activeModalFilters,
    setActiveModalFilters,
  ] =
    useState<TimeApprovalModalFilters>(
      DEFAULT_MODAL_FILTERS,
    );

  const [
    draftModalFilters,
    setDraftModalFilters,
  ] =
    useState<TimeApprovalModalFilters>(
      DEFAULT_MODAL_FILTERS,
    );

  const [
    expandedEntryIds,
    setExpandedEntryIds,
  ] =
    useState<number[]>([]);

  const [
    expandedUserIds,
    setExpandedUserIds,
  ] =
    useState<string[]>([]);

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

  function setShowFilterModal(
    open: boolean,
  ) {
    if (open) {
      setDraftModalFilters(
        activeModalFilters,
      );

      setFilterModalOpen(
        true,
      );

      return;
    }

    setDraftModalFilters(
      activeModalFilters,
    );

    setFilterModalOpen(
      false,
    );
  }

  function applyFilters() {
    setActiveModalFilters(
      draftModalFilters,
    );

    setFilterModalOpen(
      false,
    );
  }

  function resetFilters() {
    setDraftModalFilters(
      DEFAULT_MODAL_FILTERS,
    );
  }

  function setShowPending(
    value: boolean,
  ) {
    setDraftModalFilters(
      (current) => ({
        ...current,
        showPending: value,
      }),
    );
  }

  function setShowNeedsChanges(
    value: boolean,
  ) {
    setDraftModalFilters(
      (current) => ({
        ...current,
        showNeedsChanges:
          value,
      }),
    );
  }

  function setShowApproved(
    value: boolean,
  ) {
    setDraftModalFilters(
      (current) => ({
        ...current,
        showApproved: value,
      }),
    );
  }

  function setShowVoided(
    value: boolean,
  ) {
    setDraftModalFilters(
      (current) => ({
        ...current,
        showVoided: value,
      }),
    );
  }

  function setShowPlannedEntries(
    value: boolean,
  ) {
    setDraftModalFilters(
      (current) => ({
        ...current,
        showPlannedEntries:
          value,
      }),
    );
  }

  function setShowManualEntries(
    value: boolean,
  ) {
    setDraftModalFilters(
      (current) => ({
        ...current,
        showManualEntries:
          value,
      }),
    );
  }

  function setOnlyWithDeviations(
    value: boolean,
  ) {
    setDraftModalFilters(
      (current) => ({
        ...current,
        onlyWithDeviations:
          value,
      }),
    );
  }

  function setOnlyWithNotes(
    value: boolean,
  ) {
    setDraftModalFilters(
      (current) => ({
        ...current,
        onlyWithNotes: value,
      }),
    );
  }

  function setDateFrom(
    value: string,
  ) {
    setDraftModalFilters(
      (current) => ({
        ...current,
        dateFrom: value,
      }),
    );
  }

  function setDateTo(
    value: string,
  ) {
    setDraftModalFilters(
      (current) => ({
        ...current,
        dateTo: value,
      }),
    );
  }

  const toggleEntryDetails = (
    entryId: number,
  ) => {
    setExpandedEntryIds(
      (current) =>
        current.includes(
          entryId,
        )
          ? current.filter(
              (id) =>
                id !==
                entryId,
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
        current.includes(
          userId,
        )
          ? current.filter(
              (id) =>
                id !==
                userId,
            )
          : [
              ...current,
              userId,
            ],
    );
  };

  /*
   * Only the applied values are allowed
   * to affect the visible entry list.
   */
  const filters = {
    employeeSearch,
    ...activeModalFilters,
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
    getActiveFilterCount(
      filters,
    );

  const groupedEntries =
    getGroupedEntries(
      visibleEntries,
    );

  return {
    showFilterModal,
    setShowFilterModal,

    employeeSearch,
    setEmployeeSearch,

    showPending:
      draftModalFilters.showPending,
    setShowPending,

    showNeedsChanges:
      draftModalFilters.showNeedsChanges,
    setShowNeedsChanges,

    showApproved:
      draftModalFilters.showApproved,
    setShowApproved,

    showVoided:
      draftModalFilters.showVoided,
    setShowVoided,

    showPlannedEntries:
      draftModalFilters.showPlannedEntries,
    setShowPlannedEntries,

    showManualEntries:
      draftModalFilters.showManualEntries,
    setShowManualEntries,

    onlyWithDeviations:
      draftModalFilters.onlyWithDeviations,
    setOnlyWithDeviations,

    onlyWithNotes:
      draftModalFilters.onlyWithNotes,
    setOnlyWithNotes,

    dateFrom:
      draftModalFilters.dateFrom,
    setDateFrom,

    dateTo:
      draftModalFilters.dateTo,
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

    applyFilters,
    resetFilters,

    groupedEntries,
  };
}
