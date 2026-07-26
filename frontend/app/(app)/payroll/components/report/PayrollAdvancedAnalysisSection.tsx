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

import { formatDateTime } from "../../utils";

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

type AuditAdjustmentItem = {
  id: number;
  relation: "ORIGINAL" | "SETTLEMENT";
  type: string;
  status: string;
  minutesDelta: number;
  reason: string;
  createdAt: string | number | Date;
  includedAt?: string | number | Date | null;
  voidedAt?: string | number | Date | null;
  employeeName: string;
  createdByName?: string | null;
  originalPayrollPeriodId: number;
  originalPayrollPeriodStartDate: string | number | Date;
  originalPayrollPeriodEndDate: string | number | Date;
  settlementPayrollPeriodId?: number | null;
  settlementPayrollPeriodStartDate?: string | number | Date | null;
  settlementPayrollPeriodEndDate?: string | number | Date | null;
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
  adjustments?: AuditAdjustmentItem[];
};

type PayrollAdvancedAnalysisSectionProps = {
  auditHistory: AuditHistoryItem[];
  auditHistoryLoading: boolean;
  dailyHoursData: DailyHoursDataItem[];
  employeeLoadData: EmployeeLoadDataItem[];
  payrollDistributionData: PayrollDistributionDataItem[];
  onShowAnalysis: () => void;
};

const PAYROLL_DISTRIBUTION_COLORS = [
  "#2563eb",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#16a34a",
];

const ADJUSTMENT_TYPE_LABELS: Record<string, string> = {
  APPROVAL_AFTER_EXPORT: "Godkendelse efter eksport",
  EDIT_AFTER_EXPORT: "Rettelse efter eksport",
  MANUAL_ENTRY_IN_EXPORTED_PERIOD: "Manuel registrering efter eksport",
};

const ADJUSTMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Afventer",
  INCLUDED: "Medtaget",
  VOIDED: "Annulleret",
};

function formatAuditDateTime(value?: string | number | Date | null) {
  return formatDateTime(value as string | null | undefined);
}

function formatAuditDate(value: string | number | Date) {
  return new Date(value).toLocaleDateString("da-DK");
}

function formatAuditPeriod(
  startDate: string | number | Date,
  endDate: string | number | Date,
) {
  return `${formatAuditDate(startDate)} – ${formatAuditDate(endDate)}`;
}

