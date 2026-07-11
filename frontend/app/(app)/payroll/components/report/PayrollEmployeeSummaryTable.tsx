import type { PayrollEmployee } from "../../types";

import { formatHours } from "../../utils";

type PayrollEmployeeSummaryTableProps = {
  report: PayrollEmployee[];
};

export default function PayrollEmployeeSummaryTable({
  report,
}: PayrollEmployeeSummaryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead>
          <tr className="text-left text-sm text-gray-500 dark:text-gray-400">
            <th className="pb-3 pr-4">Medarbejder</th>
            <th className="pb-3 pr-4">Timer</th>
            <th className="pb-3 pr-4">Ekstra timer</th>
            <th className="pb-3 pr-4">Weekend</th>
            <th className="pb-3 pr-4">Aften</th>
            <th className="pb-3 pr-4">Nat</th>
            <th className="pb-3 pr-4">Afvigelser</th>
            <th className="pb-3 pr-4">Efterreguleringer</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {report.map((employee) => {
            const total = employee.entries.reduce(
              (sum, entry) => sum + entry.hours,
              0,
            );
            const overtime = employee.entries.reduce((sum, entry) => {
              const code = entry.payrollCode || "";
              return code.includes("OVERTIME") ? sum + entry.hours : sum;
            }, 0);
            const weekend = employee.entries.reduce((sum, entry) => {
              const code = entry.payrollCode || "";
              return code.includes("WEEKEND") ? sum + entry.hours : sum;
            }, 0);
            const evening = employee.entries.reduce((sum, entry) => {
              const code = entry.payrollCode || "";
              return code.includes("EVENING") ? sum + entry.hours : sum;
            }, 0);
            const night = employee.entries.reduce((sum, entry) => {
              const code = entry.payrollCode || "";
              return code.includes("NIGHT") ? sum + entry.hours : sum;
            }, 0);
            const adjustmentMinutes =
              employee.payrollAdjustments?.reduce(
                (sum, adjustment) =>
                  sum + Math.round(adjustment.hours * 60),
                0,
              ) ?? 0;
            const adjustmentHours = adjustmentMinutes / 60;

            return (
              <tr key={employee.userId}>
                <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">
                  {employee.name}
                </td>
                <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                  {formatHours(total)}
                </td>
                <td className="py-3 pr-4 font-medium text-red-600">
                  {formatHours(overtime)}
                </td>
                <td className="py-3 pr-4 font-medium text-purple-600">
                  {formatHours(weekend)}
                </td>
                <td className="py-3 pr-4 font-medium text-orange-600">
                  {formatHours(evening)}
                </td>
                <td className="py-3 pr-4 font-medium text-blue-600">
                  {formatHours(night)}
                </td>
                <td className="py-3 pr-4">
                  {(employee.deviationCount || 0) > 0 ? (
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      ⚠ {employee.deviationCount} afvigelser
                    </span>
                  ) : (
                    <span className="text-green-700 dark:text-green-300">
                      ✓ Ingen
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {adjustmentMinutes !== 0 ? (
                    <span
                      className={
                        adjustmentMinutes > 0
                          ? "font-medium text-green-700 dark:text-green-300"
                          : "font-medium text-red-700 dark:text-red-300"
                      }
                    >
                      {adjustmentMinutes > 0 ? "+" : ""}
                      {formatHours(adjustmentHours)}
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
