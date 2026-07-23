import type {
  CinemaSettings,
  Shift,
  ShiftTrade,
  User,
} from "../../helpers/core/myShiftsTypes";

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

const primaryButtonClass =
  "rounded-xl bg-blue-700 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950";

const dangerButtonClass =
  "rounded-xl bg-red-700 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-red-800 active:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:bg-red-600 dark:hover:bg-red-500 dark:active:bg-red-400 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-950";

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
      <h2 className="text-xl font-bold text-gray-950 dark:text-gray-100">
        Vagter
      </h2>

      <div className="mt-4 space-y-4">
        {myMonthShifts.map((shift) => {
          const canTrade = new Date(shift.startTime) > new Date();
          const openTrade = getOpenTradeForShift(shift.id);
          const isSent = Boolean(openTrade);
          const directTradeDisabled =
            isSent || !cinemaSettings?.allowShiftTradeDirect;

          return (
            <article
              key={shift.id}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950/55 dark:hover:border-gray-700"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold text-gray-950 dark:text-gray-100">
                    {new Date(shift.startTime).toLocaleDateString("da-DK", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
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
                  <p className="mt-2 font-medium text-gray-900 dark:text-gray-200">
                    {shift.workType.name}
                  </p>
                  {shift.note && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Note: {shift.note}
                    </p>
                  )}
                </div>

                <div className="w-fit rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-800">
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
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
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
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {cinemaSettings?.allowShiftTradePool ? (
                    <button
                      type="button"
                      onClick={() => sendToPool(shift.id)}
                      disabled={isSent}
                      className={
                        isSent
                          ? "cursor-not-allowed rounded-xl border border-gray-300 bg-gray-200 px-4 py-2 font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
                          : primaryButtonClass
                      }
                    >
                      Send til fælles pulje
                    </button>
                  ) : (
                    <span className="rounded-xl border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                      Vagtpulje deaktiveret
                    </span>
                  )}

                  <select
                    aria-label={`Send vagten den ${new Date(
                      shift.startTime,
                    ).toLocaleDateString("da-DK")} direkte til en kollega`}
                    disabled={directTradeDisabled}
                    defaultValue=""
                    onChange={(event) => {
                      const targetUserId = Number(event.target.value);
                      if (targetUserId) {
                        sendDirect(shift.id, targetUserId);
                        event.target.value = "";
                      }
                    }}
                    className={
                      directTradeDisabled
                        ? "cursor-not-allowed rounded-xl border border-gray-300 bg-gray-200 p-2 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
                        : "rounded-xl border border-gray-300 bg-white p-2 text-gray-900 shadow-sm transition hover:border-gray-400 focus-visible:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-gray-600 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/30"
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

                  {openTrade &&
                    openTrade.offeredByUserId === currentUserId && (
                      <button
                        type="button"
                        onClick={() => cancelTrade(openTrade.id)}
                        className={dangerButtonClass}
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
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-400">
            Ingen vagter i denne måned.
          </div>
        )}
      </div>
    </section>
  );
}
