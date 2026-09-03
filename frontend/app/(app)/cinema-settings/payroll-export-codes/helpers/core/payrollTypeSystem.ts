export const MANUAL_ENTRY_PAYROLL_CODE = "MANUAL_ENTRY";

export function isManualEntryPayrollType(
  payrollType: {
    payrollCode?: string | null;
  },
) {
  return (
    payrollType.payrollCode?.trim().toUpperCase() ===
    MANUAL_ENTRY_PAYROLL_CODE
  );
}
