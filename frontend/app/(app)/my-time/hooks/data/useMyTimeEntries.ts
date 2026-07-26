import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRealtimeCore,
} from "@/app/hooks/useRealtimeCore";
import {
  apiFetch,
} from "@/app/lib/api";

import {
  MY_TIME_PAYROLL_PERIOD_CHANGED,
  readMyTimePayrollPeriodEvent,
  type MyTimePayrollPeriod,
} from "../../helpers/core/myTimePeriodEvents";
import type {
  TimeEntry,
} from "../../helpers/core/myTimeTypes";

type ShowError = (
  title: string,
  description: string,
) => void;

type UseMyTimeEntriesOptions = {
  disabled?: boolean;
};

export function useMyTimeEntries(
  showError: ShowError,
  options:
    UseMyTimeEntriesOptions = {},
) {
  const disabled =
    options.disabled ?? false;
  const [
    entries,
    setEntries,
  ] =
    useState<TimeEntry[]>([]);
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    payrollPeriod,
    setPayrollPeriod,
  ] =
    useState<MyTimePayrollPeriod | null>(
      null,
    );
  const showErrorRef =
    useRef(showError);

  useEffect(() => {
    showErrorRef.current =
      showError;
  }, [showError]);

  useEffect(() => {
    function handlePayrollPeriodChanged(
      event: Event,
    ) {
      const nextPeriod =
        readMyTimePayrollPeriodEvent(
          event,
        );

      if (nextPeriod) {
        setPayrollPeriod(
          nextPeriod,
        );
      }
    }

    window.addEventListener(
      MY_TIME_PAYROLL_PERIOD_CHANGED,
      handlePayrollPeriodChanged,
    );

    return () => {
      window.removeEventListener(
        MY_TIME_PAYROLL_PERIOD_CHANGED,
        handlePayrollPeriodChanged,
      );
    };
  }, []);

  const fetchEntries =
    useCallback(async () => {
      if (disabled) {
        setEntries([]);
        setLoading(false);
        return;
      }

      if (!payrollPeriod) {
        setLoading(true);
        return;
      }

      try {
        setLoading(true);

        const params =
          new URLSearchParams({
            startDate:
              payrollPeriod.startDate,
            endDate:
              payrollPeriod.endDate,
          });
        const response =
          await apiFetch(
            `/time-entries/me-period?${params.toString()}`,
          );

        if (!response.ok) {
          setEntries([]);
          showErrorRef.current(
            "Kunne ikke hente dine timer",
            "Der opstod en fejl, da dine timer skulle hentes.\nPrøv igen.",
          );
          return;
        }

        const data =
          await response.json();

        setEntries(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch {
        setEntries([]);
        showErrorRef.current(
          "Kunne ikke hente dine timer",
          "Der opstod en fejl, da dine timer skulle hentes. Prøv igen.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      disabled,
      payrollPeriod,
    ]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  useRealtimeCore({
    onTimeEntry:
      fetchEntries,
  });

  return {
    entries,
    loading,
    fetchEntries,
  };
}
