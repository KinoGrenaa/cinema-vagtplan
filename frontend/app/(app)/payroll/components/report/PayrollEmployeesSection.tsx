"use client";

import type { ComponentProps } from "react";

import { formatDateDK } from "@/app/utils/dateTime";

import PayrollEmployeeSummaryTable from "./PayrollEmployeeSummaryTable";
import { formatDateTime, formatHours } from "../../utils";

type PayrollReport = ComponentProps<
  typeof PayrollEmployeeSummaryTable
>["report"];

type PayrollEmployeesSectionProps = {
  expandedEmployeeIds: number[];
  loading: boolean;
  report: PayrollReport;
  onToggleEmployeeGroup: (employeeId: number) => void;
};

export default function PayrollEmployeesSection({
  expandedEmployeeIds,
  loading,
  report,
  onToggleEmployeeGroup,
}: PayrollEmployeesSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Medarbejdere
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Overblik over løngrundlag, afvigelser og efterreguleringer pr.
            medarbejder.
          </p>
        </div>
        <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {report.length} medarbejder{report.length === 1 ? "" : "e"}
        </div>
      </div>

      <PayrollEmployeeSummaryTable report={report} />

      <div className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-800">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Detaljer pr. medarbejder
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Fold en medarbejder ud for at se de enkelte tidsregistreringer.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl bg-gray-50 py-8 text-center text-sm text-gray-500 dark:bg-gray-950/40 dark:text-gray-400">
            Indlæser...
          </div>
        ) : report.length === 0 ? (
          <div className="rounded-xl bg-gray-50 py-8 text-center text-sm text-gray-500 dark:bg-gray-950/40 dark:text-gray-400">
            Ingen tidsregistreringer i perioden.
          </div>
        ) : (
          <div className="space-y-3">
            {report.map((employee) => {
              const isExpanded = expandedEmployeeIds.includes(employee.userId);

              return (
                <div
                  key={employee.userId}
                  className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
                >
                  <button
                    type="button"
                    onClick={() => onToggleEmployeeGroup(employee.userId)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 bg-gray-50 p-4 text-left transition hover:bg-gray-100 dark:bg-gray-950/40 dark:hover:bg-gray-800"
                  >
                    <div>
                      <div className="font-bold text-gray-900 dark:text-gray-100">
                        {employee.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {employee.email}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {employee.entries.length} registrering
                        {employee.entries.length === 1 ? "" : "er"}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Timer
                        </div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatHours(employee.totalHours)}
                        </div>
                      </div>
                      <div className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">
                        {isExpanded ? "Skjul" : "Vis"}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="overflow-x-auto border-t border-gray-200 dark:border-gray-800">
                      <table className="w-full min-w-[900px] text-sm text-gray-900 dark:text-gray-100">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200">
                            <th className="p-2">Dato</th>
                            <th className="p-2">Mødetid</th>
                            <th className="p-2">Fyraften</th>
                            <th className="p-2 text-right">Timer</th>
                            <th className="p-2">Jobfunktion</th>
                            <th className="p-2">Løntype</th>
                            <th className="p-2">Afvigelse</th>
                            <th className="p-2">Låst</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employee.entries.map((entry, index) => (
                            <tr
                              key={entry.id || `${employee.userId}-${index}`}
                              className="border-b border-gray-200 last:border-0 dark:border-gray-800"
                            >
                              <td className="p-2">
                                {formatDateDK(entry.date)}
                              </td>
                              <td className="p-2">
                                {formatDateTime(entry.clockIn)}
                              </td>
                              <td className="p-2">
                                {formatDateTime(entry.clockOut)}
                              </td>
                              <td className="p-2 text-right font-medium">
                                {formatHours(entry.hours)}
                              </td>
                              <td className="p-2">
                                {entry.jobFunction &&
                                entry.jobFunction !== "-"
                                  ? entry.jobFunction
                                  : "Manuel registrering"}
                              </td>
                              <td className="p-2">
                                {entry.payrollName || "-"}
                              </td>
                              <td className="p-2">
                                {entry.deviation?.hasDeviation ? (
                                  <div className="space-y-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                                    {entry.deviation.messages.length > 0 ? (
                                      entry.deviation.messages.map(
                                        (message, messageIndex) => (
                                          <div
                                            key={`${entry.id || index}-deviation-${messageIndex}`}
                                          >
                                            ⚠ {message}
                                          </div>
                                        ),
                                      )
                                    ) : (
                                      <div>⚠ Afvigelse</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                    OK
                                  </span>
                                )}
                              </td>
                              <td className="p-2">
                                {entry.payrollLocked ? "Ja" : "Nej"}
                                {entry.payrollUnlockedByMaster
                                  ? " / genåbnet"
                                  : ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
