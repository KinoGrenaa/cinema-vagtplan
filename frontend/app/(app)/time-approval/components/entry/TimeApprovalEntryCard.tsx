"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import PayrollAdjustmentHistoryPanel from "../../../../components/time-entries/PayrollAdjustmentHistoryPanel";
import AutomaticTimeRegistrationNotice from "../../../../components/time-entries/AutomaticTimeRegistrationNotice";
import { parseTimeApprovalEntryTarget } from "../../helpers/core/timeApprovalEntryTarget";
import type { PayrollExportContext, TimeEntry } from "../../types";
import { getStatusClass, getStatusLabel } from "../../utils";
import DeviationPanel from "./DeviationPanel";
import TimeApprovalEntryActions from "./TimeApprovalEntryActions";
import TimeApprovalEntryNotes from "./TimeApprovalEntryNotes";

type Props = {
  entry: TimeEntry;
  isExpanded: boolean;
  onToggleDetails: (entryId: number) => void;
  onEdit: (entry: TimeEntry) => void;
  onOpenHistory: (entry: TimeEntry) => void;
  onApprove: (entry: TimeEntry) => void;
  onUnapprove: (entry: TimeEntry) => void;
  onSendBackForChanges: (entryId: number) => void;
  onVoid: (entry: TimeEntry) => void;
};

const payrollPeriodFormatter = new Intl.DateTimeFormat("da-DK", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Copenhagen",
});

const compactDateFormatter = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Copenhagen",
});

const compactTimeFormatter = new Intl.DateTimeFormat("da-DK", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Copenhagen",
});

const compactDateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Copenhagen",
});

const summaryPrimaryAction =
  "inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:active:bg-emerald-400 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-gray-900";

const summaryWarningAction =
  "inline-flex min-h-9 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 active:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-950/60 dark:active:bg-amber-900/60 dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-gray-900";

const summaryToggleAction =
  "inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-offset-gray-900";

function formatPayrollPeriod(period: { startDate: string; endDate: string }) {
  return `${payrollPeriodFormatter.format(
    new Date(period.startDate),
  )} – ${payrollPeriodFormatter.format(new Date(period.endDate))}`;
}

function formatCompactDate(value: string) {
  return compactDateFormatter.format(new Date(value));
}

function formatCompactTime(value?: string | null) {
  if (!value) return null;
  return compactTimeFormatter.format(new Date(value)).replace(".", ":");
}

function getCompactTimeRange(entry: TimeEntry) {
  const start = formatCompactTime(entry.clockIn) ?? "-";

  if (!entry.clockOut) {
    return `${start}–åben`;
  }

  const end = formatCompactTime(entry.clockOut) ?? "-";
  const startDate = compactDateKeyFormatter.format(new Date(entry.clockIn));
  const endDate = compactDateKeyFormatter.format(new Date(entry.clockOut));
  const overnight = startDate !== endDate ? " (+1 dag)" : "";

  return `${start}–${end}${overnight}`;
}

