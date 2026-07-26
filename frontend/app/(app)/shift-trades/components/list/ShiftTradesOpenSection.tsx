import type {
  ShiftTrade,
} from "../../helpers/core/shiftTradeTypes";
import TradeCard from "./TradeCard";

type ShiftTradesOpenSectionProps = {
  title: string;
  trades: ShiftTrade[];
  totalCount: number;
  hasMore: boolean;
  loadingMore: boolean;
  emptyText: string;
  onAccept:
    (trade: ShiftTrade) => void;
  onReject?:
    (trade: ShiftTrade) => void;
  onLoadMore:
    () => void;
  hasShiftConflict:
    (trade: ShiftTrade) => boolean;
  focusedTradeId:
    number | null;
};

export default function ShiftTradesOpenSection({
  title,
  trades,
  totalCount,
  hasMore,
  loadingMore,
  emptyText,
  onAccept,
  onReject,
  onLoadMore,
  hasShiftConflict,
  focusedTradeId,
}: ShiftTradesOpenSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 md:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-950 dark:text-white">
          {title}
        </h2>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {totalCount}
        </span>
      </div>

      {trades.length > 0 ? (
        <>
          <div className="space-y-4">
            {trades.map((trade) => {
              const shiftConflict =
                hasShiftConflict(
                  trade,
                );
              const hasApprovedLeaveConflict =
                Boolean(
                  trade
                    .approvedLeaveConflict,
                );

              return (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  onAccept={() =>
                    onAccept(trade)
                  }
                  onReject={
                    onReject
                      ? () =>
                          onReject(
                            trade,
                          )
                      : undefined
                  }
                  actionLabel={
                    hasApprovedLeaveConflict
                      ? "Accepter trods fravær"
                      : "Accepter vagt"
                  }
                  acceptDisabled={
                    shiftConflict
                  }
                  acceptTooltip={
                    shiftConflict
                      ? "Du har allerede en vagt i dette tidsrum"
                      : hasApprovedLeaveConflict
                        ? "Dit godkendte fravær ændres ikke automatisk"
                        : undefined
                  }
                  isFocused={
                    trade.id ===
                    focusedTradeId
                  }
                />
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Viser {trades.length} af{" "}
              {totalCount}
            </p>
            {hasMore ? (
              <button
                type="button"
                onClick={
                  onLoadMore
                }
                disabled={
                  loadingMore
                }
                className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 active:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950/45 dark:text-blue-200 dark:hover:bg-blue-950/70 dark:active:bg-blue-900"
              >
                {loadingMore
                  ? "Henter vagtbytter..."
                  : "Hent flere vagtbytter"}
              </button>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Alle åbne vagtbytter er vist
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-400">
          {emptyText}
        </p>
      )}
    </section>
  );
}
