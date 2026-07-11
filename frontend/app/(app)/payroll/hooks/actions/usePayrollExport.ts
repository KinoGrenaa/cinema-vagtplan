import { useState } from "react";
import { toast } from "sonner";

import {
  downloadPayrollExport,
  type PayrollExportType,
} from "../../services/payrollService";

type UsePayrollExportProps = {
  startDate: string;
  endDate: string;
  userId: string;
  refreshPayroll: () => Promise<void>;
};

export function usePayrollExport({
  startDate,
  endDate,
  userId,
  refreshPayroll,
}: UsePayrollExportProps) {
  const [exporting, setExporting] = useState(false);

  async function downloadExport(type: PayrollExportType) {
    try {
      setExporting(true);

      const blob = await downloadPayrollExport(type, {
        startDate,
        endDate,
        userId,
      });

      const extension =
        type === "xlsx" ? "xlsx" : type === "pdf" ? "pdf" : "csv";

      const filename =
        type === "uniconta"
          ? `uniconta-payroll-${startDate}-${endDate}.csv`
          : `payroll-${startDate}-${endDate}.${extension}`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      await refreshPayroll();
    } finally {
      setExporting(false);
    }
  }

  return {
    exporting,
    downloadExport,
  };
}
