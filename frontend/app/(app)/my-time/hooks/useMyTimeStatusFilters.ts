import { useMemo, useState } from "react";

import {
  DEFAULT_STATUS_FILTERS,
  getActiveStatusFilterCount,
  getStatusFilterSummary,
  type MyTimeStatusFilters,
} from "../helpers/core/myTimeStatus";

type UseMyTimeStatusFiltersOptions = {
  onFiltersChanged: () => void;
};

export function useMyTimeStatusFilters({
  onFiltersChanged,
}: UseMyTimeStatusFiltersOptions) {
  const [statusFilters, setStatusFilters] = useState(
    DEFAULT_STATUS_FILTERS,
  );
  const [draftStatusFilters, setDraftStatusFilters] =
    useState(DEFAULT_STATUS_FILTERS);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const activeStatusFilterCount = useMemo(() => {
    return getActiveStatusFilterCount(statusFilters);
  }, [statusFilters]);

  const statusFilterSummary = useMemo(() => {
    return getStatusFilterSummary(statusFilters);
  }, [statusFilters]);

  function openFilterModal() {
    setDraftStatusFilters(statusFilters);
    setFilterModalOpen(true);
  }

  function closeFilterModal() {
    setFilterModalOpen(false);
  }

  function updateDraftStatusFilter(
    key: keyof MyTimeStatusFilters,
    checked: boolean,
  ) {
    setDraftStatusFilters((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  function applyStatusFilters() {
    setStatusFilters(draftStatusFilters);
    onFiltersChanged();
    setFilterModalOpen(false);
  }

  function resetStatusFilters() {
    setDraftStatusFilters(DEFAULT_STATUS_FILTERS);
    setStatusFilters(DEFAULT_STATUS_FILTERS);
    onFiltersChanged();
    setFilterModalOpen(false);
  }

  function showNeedsChangesEntries() {
    const needsChangesOnlyFilters: MyTimeStatusFilters = {
      approved: false,
      pending: false,
      needsChanges: true,
      voided: false,
    };

    setStatusFilters(needsChangesOnlyFilters);
    setDraftStatusFilters(needsChangesOnlyFilters);
    onFiltersChanged();
  }

  return {
    statusFilters,
    draftStatusFilters,
    filterModalOpen,
    activeStatusFilterCount,
    statusFilterSummary,
    openFilterModal,
    closeFilterModal,
    updateDraftStatusFilter,
    applyStatusFilters,
    resetStatusFilters,
    showNeedsChangesEntries,
  };
}
