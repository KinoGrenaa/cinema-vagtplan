import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  apiFetch,
} from "@/app/lib/api";

import {
  getCurrentPayrollPeriodReferenceDate,
  getInitialPayrollPeriod,
  getNextPayrollPeriodReferenceDate,
  getPreviousPayrollPeriodReferenceDate,
} from "../../helpers/core/myTimePayrollPeriod";
import {
  announceMyTimePayrollPeriod,
  type MyTimePayrollPeriod,
} from "../../helpers/core/myTimePeriodEvents";

type ShowError = (
  title: string,
  description: string,
) => void;

type UseMyTimePayrollPeriodOptions = {
  onError: ShowError;
  onPayrollPeriodChanged:
    () => void;
  disabled?: boolean;
};

function announceFallbackPeriod() {
  const fallback =
    getInitialPayrollPeriod();

  announceMyTimePayrollPeriod(
    fallback,
  );

  return fallback;
}

export function useMyTimePayrollPeriod({
  onError,
  onPayrollPeriodChanged,
  disabled = false,
}: UseMyTimePayrollPeriodOptions) {
  const [
    payrollPeriod,
    setPayrollPeriod,
  ] =
    useState<MyTimePayrollPeriod>(
      getInitialPayrollPeriod,
    );
  const [
    payrollPeriodLoading,
    setPayrollPeriodLoading,
  ] =
    useState(!disabled);
  const onErrorRef =
    useRef(onError);
  const onPayrollPeriodChangedRef =
    useRef(
      onPayrollPeriodChanged,
    );

  useEffect(() => {
    onErrorRef.current =
      onError;
  }, [onError]);

  useEffect(() => {
    onPayrollPeriodChangedRef.current =
      onPayrollPeriodChanged;
  }, [
    onPayrollPeriodChanged,
  ]);

  const fetchPayrollPeriodForDate =
    useCallback(
      async (
        referenceDate:
          string,
      ) => {
        if (disabled) {
          const fallback =
            getInitialPayrollPeriod();

          setPayrollPeriod(
            fallback,
          );
          setPayrollPeriodLoading(
            false,
          );
          return;
        }

        try {
          setPayrollPeriodLoading(
            true,
          );

          const response =
            await apiFetch(
              `/payroll/period-for-date?date=${encodeURIComponent(
                referenceDate,
              )}`,
            );

          if (!response.ok) {
            const fallback =
              announceFallbackPeriod();

            setPayrollPeriod(
              fallback,
            );
            onErrorRef.current(
              "Kunne ikke hente lønperiode",
              "Der opstod en fejl, da lønperioden skulle hentes.\nPrøv igen.",
            );
            return;
          }

          const data =
            await response.json();

          if (
            typeof data?.startDate !==
              "string" ||
            typeof data?.endDate !==
              "string"
          ) {
            const fallback =
              announceFallbackPeriod();

            setPayrollPeriod(
              fallback,
            );
            onErrorRef.current(
              "Ugyldig lønperiode",
              "Serveren returnerede en ugyldig lønperiode.",
            );
            return;
          }

          const nextPeriod = {
            startDate:
              data.startDate.slice(
                0,
                10,
              ),
            endDate:
              data.endDate.slice(
                0,
                10,
              ),
          };

          setPayrollPeriod(
            nextPeriod,
          );
          announceMyTimePayrollPeriod(
            nextPeriod,
          );
          onPayrollPeriodChangedRef.current();
        } catch {
          const fallback =
            announceFallbackPeriod();

          setPayrollPeriod(
            fallback,
          );
          onErrorRef.current(
            "Kunne ikke hente lønperiode",
            "Der opstod en fejl, da lønperioden skulle hentes.\nPrøv igen.",
          );
        } finally {
          setPayrollPeriodLoading(
            false,
          );
        }
      },
      [disabled],
    );

  const goToPreviousPayrollPeriod =
    useCallback(() => {
      void fetchPayrollPeriodForDate(
        getPreviousPayrollPeriodReferenceDate(
          payrollPeriod,
        ),
      );
    }, [
      fetchPayrollPeriodForDate,
      payrollPeriod,
    ]);

  const goToCurrentPayrollPeriod =
    useCallback(() => {
      void fetchPayrollPeriodForDate(
        getCurrentPayrollPeriodReferenceDate(),
      );
    }, [
      fetchPayrollPeriodForDate,
    ]);

  const goToNextPayrollPeriod =
    useCallback(() => {
      void fetchPayrollPeriodForDate(
        getNextPayrollPeriodReferenceDate(
          payrollPeriod,
        ),
      );
    }, [
      fetchPayrollPeriodForDate,
      payrollPeriod,
    ]);

  useEffect(() => {
    void fetchPayrollPeriodForDate(
      getCurrentPayrollPeriodReferenceDate(),
    );
  }, [
    fetchPayrollPeriodForDate,
  ]);

  return {
    payrollPeriod,
    payrollPeriodLoading,
    goToPreviousPayrollPeriod,
    goToCurrentPayrollPeriod,
    goToNextPayrollPeriod,
  };
}
