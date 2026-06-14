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
  onSettingsLoaded?: (settings: CinemaPayrollSettings) => void;
};

export function usePayrollData({
  startDate,
  endDate,
  userId,
  onSettingsLoaded,
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

  async function loadCinemaSettings() {
    try {
      const data = await fetchCinemaPayrollSettings();

      if (!data) return;

      setCinemaSettings(data);
      onSettingsLoaded?.(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadUsers() {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
      setUsers([]);
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
      console.error(error);
      setReport([]);
      setPendingCount(0);
      setVoidedCount(0);
      setAdjustmentCount(0);
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
      console.error(error);
      setPeriod(null);
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
      console.error(error);
      setAuditHistory([]);
    }
  }

  async function refreshPayroll() {
    await loadReport();
    await loadPeriod();
    await loadAuditHistory();
  }

  useEffect(() => {
    loadUsers();
    loadCinemaSettings();
  }, []);

  useEffect(() => {
    refreshPayroll();
  }, [startDate, endDate, userId]);

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
