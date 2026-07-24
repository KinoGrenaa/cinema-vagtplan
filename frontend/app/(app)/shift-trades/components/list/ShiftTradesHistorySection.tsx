import {
  formatShiftDate,
  formatShiftTime,
} from "../../helpers/core/shiftTradeHelpers";
import type {
  ShiftTrade,
} from "../../helpers/core/shiftTradeTypes";

type ShiftTradesHistorySectionProps = {
  trades: ShiftTrade[];
  focusedTradeId:
    number | null;
};

function getStatusLabel(
  status: string,
) {
  switch (status) {
    case "ACCEPTED":
      return "Accepteret";
    case "REJECTED":
      return "Afvist";
    case "CANCELLED":
      return "Annulleret";
    case "EXPIRED":
      return "Udløbet";
    default:
      return status;
  }
}

function getStatusClasses(
  status: string,
) {
  switch (status) {
    case "ACCEPTED":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
    case "CANCELLED":
    case "EXPIRED":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
    default:
      return "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

export default function ShiftTradesHistorySection({
  trades,
  focusedTradeId,
}: ShiftTradesHistorySectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">
            Historik
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Tidligere behandlede og
            afsluttede vagtbytter.
          </p>
        </div>

        <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {trades.length}
        </span>
      </div>

      {trades.length > 0 ? (
        <div className="mt-5 space-y-3">
          {trades.map((trade) => {
            const isFocused =
              trade.id ===
              focusedTradeId;

            return (
              <article
                key={trade.id}
                id={`shift-trade-${trade.id}`}
                tabIndex={-1}
                aria-label={
                  isFocused
                    ? "Fremhævet vagtbytte"
                    : undefined
                }
                className={`rounded-xl border bg-gray-50 p-4 outline-none transition dark:bg-gray-950/60 ${
                  isFocused
                    ? "border-blue-500 ring-4 ring-blue-500/60 ring-offset-4 ring-offset-white dark:border-blue-400 dark:ring-blue-400/60 dark:ring-offset-gray-900"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                        {trade.type ===
                        "POOL"
                          ? "Vagtpulje"
                          : "Direkte tilbud"}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          trade.status,
                        )}`}
                      >
                        {getStatusLabel(
                          trade.status,
                        )}
                      </span>

                      {isFocused && (
                        <span className="rounded-full bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white dark:bg-blue-500">
                          Fra notifikation
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 font-bold text-gray-950 dark:text-white">
                      {
                        trade.shift
                          .workType.name
                      }
                    </h3>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatShiftDate(
                      trade.shift
                        .startTime,
                    )}{" "}
                    ·{" "}
                    {formatShiftTime(
                      trade.shift
                        .startTime,
                      trade.shift
                        .endTime,
                    )}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-400">
          Ingen historik endnu.
        </p>
      )}
    </section>
  );
}
