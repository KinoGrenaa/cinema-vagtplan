import { useMemo } from "react";

import type { PayrollEmployee } from "../../types";

export function usePayrollStats(report: PayrollEmployee[]) {
  const totalHours = useMemo(() => {
    return report.reduce((sum, employee) => sum + employee.totalHours, 0);
  }, [report]);

  const overtimeHours = useMemo(() => {
    return report.reduce((sum, employee) => {
      return (
        sum +
        employee.entries.reduce((entrySum, entry) => {
          const code = entry.payrollCode || "";
          return code.includes("OVERTIME")
            ? entrySum + entry.hours
            : entrySum;
        }, 0)
      );
    }, 0);
  }, [report]);

  const weekendHours = useMemo(() => {
    return report.reduce((sum, employee) => {
      return (
        sum +
        employee.entries.reduce((entrySum, entry) => {
          const code = entry.payrollCode || "";
          return code.includes("WEEKEND")
            ? entrySum + entry.hours
            : entrySum;
        }, 0)
      );
    }, 0);
  }, [report]);

  const eveningHours = useMemo(() => {
    return report.reduce((sum, employee) => {
      return (
        sum +
        employee.entries.reduce((entrySum, entry) => {
          const code = entry.payrollCode || "";
          return code.includes("EVENING")
            ? entrySum + entry.hours
            : entrySum;
        }, 0)
      );
    }, 0);
  }, [report]);

  const nightHours = useMemo(() => {
    return report.reduce((sum, employee) => {
      return (
        sum +
        employee.entries.reduce((entrySum, entry) => {
          const code = entry.payrollCode || "";
          return code.includes("NIGHT") ? entrySum + entry.hours : entrySum;
        }, 0)
      );
    }, 0);
  }, [report]);

  const payrollDistributionData = useMemo(() => {
    const totals: Record<string, number> = {};

    report.forEach((employee) => {
      employee.entries.forEach((entry) => {
        const key = entry.payrollCode || "STANDARD";
        totals[key] = (totals[key] || 0) + entry.hours;
      });
    });

    return Object.entries(totals).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }));
  }, [report]);

  const employeeLoadData = useMemo(() => {
    return report
      .map((employee) => ({
        name: employee.name,
        hours: Number(employee.totalHours.toFixed(2)),
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }, [report]);

  const dailyHoursData = useMemo(() => {
    const totals: Record<string, number> = {};

    report.forEach((employee) => {
      employee.entries.forEach((entry) => {
        totals[entry.date] = (totals[entry.date] || 0) + entry.hours;
      });
    });

    return Object.entries(totals)
      .map(([date, hours]) => ({
        date,
        hours: Number(hours.toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [report]);

  const overtimeWarnings = useMemo(() => {
    return report
      .map((employee) => {
        const overtime = employee.entries.reduce((sum, entry) => {
          const code = entry.payrollCode || "";
          return code.includes("OVERTIME") ? sum + entry.hours : sum;
        }, 0);

        const weekend = employee.entries.reduce((sum, entry) => {
          const code = entry.payrollCode || "";
          return code.includes("WEEKEND") ? sum + entry.hours : sum;
        }, 0);

        const night = employee.entries.reduce((sum, entry) => {
          const code = entry.payrollCode || "";
          return code.includes("NIGHT") ? sum + entry.hours : sum;
        }, 0);

        return {
          name: employee.name,
          totalHours: employee.totalHours,
          overtime,
          weekend,
          night,
        };
      })
      .filter(
        (employee) =>
          employee.overtime > 0 ||
          employee.weekend > 10 ||
          employee.night > 5,
      )
      .sort((a, b) => b.overtime - a.overtime);
  }, [report]);

  return {
    totalHours,
    overtimeHours,
    weekendHours,
    eveningHours,
    nightHours,
    payrollDistributionData,
    employeeLoadData,
    dailyHoursData,
    overtimeWarnings,
  };
}
