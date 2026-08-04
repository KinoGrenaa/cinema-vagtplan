"use client";

import Link from "next/link";

import {
  formatDateDK,
} from "@/app/utils/dateTime";

import type {
  PayrollAdjustment,
  PayrollEmployee,
} from "../../types";
import {
  formatDateTime,
} from "../../utils";

type PayrollAdjustmentEmployee =
  Pick<
    PayrollEmployee,
    "userId" | "name" | "email"
  > & {
    payrollAdjustments:
      PayrollAdjustment[];
  };

type Props = {
  employees:
    PayrollAdjustmentEmployee[];
};

type AdjustmentStatus =
  | "PENDING"
  | "INCLUDED";

type AdjustmentGroup = {
  key: string;
  status: AdjustmentStatus;
  settlementLabel: string;
  adjustments:
    PayrollAdjustment[];
};

function formatSignedHoursAsTime(
  hoursValue: number,
) {
  const sign =
    hoursValue >= 0 ? "+" : "-";
  const absoluteMinutes =
    Math.round(
      Math.abs(hoursValue) * 60,
    );
  const hours =
    Math.floor(
      absoluteMinutes / 60,
    );
  const minutes =
    absoluteMinutes % 60;

  return `${sign}${String(
    hours,
  ).padStart(2, "0")}:${String(
    minutes,
  ).padStart(2, "0")}`;
}

function formatHoursAsTime(
  hoursValue: number,
) {
  const absoluteMinutes =
    Math.round(
      Math.abs(hoursValue) * 60,
    );
  const hours =
    Math.floor(
      absoluteMinutes / 60,
    );
  const minutes =
    absoluteMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0",
  )}:${String(minutes).padStart(
    2,
    "0",
  )}`;
}

function formatAdjustmentReason(
  reason: string,
) {
  switch (reason) {
    case "EDIT_AFTER_EXPORT":
      return "Rettet efter eksport";
    case "APPROVAL_AFTER_EXPORT":
      return "Godkendt efter eksport";
    case "UNAPPROVAL_AFTER_EXPORT":
      return "Godkendelse fjernet efter eksport";
    case "VOID_AFTER_EXPORT":
      return "Afvist efter eksport";
    case "MANUAL_ENTRY_IN_EXPORTED_PERIOD":
      return "Manuel registrering i eksporteret periode";
    default:
      return "Efterregulering";
  }
}

function formatPeriod(
  startDate:
    | string
    | null
    | undefined,
  endDate:
    | string
    | null
    | undefined,
) {
  if (!startDate || !endDate) {
    return null;
  }

  return `${formatDateDK(
    startDate,
  )} – ${formatDateDK(endDate)}`;
}

function getStatus(
  adjustment: PayrollAdjustment,
): AdjustmentStatus {
  return adjustment.status ===
    "INCLUDED"
    ? "INCLUDED"
    : "PENDING";
}

function getSettlementLabel(
  adjustment: PayrollAdjustment,
) {
  const period =
    formatPeriod(
      adjustment
        .settlementPayrollPeriodStartDate,
      adjustment
        .settlementPayrollPeriodEndDate,
    );

  if (period) {
    return period;
  }

  return "Afventer næste åbne lønperiode";
}

function groupAdjustments(
  adjustments:
    PayrollAdjustment[],
) {
  const groups =
    new Map<
      string,
      AdjustmentGroup
    >();

  for (
    const adjustment of
    adjustments
  ) {
    const status =
      getStatus(adjustment);
    const settlementLabel =
      getSettlementLabel(
        adjustment,
      );
    const key =
      `${status}:` +
      `${
        adjustment
          .settlementPayrollPeriodId ??
        "unassigned"
      }`;

    const group =
      groups.get(key) ?? {
        key,
        status,
        settlementLabel,
        adjustments: [],
      };

    group.adjustments.push(
      adjustment,
    );
    groups.set(key, group);
  }

  return Array.from(
    groups.values(),
  ).sort((first, second) => {
    if (
      first.status !==
      second.status
    ) {
      return first.status ===
        "PENDING"
        ? -1
        : 1;
    }

    return first.settlementLabel.localeCompare(
      second.settlementLabel,
      "da",
    );
  });
}

function sumHours(
  adjustments:
    PayrollAdjustment[],
) {
  return adjustments.reduce(
    (sum, adjustment) =>
      sum + adjustment.hours,
    0,
  );
}

function StatusBadge({
  status,
}: {
  status: AdjustmentStatus;
}) {
  const pending =
    status === "PENDING";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
        pending
          ? "bg-amber-200 text-amber-950 dark:bg-amber-800 dark:text-amber-50"
          : "bg-green-200 text-green-950 dark:bg-green-800 dark:text-green-50"
      }`}
    >
      {pending
        ? "Ventende"
        : "Inkluderet"}
    </span>
  );
}

function SummaryCard({
  label,
  count,
  hours,
  tone,
}: {
  label: string;
  count: number;
  hours: number;
  tone:
    | "amber"
    | "green"
    | "blue";
}) {
  const toneClass = {
    amber:
      "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100",
    green:
      "border-green-300 bg-green-50 text-green-950 dark:border-green-800 dark:bg-green-950/35 dark:text-green-100",
    blue:
      "border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/35 dark:text-blue-100",
  }[tone];

  return (
    <div
      className={`rounded-xl border p-4 ${toneClass}`}
    >
      <p className="text-sm font-semibold">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">
        {count}
      </p>
      <p className="mt-1 text-sm font-medium">
        {formatSignedHoursAsTime(
          hours,
        )}
      </p>
    </div>
  );
}

