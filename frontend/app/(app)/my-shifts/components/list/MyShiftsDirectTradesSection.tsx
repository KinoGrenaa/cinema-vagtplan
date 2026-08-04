import type { ShiftTrade } from "../../helpers/core/myShiftsTypes";

type MyShiftsDirectTradesSectionProps = {
  directTradesForMe: ShiftTrade[];
  acceptTrade: (tradeId: number) => void;
  rejectTrade: (tradeId: number) => void;
};

const actionButtonBase =
  "rounded-xl px-4 py-2 font-medium text-white shadow-sm transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950";

export default function MyShiftsDirectTradesSection({
  directTradesForMe,
  acceptTrade,
  rejectTrade,
}: MyShiftsDirectTradesSectionProps) {
  if (directTradesForMe.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm dark:border-blue-900/70 dark:bg-blue-950/25">
      <h2 className="text-xl font-bold text-blue-950 dark:text-blue-100">
        Direkte tilbudte vagter
      </h2>

      <div className="mt-4 space-y-4">
        {directTradesForMe.map((trade) => (
          <article
            key={trade.id}
            className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm transition-colors dark:border-blue-900/70 dark:bg-gray-900"
          >
            <div className="font-semibold text-gray-950 dark:text-gray-100">
              Du har fået tilbudt en vagt direkte
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Fra:{" "}
              {trade.offeredByUser
                ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
                : "Ukendt"}
            </p>

            {trade.shift && (
              <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-800 dark:bg-gray-950/70 dark:text-gray-200">
                <div className="font-medium">
                  {new Date(trade.shift.startTime).toLocaleDateString("da-DK", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </div>
                <div className="mt-1 text-gray-600 dark:text-gray-400">
                  {new Date(trade.shift.startTime).toLocaleTimeString("da-DK", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(trade.shift.endTime).toLocaleTimeString("da-DK", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="mt-1">{trade.shift.jobFunction?.name}</div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => acceptTrade(trade.id)}
                className={`${actionButtonBase} bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:active:bg-emerald-400`}
              >
                Accepter vagt
              </button>
              <button
                type="button"
                onClick={() => rejectTrade(trade.id)}
                className={`${actionButtonBase} bg-red-600 hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 dark:bg-red-600 dark:hover:bg-red-500 dark:active:bg-red-400`}
              >
                Afvis vagt
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
