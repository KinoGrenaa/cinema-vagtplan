import type { ShiftTrade } from "../../helpers/myShiftsTypes";

type MyShiftsDirectTradesSectionProps = {
  directTradesForMe: ShiftTrade[];
  acceptTrade: (tradeId: number) => void;
  rejectTrade: (tradeId: number) => void;
};

export default function MyShiftsDirectTradesSection({
  directTradesForMe,
  acceptTrade,
  rejectTrade,
}: MyShiftsDirectTradesSectionProps) {
  if (directTradesForMe.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm dark:border-blue-900 dark:bg-blue-950/40">
      <h2 className="text-xl font-bold">Direkte tilbudte vagter</h2>

      <div className="mt-4 space-y-4">
        {directTradesForMe.map((trade) => (
          <article
            key={trade.id}
            className="rounded-xl border border-blue-200 bg-white p-4 dark:border-blue-800 dark:bg-gray-900"
          >
            <div className="font-semibold">Du har fået tilbudt en vagt direkte</div>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Fra:{" "}
              {trade.offeredByUser
                ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
                : "Ukendt"}
            </p>

            {trade.shift && (
              <div className="mt-3 text-sm">
                <div>
                  {new Date(trade.shift.startTime).toLocaleDateString("da-DK", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </div>
                <div>
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

                <div>{trade.shift.workType?.name}</div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => acceptTrade(trade.id)}
                className="rounded-xl bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
              >
                Accepter vagt
              </button>

              <button
                onClick={() => rejectTrade(trade.id)}
                className="rounded-xl bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
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
