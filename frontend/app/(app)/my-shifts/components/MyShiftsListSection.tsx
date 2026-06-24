import type {
  CinemaSettings,
  Shift,
  ShiftTrade,
  User,
} from "../helpers/myShiftsTypes";

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
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Vagter</h2>

      {myMonthShifts.map((shift) => {
        const canTrade = new Date(shift.startTime) > new Date();
        const openTrade = getOpenTradeForShift(shift.id);
        const isSent = Boolean(openTrade);

        return (
          <div
            key={shift.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
          >
            <div
              className="h-2 w-full"
              style={{ backgroundColor: shift.workType.color }}
            />

            <div className="space-y-4 p-5">
              <div>
                <h3 className="text-xl font-bold">
                  {new Date(shift.startTime).toLocaleDateString("da-DK", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </h3>

                <p className="mt-1 text-gray-600 dark:text-gray-400">
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

                <p className="font-medium">{shift.workType.name}</p>

                {shift.note && (
                  <p className="mt-2 rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-950">
                    Note: {shift.note}
                  </p>
                )}

                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {(
                    (new Date(shift.endTime).getTime() -
                      new Date(shift.startTime).getTime()) /
                    1000 /
                    60 /
                    60
                  ).toFixed(2)}{" "}
                  timer
                </p>
              </div>

              {openTrade && (
                <div className="rounded-xl border border-orange-300 bg-orange-100 p-3 text-sm dark:border-orange-900 dark:bg-orange-950/40">
                  {openTrade.type === "POOL" && (
                    <p>Denne vagt er sendt i vagtpuljen.</p>
                  )}

                  {openTrade.type === "DIRECT" && (
                    <p>
                      Denne vagt er sendt direkte til{" "}
                      <strong>
                        {openTrade.targetUser
                          ? `${openTrade.targetUser.firstName} ${openTrade.targetUser.lastName}`
                          : "en kollega"}
                      </strong>
                      .
                    </p>
                  )}
                </div>
              )}

              {canTrade && (
                <div className="flex flex-wrap items-center gap-3">
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
                    <button
                      disabled
                      title="Vagtpulje er slået fra i biografindstillinger"
                      className="cursor-not-allowed rounded-xl bg-gray-300 px-4 py-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    >
                      Vagtpulje deaktiveret
                    </button>
                  )}

                  <select
                    disabled={isSent || !cinemaSettings?.allowShiftTradeDirect}
                    defaultValue=""
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
            </div>
          </div>
        );
      })}

      {myMonthShifts.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Ingen vagter i denne måned.
        </div>
      )}
    </section>
  );
}
