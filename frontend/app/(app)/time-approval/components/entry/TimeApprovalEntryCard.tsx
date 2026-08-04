"use client";

import {
  useEffect,
} from "react";
import {
  useSearchParams,
} from "next/navigation";

import PayrollAdjustmentHistoryPanel from "../../../../components/time-entries/PayrollAdjustmentHistoryPanel";

import {
  parseTimeApprovalEntryTarget,
} from "../../helpers/core/timeApprovalEntryTarget";
import type {
  PayrollExportContext,
  TimeEntry,
} from "../../types";
import {
  formatDateTime,
} from "../../utils";
import DeviationPanel from "./DeviationPanel";
import TimeApprovalEntryActions from "./TimeApprovalEntryActions";
import TimeApprovalEntryNotes from "./TimeApprovalEntryNotes";

type Props = {
  entry: TimeEntry;
  isExpanded: boolean;
  onToggleDetails:
    (entryId: number) => void;
  onEdit:
    (entry: TimeEntry) => void;
  onOpenHistory:
    (entry: TimeEntry) => void;
  onApprove:
    (entry: TimeEntry) => void;
  onUnapprove:
    (entry: TimeEntry) => void;
  onSendBackForChanges:
    (entryId: number) => void;
  onVoid:
    (entry: TimeEntry) => void;
};

const payrollPeriodFormatter =
  new Intl.DateTimeFormat(
    "da-DK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone:
        "Europe/Copenhagen",
    },
  );

function getHours(entry: TimeEntry) {
  if (!entry.clockOut) {
    return "-";
  }

  const start =
    new Date(entry.clockIn);
  const end =
    new Date(entry.clockOut);
  const hours =
    (end.getTime() -
      start.getTime()) /
    1000 /
    60 /
    60;

  return hours.toFixed(2);
}

function formatPayrollPeriod(
  period: {
    startDate: string;
    endDate: string;
  },
) {
  return `${payrollPeriodFormatter.format(
    new Date(period.startDate),
  )} – ${payrollPeriodFormatter.format(
    new Date(period.endDate),
  )}`;
}

function PayrollExportWarning({
  context,
}: {
  context:
    PayrollExportContext;
}) {
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-950 dark:bg-amber-800 dark:text-amber-50">
          Eksporteret lønperiode
        </span>

        {context.hasPendingAdjustment && (
          <span className="rounded-full border border-amber-400 px-2.5 py-1 text-xs font-semibold dark:border-amber-700">
            Efterregulering findes
          </span>
        )}
      </div>

      <p className="mt-3 text-sm font-semibold">
        Registreringen indgår i
        lønperioden{" "}
        {formatPayrollPeriod(
          context.originalPayrollPeriod,
        )}
        .
      </p>

      <p className="mt-1 text-sm">
        Godkendelse, rettelse,
        fjernelse af godkendelse eller
        afvisning kræver en ekstra
        bekræftelse. Forskellen føres
        som efterregulering.
      </p>

      {context.adjustmentPayrollPeriod && (
        <p className="mt-2 text-xs font-medium">
          Efterreguleres i:{" "}
          {formatPayrollPeriod(
            context.adjustmentPayrollPeriod,
          )}
        </p>
      )}
    </div>
  );
}

export default function TimeApprovalEntryCard({
  entry,
  isExpanded,
  onToggleDetails,
  onEdit,
  onOpenHistory,
  onApprove,
  onUnapprove,
  onSendBackForChanges,
  onVoid,
}: Props) {
  const searchParams =
    useSearchParams();
  const entryTarget =
    parseTimeApprovalEntryTarget(
      searchParams.get(
        "entryId",
      ),
    );
  const isFocused =
    entryTarget.entryId ===
    entry.id;

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const timeoutId =
      window.setTimeout(() => {
        const element =
          document.getElementById(
            `time-entry-${entry.id}`,
          );

        if (!element) {
          return;
        }

        element.focus({
          preventScroll: true,
        });

        const reduceMotion =
          window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;

        element.scrollIntoView({
          behavior: reduceMotion
            ? "auto"
            : "smooth",
          block: "center",
        });
      }, 100);

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    entry.id,
    isFocused,
  ]);

  const hasDetails = Boolean(
    entry.deviation?.hasDeviation ||
      entry.clockInNote ||
      entry.clockOutNote ||
      entry.note ||
      entry.adminNote,
  );

  return (
    <div
      id={`time-entry-${entry.id}`}
      tabIndex={-1}
      aria-label={
        isFocused
          ? "Fremhævet tidsregistrering"
          : undefined
      }
      className={`rounded-2xl border bg-white p-6 shadow-sm outline-none transition-colors dark:bg-gray-900 ${
        isFocused
          ? "border-blue-500 ring-4 ring-blue-500/60 ring-offset-4 ring-offset-white dark:border-blue-400 dark:ring-blue-400/60 dark:ring-offset-gray-950"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">
              {formatDateTime(
                entry.clockIn,
              )}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {entry.shift
                ?.jobFunction?.name ||
                "Manuel registrering"}
            </p>
          </div>

          {entry.payrollExportContext && (
            <PayrollExportWarning
              context={
                entry.payrollExportContext
              }
            />
          )}

          <PayrollAdjustmentHistoryPanel
            items={
              entry.payrollAdjustmentHistory
            }
          />

          <div className="grid gap-2 text-sm">
            <div>
              <span className="font-semibold">
                Jobfunktion:
              </span>{" "}
              {entry.shift
                ?.jobFunction?.name ||
                "-"}
            </div>

            <div>
              <span className="font-semibold">
                Mødt:
              </span>{" "}
              {formatDateTime(
                entry.clockIn,
              )}
            </div>

            <div>
              <span className="font-semibold">
                Gået hjem:
              </span>{" "}
              {formatDateTime(
                entry.clockOut,
              )}
            </div>

            <div>
              <span className="font-semibold">
                Timer:
              </span>{" "}
              {getHours(entry)}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  onToggleDetails(
                    entry.id,
                  )
                }
                className={`rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
                  hasDetails
                    ? "bg-amber-100 text-amber-900 hover:bg-amber-200 focus-visible:ring-amber-500 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/50 dark:focus-visible:ring-amber-400"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-gray-500 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus-visible:ring-gray-400"
                }`}
              >
                {hasDetails
                  ? "⚠ Vis detaljer"
                  : "Vis detaljer"}
              </button>
            </div>

            {isExpanded && (
              <DeviationPanel
                entry={entry}
              />
            )}

            <TimeApprovalEntryNotes
              entry={entry}
            />
          </div>
        </div>

        <TimeApprovalEntryActions
          entry={entry}
          onEdit={onEdit}
          onOpenHistory={
            onOpenHistory
          }
          onApprove={onApprove}
          onUnapprove={
            onUnapprove
          }
          onSendBackForChanges={
            onSendBackForChanges
          }
          onVoid={onVoid}
        />
      </div>
    </div>
  );
}
