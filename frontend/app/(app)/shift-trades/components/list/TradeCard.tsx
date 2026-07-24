import {
  formatShiftDate,
  formatShiftTime,
} from "../../helpers/core/shiftTradeHelpers";
import type {
  ShiftTrade,
} from "../../helpers/core/shiftTradeTypes";

type TradeCardProps = {
  trade: ShiftTrade;
  actionLabel: string;
  onAccept: () => void;
  onReject?: () => void;
  acceptDisabled?: boolean;
  acceptTooltip?: string;
  isFocused?: boolean;
};

export default function TradeCard({
  trade,
  actionLabel,
  onAccept,
  onReject,
  acceptDisabled,
  acceptTooltip,
  isFocused = false,
}: TradeCardProps) {
  const approvedLeaveConflict =
    trade.approvedLeaveConflict ??
    null;

  return (
    <article
      id={`shift-trade-${trade.id}`}
      tabIndex={-1}
      aria-label={
        isFocused
          ? "Fremhævet vagtbytte"
          : undefined
      }
      className={`rounded-2xl border bg-gray-50 p-4 shadow-sm outline-none transition dark:bg-gray-950/70 md:p-5 ${
        isFocused
          ? "border-blue-500 ring-4 ring-blue-500/60 ring-offset-4 ring-offset-gray-100 dark:border-blue-400 dark:ring-blue-400/60 dark:ring-offset-gray-950"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
              {trade.type ===
              "POOL"
                ? "Vagtpulje"
                : "Direkte tilbud"}
            </span>

            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              Åben
            </span>

            {isFocused && (
              <span className="rounded-full bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white dark:bg-blue-500">
                Fra notifikation
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-gray-950 dark:text-white md:text-xl">
            {
              trade.shift
                .workType.name
            }
          </h3>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2">
        <div>
          <dt className="font-medium text-gray-500 dark:text-gray-400">
            Dato
          </dt>
          <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
            {formatShiftDate(
              trade.shift
                .startTime,
            )}
          </dd>
        </div>

        <div>
          <dt className="font-medium text-gray-500 dark:text-gray-400">
            Tid
          </dt>
          <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
            {formatShiftTime(
              trade.shift
                .startTime,
              trade.shift.endTime,
            )}
          </dd>
        </div>

        <div>
          <dt className="font-medium text-gray-500 dark:text-gray-400">
            Udbydes af
          </dt>
          <dd className="mt-1 text-gray-900 dark:text-gray-100">
            {
              trade.offeredByUser
                .firstName
            }{" "}
            {
              trade.offeredByUser
                .lastName
            }
          </dd>
        </div>

        {trade.targetUser && (
          <div>
            <dt className="font-medium text-gray-500 dark:text-gray-400">
              Tilbudt til
            </dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">
              {
                trade.targetUser
                  .firstName
              }{" "}
              {
                trade.targetUser
                  .lastName
              }
            </dd>
          </div>
        )}
      </dl>

      {approvedLeaveConflict && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100">
          <div className="font-bold">
            Godkendt fravær
            overlapper vagten
          </div>
          <p className="mt-1 leading-5">
            Du kan stadig acceptere
            vagten, men dit godkendte
            fravær ændres ikke
            automatisk.
          </p>
          <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
            Fravær:{" "}
            {formatShiftDate(
              approvedLeaveConflict
                .startDate,
            )}{" "}
            ·{" "}
            {formatShiftTime(
              approvedLeaveConflict
                .startDate,
              approvedLeaveConflict
                .endDate,
            )}
          </p>
        </div>
      )}

      {trade.message && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            Besked:
          </span>{" "}
          {trade.message}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onAccept}
          disabled={
            acceptDisabled
          }
          title={acceptTooltip}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:active:bg-emerald-300 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-gray-950 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
        >
          {actionLabel}
        </button>

        {onReject && (
          <button
            type="button"
            onClick={onReject}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:border-red-400 hover:bg-red-50 active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:border-red-900 dark:bg-gray-950 dark:text-red-300 dark:hover:border-red-800 dark:hover:bg-red-950/40 dark:active:bg-red-950/70 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-950"
          >
            Afvis vagt
          </button>
        )}
      </div>

      {acceptDisabled &&
        acceptTooltip && (
          <p className="mt-3 text-xs font-medium text-gray-600 dark:text-gray-400">
            {acceptTooltip}
          </p>
        )}
    </article>
  );
}
