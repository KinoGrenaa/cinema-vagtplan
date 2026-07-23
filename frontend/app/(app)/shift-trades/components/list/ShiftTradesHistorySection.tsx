import {
  formatShiftDate,
  formatShiftTime,
} from "../../helpers/core/shiftTradeHelpers";
import type { ShiftTrade } from "../../helpers/core/shiftTradeTypes";

type ShiftTradesHistorySectionProps = {
  trades: ShiftTrade[];
};

function getStatusLabel(status: string) {
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

function getStatusClasses(status: string) {
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
}: ShiftTradesHistorySectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-950 dark:text-white md:text-2xl">
            Historik
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Tidligere behandlede og afsluttede vagtbytter.
          </p>
        </div>
        <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-gray-100 px-2.5 py-1 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {trades.length}
        </span>
      </div>

      {trades.length > 0 ? (
        <div className="space-y-3">
          {trades.map((trade) => (
            <article
              key={trade.id}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 transition-colors dark:border-gray-800 dark:bg-gray-950/70"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                      {trade.type === "POOL" ? "Vagtpulje" : "Direkte tilbud"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                        trade.status,
                      )}`}
                    >
                      {getStatusLabel(trade.status)}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-950 dark:text-white">
                    {trade.shift.workType.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {formatShiftDate(trade.shift.startTime)} ·{" "}
                    {formatShiftTime(
                      trade.shift.startTime,
                      trade.shift.endTime,
                    )}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-400">
          Ingen historik endnu.
        </div>
      )}
    </section>
  );
}