export default function PayrollAdjustmentsSection({
  employees,
}: Props) {
  if (employees.length === 0) {
    return null;
  }

  const allAdjustments =
    employees.flatMap(
      (employee) =>
        employee.payrollAdjustments,
    );
  const pendingAdjustments =
    allAdjustments.filter(
      (adjustment) =>
        getStatus(adjustment) ===
        "PENDING",
    );
  const includedAdjustments =
    allAdjustments.filter(
      (adjustment) =>
        getStatus(adjustment) ===
        "INCLUDED",
    );

  return (
    <section
      aria-labelledby="payroll-adjustments-heading"
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="payroll-adjustments-heading"
            className="text-xl font-bold text-gray-950 dark:text-white"
          >
            Efterreguleringer
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
            Ventende ændringer er endnu
            ikke bundet til en afsluttet
            lønkørsel. Inkluderede
            ændringer er allerede
            medtaget i den viste
            afregningsperiode.
          </p>
        </div>

        <Link
          href="/time-approval"
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
        >
          Åbn tidsregistreringer
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Ventende"
          count={
            pendingAdjustments.length
          }
          hours={sumHours(
            pendingAdjustments,
          )}
          tone="amber"
        />
        <SummaryCard
          label="Inkluderet"
          count={
            includedAdjustments.length
          }
          hours={sumHours(
            includedAdjustments,
          )}
          tone="green"
        />
        <SummaryCard
          label="Samlet forskel"
          count={
            allAdjustments.length
          }
          hours={sumHours(
            allAdjustments,
          )}
          tone="blue"
        />
      </div>

      <div className="mt-6 space-y-4">
        {employees.map(
          (employee) => {
            const groups =
              groupAdjustments(
                employee.payrollAdjustments,
              );
            const employeeHours =
              sumHours(
                employee.payrollAdjustments,
              );

            return (
              <details
                key={employee.userId}
                open
                className="group rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60"
              >
                <summary className="flex cursor-pointer list-none flex-col gap-2 rounded-xl px-4 py-4 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset dark:hover:bg-gray-800 dark:focus-visible:ring-blue-400 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-gray-950 dark:text-white">
                      {employee.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {employee.email}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-gray-200 px-2.5 py-1 font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                      {
                        employee
                          .payrollAdjustments
                          .length
                      }{" "}
                      stk.
                    </span>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 font-bold text-blue-900 dark:bg-blue-950/60 dark:text-blue-100">
                      {formatSignedHoursAsTime(
                        employeeHours,
                      )}
                    </span>
                  </div>
                </summary>

                <div className="space-y-4 border-t border-gray-200 p-4 dark:border-gray-700">
                  {groups.map(
                    (group) => (
                      <div
                        key={group.key}
                        className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge
                              status={
                                group.status
                              }
                            />
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                              {
                                group.settlementLabel
                              }
                            </span>
                          </div>

                          <span className="text-sm font-bold text-gray-950 dark:text-white">
                            {formatSignedHoursAsTime(
                              sumHours(
                                group.adjustments,
                              ),
                            )}
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {group.adjustments.map(
                            (
                              adjustment,
                            ) => {
                              const originalPeriod =
                                formatPeriod(
                                  adjustment
                                    .originalPayrollPeriodStartDate,
                                  adjustment
                                    .originalPayrollPeriodEndDate,
                                );

                              return (
                                <article
                                  key={
                                    adjustment.id
                                  }
                                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70"
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                      <p className="font-semibold text-gray-950 dark:text-white">
                                        {formatAdjustmentReason(
                                          adjustment.reason,
                                        )}
                                      </p>
                                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                        {
                                          adjustment.jobFunction
                                        }{" "}
                                        ·{" "}
                                        {
                                          adjustment.payrollName
                                        }
                                      </p>
                                    </div>

                                    <span className="text-lg font-bold text-blue-800 dark:text-blue-200">
                                      {formatSignedHoursAsTime(
                                        adjustment.hours,
                                      )}
                                    </span>
                                  </div>

                                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                      <dt className="font-semibold text-gray-600 dark:text-gray-300">
                                        Timer
                                      </dt>
                                      <dd className="mt-1 text-gray-950 dark:text-white">
                                        {formatHoursAsTime(
                                          adjustment.exportedHours,
                                        )}{" "}
                                        →{" "}
                                        {formatHoursAsTime(
                                          adjustment.adjustedHours,
                                        )}
                                      </dd>
                                    </div>

                                    <div>
                                      <dt className="font-semibold text-gray-600 dark:text-gray-300">
                                        Oprindelig
                                        periode
                                      </dt>
                                      <dd className="mt-1 text-gray-950 dark:text-white">
                                        {originalPeriod ??
                                          "-"}
                                      </dd>
                                    </div>

                                    <div>
                                      <dt className="font-semibold text-gray-600 dark:text-gray-300">
                                        Afregningsperiode
                                      </dt>
                                      <dd className="mt-1 text-gray-950 dark:text-white">
                                        {
                                          group.settlementLabel
                                        }
                                      </dd>
                                    </div>

                                    <div>
                                      <dt className="font-semibold text-gray-600 dark:text-gray-300">
                                        Oprettet
                                      </dt>
                                      <dd className="mt-1 text-gray-950 dark:text-white">
                                        {formatDateTime(
                                          adjustment.createdAt,
                                        )}
                                      </dd>
                                    </div>
                                  </dl>

                                  <div className="mt-4">
                                    <Link
                                      href={`/time-approval?entryId=${adjustment.timeEntryId}`}
                                      className="inline-flex min-h-10 items-center rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-200 dark:hover:bg-blue-950/40 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
                                    >
                                      Åbn berørt
                                      tidsregistrering
                                    </Link>
                                  </div>
                                </article>
                              );
                            },
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </details>
            );
          },
        )}
      </div>
    </section>
  );
}
