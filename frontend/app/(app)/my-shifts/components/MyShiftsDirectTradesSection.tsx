import type { ShiftTrade } from "../helpers/myShiftsTypes";

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
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Direkte tilbudte vagter</h2>

      {directTradesForMe.map((trade) => (
        <div
          key={trade.id}
          className="rounded-2xl border border-blue-300 bg-blue-50 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950/40"
        >
          <p className="font-bold">Du har fået tilbudt en vagt direkte</p>

          <p className="mt-1 text-gray-700 dark:text-gray-300">
            Fra:{" "}
            {trade.offeredByUser
              ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
              : "Ukendt"}
          </p>

          {trade.shift && (
            <div className="mt-3 rounded-xl border border-blue-200 bg-white/70 p-3 text-sm dark:border-blue-900 dark:bg-gray-950/50">
              <p>
                {new Date(trade.shift.startTime).toLocaleDateString("da-DK", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </p>

              <p>
                {new Date(trade.shift.startTime).toLocaleTimeString("da-DK", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                -{" "}
                {new Date(trade.shift.endTime).toLocaleTimeString("da-DK", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              <p>{trade.shift.workType?.name}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
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
        </div>
      ))}
    </section>
  );
}
