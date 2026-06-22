import { useEffect, useState } from "react";
import type {
  CinemaPayrollSettings,
  PayrollAuditHistory,
  PayrollEmployee,
  PayrollPeriod,
  User,
} from "../types";
import {
  fetchCinemaPayrollSettings,
  fetchPayrollAuditHistory,
  fetchPayrollPeriod,
  fetchPayrollReport,
  fetchUsers,
} from "../services/payrollService";

type Props = {
  startDate: string;
  endDate: string;
  userId: string;
  enabled?: boolean;
  onSettingsLoaded?: (settings: CinemaPayrollSettings) => void;
  onError?: (title: string, description: string) => void;
};

function getErrorDescription(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function usePayrollData({
  startDate,
  endDate,
  userId,
  enabled = true,
  onSettingsLoaded,
  onError,
}: Props) {
  const [cinemaSettings, setCinemaSettings] =
    useState<CinemaPayrollSettings | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [report, setReport] = useState<PayrollEmployee[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [voidedCount, setVoidedCount] = useState(0);
  const [adjustmentCount, setAdjustmentCount] = useState(0);
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [auditHistory, setAuditHistory] = useState<PayrollAuditHistory[]>([]);
  const [loading, setLoading] = useState(false);

  function resetPayrollData() {
    setCinemaSettings(null);
    setUsers([]);
    setReport([]);
    setPendingCount(0);
    setVoidedCount(0);
    setAdjustmentCount(0);
    setPeriod(null);
    setAuditHistory([]);
    setLoading(false);
  }

  async function loadCinemaSettings() {
    try {
      const data = await fetchCinemaPayrollSettings();

      if (!data) return;

      setCinemaSettings(data);
      onSettingsLoaded?.(data);
    } catch (error) {
      onError?.(
        "Kunne ikke hente lønindstillinger",
        getErrorDescription(
          error,
          "Der opstod en fejl, da lønindstillingerne skulle hentes. Prøv igen.",
        ),
      );
    }
  }

  async function loadUsers() {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      setUsers([]);

      onError?.(
        "Kunne ikke hente medarbejdere",
        getErrorDescription(
          error,
          "Der opstod en fejl, da medarbejderlisten skulle hentes. Prøv igen.",
        ),
      );
    }
  }

  async function loadReport() {
    try {
      setLoading(true);

      const data = await fetchPayrollReport({
        startDate,
        endDate,
        userId,
      });

      setReport(data.employees);
      setPendingCount(data.pendingCount);
      setVoidedCount(data.voidedCount);
      setAdjustmentCount(data.adjustmentCount ?? 0);
    } catch (error) {
      setReport([]);
      setPendingCount(0);
      setVoidedCount(0);
      setAdjustmentCount(0);

      onError?.(
        "Kunne ikke hente lønrapport",
        getErrorDescription(
          error,
          "Der opstod en fejl, da lønrapporten skulle hentes. Prøv igen.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPeriod() {
    try {
      const data = await fetchPayrollPeriod({
        startDate,
        endDate,
      });

      setPeriod(data);
    } catch (error) {
      setPeriod(null);

      onError?.(
        "Kunne ikke hente lønperiodestatus",
        getErrorDescription(
          error,
          "Der opstod en fejl, da lønperiodens status skulle hentes. Prøv igen.",
        ),
      );
    }
  }

  async function loadAuditHistory() {
    try {
      const data = await fetchPayrollAuditHistory({
        startDate,
        endDate,
      });

      setAuditHistory(data);
    } catch (error) {
      setAuditHistory([]);

      onError?.(
        "Kunne ikke hente lønhistorik",
        getErrorDescription(
          error,
          "Der opstod en fejl, da lønhistorikken skulle hentes. Prøv igen.",
        ),
      );
    }
  }

  async function refreshPayroll() {
    if (!enabled) {
      resetPayrollData();
      return;
    }

    await loadReport();
    await loadPeriod();
    await loadAuditHistory();
  }

  useEffect(() => {
    if (!enabled) {
      resetPayrollData();
      return;
    }

    loadUsers();
    loadCinemaSettings();
  }, [enabled]);

  useEffect(() => {
    refreshPayroll();
  }, [enabled, startDate, endDate, userId]);

  return {
    cinemaSettings,
    users,
    report,
    pendingCount,
    voidedCount,
    adjustmentCount,
    period,
    auditHistory,
    loading,
    refreshPayroll,
  };
}
