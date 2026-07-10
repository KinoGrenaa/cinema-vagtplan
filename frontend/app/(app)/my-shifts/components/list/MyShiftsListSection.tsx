import type {
  CinemaSettings,
  Shift,
  ShiftTrade,
  User,
} from "../../helpers/myShiftsTypes";

type MyShiftsListSectionProps = {
  myMonthShifts: Shift[];
  users: User[];
  currentUserId?: number;
  cinemaSettings: CinemaSettings | null;
  getOpenTradeForShift: (shiftId: number) => ShiftTrade | undefined;
  sendToPool: (shiftId: number) => void;
  sendDirect: (shiftId: number, targetUserId: number) => void;
  cancelTrade: (tradeId: number) => void;
};

export default function MyShiftsListSection({
  myMonthShifts,
  users,
  currentUserId,
  cinemaSettings,
  getOpenTradeForShift,
  sendToPool,
  sendDirect,
  cancelTrade,
}: MyShiftsListSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">Vagter</h2>

      <div className="mt-4 space-y-4">
        {myMonthShifts.map((shift) => {
          const canTrade = new Date(shift.startTime) > new Date();
          const openTrade = getOpenTradeForShift(shift.id);
          const isSent = Boolean(openTrade);

          return (
            <article
              key={shift.id}
              className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold">
                    {new Date(shift.startTime).toLocaleDateString("da-DK", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(shift.startTime).toLocaleTimeString("da-DK", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {new Date(shift.endTime).toLocaleTimeString("da-DK", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  <p className="mt-2 font-medium">{shift.workType.name}</p>

                  {shift.note && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Note: {shift.note}
                    </p>
                  )}
                </div>

                <div className="text-sm font-semibold">
                  {(
                    (new Date(shift.endTime).getTime() -
                      new Date(shift.startTime).getTime()) /
                    1000 /
                    60 /
                    60
                  ).toFixed(2)}{" "}
                  timer
                </div>
              </div>

              {openTrade && (
                <div className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-100">
                  {openTrade.type === "POOL" && (
                    <p>Denne vagt er sendt i vagtpuljen.</p>
                  )}

                  {openTrade.type === "DIRECT" && (
                    <p>
                      Denne vagt er sendt direkte til{" "}
                      {openTrade.targetUser
                        ? `${openTrade.targetUser.firstName} ${openTrade.targetUser.lastName}`
                        : "en kollega"}
                      .
                    </p>
                  )}
                </div>
              )}

              {canTrade && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {cinemaSettings?.allowShiftTradePool ? (
                    <button
                      onClick={() => sendToPool(shift.id)}
                      disabled={isSent}
                      className={
                        isSent
                          ? "cursor-not-allowed rounded-xl bg-gray-300 px-4 py-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                          : "rounded-xl bg-black px-4 py-2 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                      }
                    >
                      Send til fælles pulje
                    </button>
                  ) : (
                    <span className="rounded-xl bg-gray-200 px-4 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      Vagtpulje deaktiveret
                    </span>
                  )}

                  <select
                    disabled={isSent || !cinemaSettings?.allowShiftTradeDirect}
                    onChange={(event) => {
                      const targetUserId = Number(event.target.value);
                      if (targetUserId) {
                        sendDirect(shift.id, targetUserId);
                        event.target.value = "";
                      }
                    }}
                    className={
                      isSent || !cinemaSettings?.allowShiftTradeDirect
                        ? "cursor-not-allowed rounded-xl border border-gray-300 bg-gray-200 p-2 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        : "rounded-xl border border-gray-300 bg-white p-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    }
                  >
                    <option value="">
                      {cinemaSettings?.allowShiftTradeDirect
                        ? "Send direkte til kollega"
                        : "Direkte vagtbytte deaktiveret"}
                    </option>

                    {users
                      .filter((user) => user.id !== currentUserId)
                      .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </option>
                      ))}
                  </select>

                  {openTrade && openTrade.offeredByUserId === currentUserId && (
                    <button
                      onClick={() => cancelTrade(openTrade.id)}
                      className="rounded-xl bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
                    >
                      Annuller udsendelse
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}

        {myMonthShifts.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">
            Ingen vagter i denne måned.
          </p>
        )}
      </div>
    </section>
  );
}
