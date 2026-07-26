import { useEffect, useRef, useState } from "react";

import type {
  CinemaPayrollSettings,
  PayrollAuditHistory,
  PayrollEmployee,
  PayrollPeriod,
  User,
} from "../../types";
import {
  fetchCinemaPayrollSettings,
  fetchPayrollAuditHistory,
  fetchPayrollPeriod,
  fetchPayrollReport,
  fetchUsers,
} from "../../services/payrollService";
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
  const reportRequestIdRef = useRef(0);
  const periodRequestIdRef = useRef(0);
  const auditHistoryRequestIdRef = useRef(0);

  function isLatestReportRequest(requestId: number) {
    return reportRequestIdRef.current === requestId;
  }

  function isLatestPeriodRequest(requestId: number) {
    return periodRequestIdRef.current === requestId;
  }

  function isLatestAuditHistoryRequest(requestId: number) {
    return auditHistoryRequestIdRef.current === requestId;
  }

  function resetPayrollData() {
    reportRequestIdRef.current += 1;
    periodRequestIdRef.current += 1;
    auditHistoryRequestIdRef.current += 1;
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

  async function loadReport(requestId: number) {
    try {
      setLoading(true);
      const data = await fetchPayrollReport({
        startDate,
        endDate,
        userId,
      });

      if (!isLatestReportRequest(requestId)) return;

      setReport(data.employees);
      setPendingCount(data.pendingCount);
      setVoidedCount(data.voidedCount);
      setAdjustmentCount(data.adjustmentCount ?? 0);
    } catch (error) {
      if (!isLatestReportRequest(requestId)) return;

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
      if (isLatestReportRequest(requestId)) {
        setLoading(false);
      }
    }
  }
  async function loadPeriod(requestId: number) {
    try {
      const data = await fetchPayrollPeriod({
        startDate,
        endDate,
      });

      if (!isLatestPeriodRequest(requestId)) return;

      setPeriod(data);
    } catch (error) {
      if (!isLatestPeriodRequest(requestId)) return;

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

  async function loadAuditHistory(requestId: number) {
    try {
      const data = await fetchPayrollAuditHistory({
        startDate,
        endDate,
      });

      if (!isLatestAuditHistoryRequest(requestId)) return;

      setAuditHistory(data);
    } catch (error) {
      if (!isLatestAuditHistoryRequest(requestId)) return;

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

  async function refreshPayrollReport() {
    if (!enabled) return;

    const requestId = reportRequestIdRef.current + 1;
    reportRequestIdRef.current = requestId;

    await loadReport(requestId);
  }

  async function refreshPayrollPeriod() {
    if (!enabled) return;

    const requestId = periodRequestIdRef.current + 1;
    periodRequestIdRef.current = requestId;

    await loadPeriod(requestId);
  }

  async function refreshPayrollHistory() {
    if (!enabled) return;

    const requestId = auditHistoryRequestIdRef.current + 1;
    auditHistoryRequestIdRef.current = requestId;

    await loadAuditHistory(requestId);
  }

  async function refreshPayroll() {
    if (!enabled) {
      resetPayrollData();
      return;
    }

    await Promise.all([
      refreshPayrollReport(),
      refreshPayrollPeriod(),
      refreshPayrollHistory(),
    ]);
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
    if (!enabled) return;

    refreshPayrollReport();
  }, [enabled, startDate, endDate, userId]);

  useEffect(() => {
    if (!enabled) return;

    refreshPayrollPeriod();
    refreshPayrollHistory();
  }, [enabled, startDate, endDate]);
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
    refreshPayrollReport,
  };
}
