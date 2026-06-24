import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import {
  getCurrentPayrollPeriodReferenceDate,
  getInitialPayrollPeriod,
  getNextPayrollPeriodReferenceDate,
  getPreviousPayrollPeriodReferenceDate,
} from "../helpers/myTimePayrollPeriod";

type PayrollPeriod = {
  startDate: string;
  endDate: string;
};

type ShowError = (title: string, description: string) => void;

type UseMyTimePayrollPeriodOptions = {
  onError: ShowError;
  onPayrollPeriodChanged: () => void;
};

export function useMyTimePayrollPeriod({
  onError,
  onPayrollPeriodChanged,
}: UseMyTimePayrollPeriodOptions) {
  const [payrollPeriod, setPayrollPeriod] = useState<PayrollPeriod>(
    getInitialPayrollPeriod,
  );
  const [payrollPeriodLoading, setPayrollPeriodLoading] = useState(false);
  const onErrorRef = useRef(onError);
  const onPayrollPeriodChangedRef = useRef(onPayrollPeriodChanged);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onPayrollPeriodChangedRef.current = onPayrollPeriodChanged;
  }, [onPayrollPeriodChanged]);

  const fetchPayrollPeriodForDate = useCallback(async (referenceDate: string) => {
    try {
      setPayrollPeriodLoading(true);

      const response = await apiFetch(
        `/payroll/period-for-date?date=${encodeURIComponent(referenceDate)}`,
      );

      if (!response.ok) {
        onErrorRef.current(
          "Kunne ikke hente lønperiode",
          "Der opstod en fejl, da lønperioden skulle hentes. Prøv igen.",
        );

        return;
      }

      const data = await response.json();

      if (
        typeof data?.startDate !== "string" ||
        typeof data?.endDate !== "string"
      ) {
        onErrorRef.current(
          "Ugyldig lønperiode",
          "Serveren returnerede en ugyldig lønperiode.",
        );

        return;
      }

      setPayrollPeriod({
        startDate: data.startDate.slice(0, 10),
        endDate: data.endDate.slice(0, 10),
      });

      onPayrollPeriodChangedRef.current();
    } catch {
      onErrorRef.current(
        "Kunne ikke hente lønperiode",
        "Der opstod en fejl, da lønperioden skulle hentes. Prøv igen.",
      );
    } finally {
      setPayrollPeriodLoading(false);
    }
  }, []);

  const goToPreviousPayrollPeriod = useCallback(() => {
    fetchPayrollPeriodForDate(
      getPreviousPayrollPeriodReferenceDate(payrollPeriod),
    );
  }, [fetchPayrollPeriodForDate, payrollPeriod]);

  const goToCurrentPayrollPeriod = useCallback(() => {
    fetchPayrollPeriodForDate(getCurrentPayrollPeriodReferenceDate());
  }, [fetchPayrollPeriodForDate]);

  const goToNextPayrollPeriod = useCallback(() => {
    fetchPayrollPeriodForDate(getNextPayrollPeriodReferenceDate(payrollPeriod));
  }, [fetchPayrollPeriodForDate, payrollPeriod]);

  useEffect(() => {
    fetchPayrollPeriodForDate(getCurrentPayrollPeriodReferenceDate());
  }, [fetchPayrollPeriodForDate]);

  return {
    payrollPeriod,
    payrollPeriodLoading,
    goToPreviousPayrollPeriod,
    goToCurrentPayrollPeriod,
    goToNextPayrollPeriod,
  };
}