function getDurationLabel(entry: TimeEntry) {
  if (!entry.clockOut) {
    return "Åben registrering";
  }

  const minutes = Math.max(
    0,
    Math.round(
      (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) /
        60000,
    ),
  );
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest} min.`;
  }

  return `${hours} t. ${String(rest).padStart(2, "0")} min.`;
}

function PayrollExportWarning({
  context,
}: {
  context: PayrollExportContext;
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
        Registreringen indgår i lønperioden{" "}
        {formatPayrollPeriod(context.originalPayrollPeriod)}.
      </p>
      <p className="mt-1 text-sm">
        Godkendelse, rettelse, fjernelse af godkendelse eller afvisning kræver
        en ekstra bekræftelse. Forskellen føres som efterregulering.
      </p>

      {context.adjustmentPayrollPeriod && (
        <p className="mt-2 text-xs font-medium">
          Efterreguleres i:{" "}
          {formatPayrollPeriod(context.adjustmentPayrollPeriod)}
        </p>
      )}
    </div>
  );
}

function SummaryBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${className}`}
    >
      {children}
    </span>
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
  const searchParams = useSearchParams();
  const entryTarget = parseTimeApprovalEntryTarget(searchParams.get("entryId"));
  const isFocused = entryTarget.entryId === entry.id;

  useEffect(() => {
    if (!isFocused) return;

    const timeoutId = window.setTimeout(() => {
      const element = document.getElementById(`time-entry-${entry.id}`);
      if (!element) return;

      element.focus({ preventScroll: true });

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      element.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [entry.id, isFocused]);

  const isPending = entry.status === "PENDING";
  const isApproved = entry.status === "APPROVED";
  const isManual = !entry.shift;
  const hasDeviation = Boolean(entry.shift && entry.deviation?.hasDeviation);
  const isAutomatic = Boolean(entry.automaticClockIn || entry.automaticClockOut);
  const hasNote = Boolean(
    entry.clockInNote || entry.clockOutNote || entry.note || entry.adminNote,
  );
  const requiresNote = Boolean(entry.shift && entry.deviation?.requiresNote);
  const isOpenEntry = !entry.clockOut;

  return (
    <div
      id={`time-entry-${entry.id}`}
      tabIndex={-1}
      aria-label={isFocused ? "Fremhævet tidsregistrering" : undefined}
      className={`overflow-hidden rounded-xl border bg-white shadow-sm outline-none transition-colors dark:bg-gray-900 ${
        isFocused
          ? "border-blue-500 ring-2 ring-inset ring-blue-500/70 dark:border-blue-400 dark:ring-blue-400/70"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center">
        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[8rem_minmax(10rem,1fr)_minmax(0,1.4fr)] md:items-center">
          <div>
            <div className="text-sm font-bold text-gray-950 dark:text-white">
              {formatCompactDate(entry.clockIn)}
            </div>
            <div className="mt-0.5 text-sm font-medium text-gray-600 dark:text-gray-300">
              {getCompactTimeRange(entry)}
            </div>
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-950 dark:text-white">
              {entry.shift?.jobFunction?.name || "Manuel registrering"}
            </div>
            <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {getDurationLabel(entry)}
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <SummaryBadge className={getStatusClass(entry.status)}>
              {getStatusLabel(entry.status)}
            </SummaryBadge>

            {isManual && (
              <SummaryBadge className="bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
                Manuel
              </SummaryBadge>
            )}

            {hasDeviation && (
              <SummaryBadge className="bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
                Afvigelse
              </SummaryBadge>
            )}

            {isAutomatic && (
              <SummaryBadge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                Automatisk udfyldt
              </SummaryBadge>
            )}

            {hasNote && (
              <SummaryBadge className="bg-blue-50 text-blue-700 dark:bg-blue-950/25 dark:text-blue-200">
                Note
              </SummaryBadge>
            )}

            {requiresNote && (
              <SummaryBadge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200">
                Kræver note
              </SummaryBadge>
            )}

            {entry.payrollExportContext && (
              <SummaryBadge className="bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                Eksporteret periode
              </SummaryBadge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {isPending && !isOpenEntry && (
            <button
              type="button"
              onClick={() => onApprove(entry)}
              className={summaryPrimaryAction}
            >
              Godkend
            </button>
          )}

          {isApproved && (
            <button
              type="button"
              onClick={() => onUnapprove(entry)}
              className={summaryWarningAction}
            >
              Fjern godkendelse
            </button>
          )}

          <button
            type="button"
            onClick={() => onToggleDetails(entry.id)}
            aria-expanded={isExpanded}
            className={summaryToggleAction}
          >
            {isExpanded ? "Skjul" : "Vis"}
            <span aria-hidden="true">{isExpanded ? "▲" : "▼"}</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50/60 px-4 py-4 dark:border-gray-800 dark:bg-gray-950/25">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0 space-y-3">
              <AutomaticTimeRegistrationNotice
                automaticClockIn={entry.automaticClockIn}
                automaticClockOut={entry.automaticClockOut}
                compact
              />

              {entry.payrollExportContext && (
                <PayrollExportWarning context={entry.payrollExportContext} />
              )}

              <PayrollAdjustmentHistoryPanel
                items={entry.payrollAdjustmentHistory}
              />

              <DeviationPanel entry={entry} />
              <TimeApprovalEntryNotes entry={entry} />
            </div>

            <TimeApprovalEntryActions
              entry={entry}
              onEdit={onEdit}
              onOpenHistory={onOpenHistory}
              onSendBackForChanges={onSendBackForChanges}
              onVoid={onVoid}
            />
          </div>
        </div>
      )}
    </div>
  );
}
