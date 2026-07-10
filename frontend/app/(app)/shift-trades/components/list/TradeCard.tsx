import {
  formatShiftDate,
  formatShiftTime,
} from "../../helpers/core/shiftTradeHelpers";
import type { ShiftTrade } from "../../helpers/core/shiftTradeTypes";

type TradeCardProps = {
  trade: ShiftTrade;
  actionLabel: string;
  onAccept: () => void;
  onReject?: () => void;
  acceptDisabled?: boolean;
  acceptTooltip?: string;
};

export default function TradeCard({
  trade,
  actionLabel,
  onAccept,
  onReject,
  acceptDisabled,
  acceptTooltip,
}: TradeCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
          {trade.type === "POOL" ? "Vagtpulje" : "Direkte"}
        </span>
        <span className="rounded-full bg-green-600 px-2 py-1 text-xs font-semibold text-white">
          Åben
        </span>
      </div>
      <h3 className="text-xl font-bold">{trade.shift.workType.name}</h3>
      <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
        <div>{formatShiftDate(trade.shift.startTime)}</div>
        <div>{formatShiftTime(trade.shift.startTime, trade.shift.endTime)}</div>
        <div>
          Udbydes af: {trade.offeredByUser.firstName}{" "}
          {trade.offeredByUser.lastName}
        </div>
        {trade.targetUser && (
          <div>
            Tilbudt til: {trade.targetUser.firstName}{" "}
            {trade.targetUser.lastName}
          </div>
        )}
      </div>
      {trade.message && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          Besked: {trade.message}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onAccept}
          disabled={acceptDisabled}
          title={acceptTooltip}
          className={`rounded-xl px-4 py-2 font-semibold transition ${
            acceptDisabled
              ? "cursor-not-allowed bg-gray-300 text-gray-500"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {actionLabel}
        </button>
        {onReject && (
          <button
            type="button"
            onClick={onReject}
            className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
          >
            Afvis vagt
          </button>
        )}
      </div>
    </div>
  );
}
