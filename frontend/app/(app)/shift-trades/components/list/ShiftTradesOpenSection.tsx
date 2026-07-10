import type { ShiftTrade } from "../../helpers/shiftTradeTypes";

import TradeCard from "./TradeCard";

type ShiftTradesOpenSectionProps = {
  title: string;
  trades: ShiftTrade[];
  emptyText: string;
  onAccept: (trade: ShiftTrade) => void;
  onReject?: (trade: ShiftTrade) => void;
  hasShiftConflict: (trade: ShiftTrade) => boolean;
};

export default function ShiftTradesOpenSection({
  title,
  trades,
  emptyText,
  onAccept,
  onReject,
  hasShiftConflict,
}: ShiftTradesOpenSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-2xl font-bold">
        {title} ({trades.length})
      </h2>
      <div className="space-y-4">
        {trades.map((trade) => (
          <TradeCard
            key={trade.id}
            trade={trade}
            onAccept={() => onAccept(trade)}
            onReject={onReject ? () => onReject(trade) : undefined}
            actionLabel="Accepter vagt"
            acceptDisabled={hasShiftConflict(trade)}
            acceptTooltip={
              hasShiftConflict(trade)
                ? "Du har allerede en vagt i dette tidsrum"
                : undefined
            }
          />
        ))}
        {trades.length === 0 && (
          <div className="text-gray-500 dark:text-gray-400">{emptyText}</div>
        )}
      </div>
    </section>
  );
}