function formatSignedMinutes(minutes: number) {
  const sign = minutes > 0 ? "+" : minutes < 0 ? "−" : "";
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const remainingMinutes = absoluteMinutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${sign}${hours} t ${remainingMinutes} min`;
  }

  if (hours > 0) {
    return `${sign}${hours} t`;
  }

  return `${sign}${remainingMinutes} min`;
}

function getAdjustmentRelationLabel(relation: "ORIGINAL" | "SETTLEMENT") {
  return relation === "ORIGINAL"
    ? "Oprindelig periode"
    : "Afregningsperiode";
}

function getAdjustmentRelationClasses(
  relation: "ORIGINAL" | "SETTLEMENT",
) {
  return relation === "ORIGINAL"
    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200"
    : "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-200";
}

function getAdjustmentStatusLabel(status: string) {
  return ADJUSTMENT_STATUS_LABELS[status] ?? status;
}

function getAdjustmentStatusClasses(status: string) {
  if (status === "INCLUDED") {
    return "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200";
  }

  if (status === "VOIDED") {
    return "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }

  return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200";
}

function getAdjustmentDeltaClasses(minutes: number) {
  if (minutes > 0) {
    return "text-green-700 dark:text-green-300";
  }

  if (minutes < 0) {
    return "text-red-700 dark:text-red-300";
  }

  return "text-gray-700 dark:text-gray-300";
}

export default function PayrollAdvancedAnalysisSection({
  auditHistory,
  auditHistoryLoading,
  dailyHoursData,
  employeeLoadData,
  payrollDistributionData,
  onShowAnalysis,
}: PayrollAdvancedAnalysisSectionProps) {
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);
  const periodsWithAdjustments = auditHistory.filter(
    (item) => (item.adjustments?.length ?? 0) > 0,
  );

  function toggleAdvancedAnalysis() {
    const nextValue = !showAdvancedAnalysis;

    setShowAdvancedAnalysis(nextValue);

    if (nextValue) {
      onShowAnalysis();
    }
  }

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
          onClick={toggleAdvancedAnalysis}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
          aria-expanded={showAdvancedAnalysis}
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

            {auditHistoryLoading ? (
              <div
                className="text-sm text-gray-500 dark:text-gray-400"
                role="status"
                aria-live="polite"
              >
                Henter lønhistorik...
              </div>
            ) : auditHistory.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Ingen historik for perioden.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm text-gray-900 dark:text-gray-100">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        <th className="p-2">Status</th>
                        <th className="p-2">Start</th>
                        <th className="p-2">Slut</th>
                        <th className="p-2">Låst</th>
                        <th className="p-2">Eksporteret</th>
                        <th className="p-2">Genåbnet</th>
                        <th className="p-2">Efterreguleringer</th>
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
                            {formatAuditDate(item.startDate)}
                          </td>
                          <td className="p-2">
                            {formatAuditDate(item.endDate)}
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
                          <td className="p-2">
                            {item.adjustments?.length ?? 0}
                          </td>
                          <td className="p-2">{item.unlockNote || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {periodsWithAdjustments.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-gray-100">
                        Efterreguleringer i historikken
                      </h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Rettelser og godkendelser efter eksport, grupperet efter
                        den oprindelige lønperiode.
                      </p>
                    </div>

                    {periodsWithAdjustments.map((historyPeriod) => (
                      <div
                        key={`audit-adjustments-${historyPeriod.id}`}
                        className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                      >
                        <div className="flex flex-col gap-1 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-950/50">
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              Lønperiode i historikken
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {formatAuditPeriod(
                                historyPeriod.startDate,
                                historyPeriod.endDate,
                              )}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {historyPeriod.adjustments?.length ?? 0} stk.
                          </div>
                        </div>

                        <div className="divide-y divide-gray-200 dark:divide-gray-800">
                          {(historyPeriod.adjustments ?? []).map(
                            (adjustment) => (
                              <article
                                key={adjustment.id}
                                className="space-y-3 p-4"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                                        {adjustment.employeeName}
                                      </div>
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getAdjustmentRelationClasses(
                                          adjustment.relation,
                                        )}`}
                                      >
                                        {getAdjustmentRelationLabel(
                                          adjustment.relation,
                                        )}
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {ADJUSTMENT_TYPE_LABELS[
                                        adjustment.type
                                      ] ?? adjustment.type}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`text-sm font-bold ${getAdjustmentDeltaClasses(
                                        adjustment.minutesDelta,
                                      )}`}
                                    >
                                      {formatSignedMinutes(
                                        adjustment.minutesDelta,
                                      )}
                                    </span>
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getAdjustmentStatusClasses(
                                        adjustment.status,
                                      )}`}
                                    >
                                      {getAdjustmentStatusLabel(
                                        adjustment.status,
                                      )}
                                    </span>
                                  </div>
                                </div>

                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {adjustment.reason}
                                </p>

                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                  <span>
                                    Oprettet{" "}
                                    {formatAuditDateTime(adjustment.createdAt)}
                                    {adjustment.createdByName
                                      ? ` af ${adjustment.createdByName}`
                                      : ""}
                                  </span>
                                  <span>
                                    Oprindelig periode{" "}
                                    {formatAuditPeriod(
                                      adjustment.originalPayrollPeriodStartDate,
                                      adjustment.originalPayrollPeriodEndDate,
                                    )}
                                  </span>
                                  {adjustment.settlementPayrollPeriodStartDate &&
                                  adjustment.settlementPayrollPeriodEndDate ? (
                                    <span>
                                      Afregnes i{" "}
                                      {formatAuditPeriod(
                                        adjustment.settlementPayrollPeriodStartDate,
                                        adjustment.settlementPayrollPeriodEndDate,
                                      )}
                                    </span>
                                  ) : (
                                    <span>
                                      Afregningsperiode ikke fastlagt
                                    </span>
                                  )}
                                </div>
                              </article>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
