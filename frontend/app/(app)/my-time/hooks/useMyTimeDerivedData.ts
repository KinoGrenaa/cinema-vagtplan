import { useMemo } from "react";
import {
  isEntryVisibleWithStatusFilters,
  isInPayrollPeriod,
} from "../helpers/myTimeEntries";
import {
  getApprovedHours,
  getMyTimeDayGroups,
  getNeedsChangesCount,
  getPendingHours,
} from "../helpers/myTimeSummary";
import type { MyTimeStatusFilters } from "../helpers/myTimeStatus";
import type { TimeEntry } from "../helpers/myTimeTypes";

type PayrollPeriod = {
  startDate: string;
  endDate: string;
};

type UseMyTimeDerivedDataOptions = {
  entries: TimeEntry[];
  payrollPeriod: PayrollPeriod;
  statusFilters: MyTimeStatusFilters;
};

export function useMyTimeDerivedData({
  entries,
  payrollPeriod,
  statusFilters,
}: UseMyTimeDerivedDataOptions) {
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) =>
      isInPayrollPeriod(entry, payrollPeriod.startDate, payrollPeriod.endDate),
    );
  }, [entries, payrollPeriod.endDate, payrollPeriod.startDate]);

  const visibleEntries = useMemo(() => {
    return filteredEntries.filter((entry) =>
      isEntryVisibleWithStatusFilters(entry, statusFilters),
    );
  }, [filteredEntries, statusFilters]);

  const approvedHours = useMemo(() => {
    return getApprovedHours(filteredEntries);
  }, [filteredEntries]);

  const pendingHours = useMemo(() => {
    return getPendingHours(filteredEntries);
  }, [filteredEntries]);

  const needsChangesCount = useMemo(() => {
    return getNeedsChangesCount(filteredEntries);
  }, [filteredEntries]);

  const dayGroups = useMemo(() => {
    return getMyTimeDayGroups(visibleEntries);
  }, [visibleEntries]);

  return {
    visibleEntries,
    approvedHours,
    pendingHours,
    needsChangesCount,
    dayGroups,
  };
}
