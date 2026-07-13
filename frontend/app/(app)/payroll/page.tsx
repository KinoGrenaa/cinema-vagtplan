"use client";

import PermissionGuard from "@/app/components/access/PermissionGuard";

import PayrollMasterCinemaRequired from "./components/layout/PayrollMasterCinemaRequired";
import PayrollPageContent from "./components/layout/PayrollPageContent";
import { usePayrollPage } from "./hooks/usePayrollPage";

export default function PayrollPage() {
  const payrollPage = usePayrollPage();

  if (payrollPage.isMasterWithoutActiveCinema) {
    return (
      <PayrollMasterCinemaRequired
        onChooseCinema={payrollPage.handleChooseCinema}
      />
    );
  }

  return (
    <PermissionGuard permission="canManagePayroll">
      <PayrollPageContent payrollPage={payrollPage} />
    </PermissionGuard>
  );
}
