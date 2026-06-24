import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDateTime } from "../utils";

type DailyHoursDataItem = {
  date: string;
  hours: number;
};

type PayrollDistributionDataItem = {
  name: string;
  value: number;
};

type EmployeeLoadDataItem = {
  name: string;
  hours: number;
};

type AuditHistoryItem = {
  id: string | number;
  status: string;
  startDate: string | number | Date;
  endDate: string | number | Date;
  lockedAt?: string | number | Date | null;
  exportedAt?: string | number | Date | null;
  unlockedAt?: string | number | Date | null;
  unlockNote?: string | null;
};

type PayrollAdvancedAnalysisSectionProps = {
  auditHistory: AuditHistoryItem[];
  dailyHoursData: DailyHoursDataItem[];
  employeeLoadData: EmployeeLoadDataItem[];
  payrollDistributionData: PayrollDistributionDataItem[];
};

const PAYROLL_DISTRIBUTION_COLORS = [
  "#2563eb",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#16a34a",
];

function formatAuditDateTime(value?: string | number | Date | null) {
  return formatDateTime(value as string | null | undefined);
}

export default function PayrollAdvancedAnalysisSection({
  auditHistory,
  dailyHoursData,
  employeeLoadData,
  payrollDistributionData,
}: PayrollAdvancedAnalysisSectionProps) {
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Avanceret analyse
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Grafer og lønhistorik er skjult som standard for at holde
            lønkørslen overskuelig.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvancedAnalysis((value) => !value)}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          {showAdvancedAnalysis ? "Skjul analyse" : "Vis analyse"}
        </button>
      </div>

      {showAdvancedAnalysis && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/40">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Timer pr. dag
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Arbejdstimer i den valgte lønperiode.
                </p>
              </div>

              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyHoursData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="#2563eb"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/40">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Lønfordeling
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Fordeling af lønarter.
                </p>
              </div>

              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={payrollDistributionData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={95}
                      label
                    >
                      {payrollDistributionData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={
                            PAYROLL_DISTRIBUTION_COLORS[
                              index % PAYROLL_DISTRIBUTION_COLORS.length
                            ] ?? "#2563eb"
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/40 xl:col-span-2">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Mest belastede medarbejdere
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Top medarbejdere baseret på timer.
                </p>
              </div>

              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={employeeLoadData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="hours"
                      fill="#16a34a"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/40">
            <h3 className="mb-4 text-lg font-bold">Lønhistorik</h3>

            {auditHistory.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Ingen historik for perioden.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm text-gray-900 dark:text-gray-100">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200">
                      <th className="p-2">Status</th>
                      <th className="p-2">Start</th>
                      <th className="p-2">Slut</th>
                      <th className="p-2">Låst</th>
                      <th className="p-2">Eksporteret</th>
                      <th className="p-2">Genåbnet</th>
                      <th className="p-2">Note</th>
                    </tr>
                  </thead>

                  <tbody>
                    {auditHistory.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-200 dark:border-gray-800"
                      >
                        <td className="p-2 font-medium">{item.status}</td>
                        <td className="p-2">
                          {new Date(item.startDate).toLocaleDateString(
                            "da-DK",
                          )}
                        </td>
                        <td className="p-2">
                          {new Date(item.endDate).toLocaleDateString("da-DK")}
                        </td>
                        <td className="p-2">
                          {formatAuditDateTime(item.lockedAt)}
                        </td>
                        <td className="p-2">
                          {formatAuditDateTime(item.exportedAt)}
                        </td>
                        <td className="p-2">
                          {formatAuditDateTime(item.unlockedAt)}
                        </td>
                        <td className="p-2">{item.unlockNote || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
