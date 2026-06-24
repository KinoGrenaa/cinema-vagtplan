import { formatShiftDate, formatShiftTime } from "../helpers/shiftTradeHelpers";
import type { ShiftTrade } from "../helpers/shiftTradeTypes";

type ShiftTradesHistorySectionProps = {
  trades: ShiftTrade[];
};

export default function ShiftTradesHistorySection({
  trades,
}: ShiftTradesHistorySectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-2xl font-bold">Historik ({trades.length})</h2>

      <div className="space-y-4">
        {trades.map((trade) => (
          <div
            key={trade.id}
            className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-700 px-2 py-1 text-xs font-semibold text-white">
                {trade.type === "POOL" ? "Vagtpulje" : "Direkte"}
              </span>

              <span className="rounded-full bg-gray-500 px-2 py-1 text-xs font-semibold text-white">
                {trade.status}
              </span>
            </div>

            <div className="font-bold">{trade.shift.workType.name}</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formatShiftDate(trade.shift.startTime)} ·{" "}
              {formatShiftTime(trade.shift.startTime, trade.shift.endTime)}
            </div>
          </div>
        ))}

        {trades.length === 0 && (
          <div className="text-gray-500 dark:text-gray-400">
            Ingen historik endnu.
          </div>
        )}
      </div>
    </section>
  );
}
