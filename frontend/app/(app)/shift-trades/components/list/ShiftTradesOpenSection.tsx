import type {
  ShiftTrade,
} from "../../helpers/core/shiftTradeTypes";
import TradeCard from "./TradeCard";

type ShiftTradesOpenSectionProps = {
  title: string;
  trades: ShiftTrade[];
  emptyText: string;
  onAccept:
    (trade: ShiftTrade) => void;
  onReject?:
    (trade: ShiftTrade) => void;
  hasShiftConflict:
    (trade: ShiftTrade) => boolean;
  focusedTradeId:
    number | null;
};

export default function ShiftTradesOpenSection({
  title,
  trades,
  emptyText,
  onAccept,
  onReject,
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
          {trades.length}
        </span>
      </div>

      {trades.length > 0 ? (
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
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-400">
          {emptyText}
        </p>
      )}
    </section>
  );
}
