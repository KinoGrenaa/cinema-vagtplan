"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import type { TimeEntry } from "../../types";
import { readErrorMessage } from "../../utils";
import { getSelectedCinemaQuery } from "../../helpers/core/timeApprovalRequests";

type InfoDialog = {
  showError: (title: string, description: string) => void;
};

type UseTimeApprovalDataOptions = {
  infoDialog: InfoDialog;
  enabled?: boolean;
};

type PayrollPeriodResponse = {
  startDate?: string;
  endDate?: string;
};

function getCurrentCopenhagenDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildSelectedCinemaParams() {
  const selectedCinemaQuery = getSelectedCinemaQuery();
  return new URLSearchParams(
    selectedCinemaQuery.startsWith("?")
      ? selectedCinemaQuery.slice(1)
      : selectedCinemaQuery,
  );
}

function buildRequestPath(
  pathname: string,
  values: Record<string, string>,
) {
  const params = buildSelectedCinemaParams();
  Object.entries(values).forEach(([key, value]) => {
    params.set(key, value);
  });
  return `${pathname}?${params.toString()}`;
}

function readPayrollPeriod(data: PayrollPeriodResponse) {
  if (
    typeof data.startDate !== "string" ||
    typeof data.endDate !== "string"
  ) {
    return null;
  }

  return {
    startDate: data.startDate.slice(0, 10),
    endDate: data.endDate.slice(0, 10),
  };
}

export function useTimeApprovalData({
  infoDialog,
  enabled = true,
}: UseTimeApprovalDataOptions) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const showErrorRef = useRef(infoDialog.showError);

  useEffect(() => {
    showErrorRef.current = infoDialog.showError;
  }, [infoDialog.showError]);

  const fetchEntries = useCallback(async () => {
    if (!enabled) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const periodResponse = await apiFetch(
        buildRequestPath("/payroll/period-for-date", {
          date: getCurrentCopenhagenDate(),
        }),
      );

      if (!periodResponse.ok) {
        if (periodResponse.status !== 401) {
          const message = await readErrorMessage(
            periodResponse,
            "Kunne ikke hente den aktuelle lønperiode",
          );
          showErrorRef.current("Kunne ikke hente lønperiode", message);
        }
        setEntries([]);
        return;
      }

      const payrollPeriod = readPayrollPeriod(
        (await periodResponse.json()) as PayrollPeriodResponse,
      );

      if (!payrollPeriod) {
        showErrorRef.current(
          "Ugyldig lønperiode",
          "Serveren returnerede en ugyldig lønperiode.",
        );
        setEntries([]);
        return;
      }

      const response = await apiFetch(
        buildRequestPath("/time-entries/approval-period", payrollPeriod),
      );

      if (!response.ok) {
        if (response.status !== 401) {
          const message = await readErrorMessage(
            response,
            "Kunne ikke hente tidsregistreringer",
          );
          showErrorRef.current("Kunne ikke hente tidsregistreringer", message);
        }
        setEntries([]);
        return;
      }

      const data = await response.json();
      const nextEntries = Array.isArray(data) ? data : [];
      setEntries(nextEntries);
    } catch (error) {
      showErrorRef.current(
        "Kunne ikke hente tidsregistreringer",
        error instanceof Error && error.message
          ? error.message
          : "Der opstod en fejl, da tidsregistreringerne skulle hentes. Prøv igen.",
      );
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useRealtimeCore({
    onTimeEntry: fetchEntries,
  });

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    loading,
    fetchEntries,
  };
}
