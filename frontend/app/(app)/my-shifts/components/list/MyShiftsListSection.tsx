"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import EmployeePickerModal from "@/app/components/employees/EmployeePickerModal";
import {
  dateToLocalDateString,
  formatTimeDK,
} from "@/app/utils/dateTime";
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
  cinemaSettings:
    CinemaSettings | null;
  focusedShiftId:
    number | null;
  getOpenTradeForShift:
    (
      shiftId: number,
    ) =>
      | ShiftTrade
      | undefined;
  sendToPool:
    (shiftId: number) => void;
  sendDirect:
    (
      shiftId: number,
      targetUserId: number,
    ) => void;
  cancelTrade:
    (tradeId: number) => void;
};

type ShiftDayGroup = {
  date: string;
  label: string;
  shifts: Shift[];
};

const primaryButtonClass =
  "rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 active:bg-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-blue-800 dark:bg-blue-950/35 dark:text-blue-200 dark:hover:bg-blue-950/60 dark:active:bg-blue-900/70 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950";
const dangerButtonClass =
  "rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 transition hover:bg-red-100 active:bg-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:border-red-900 dark:bg-red-950/35 dark:text-red-200 dark:hover:bg-red-950/60 dark:active:bg-red-900/70 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-950";

function formatShiftDayLabel(
  value: string,
) {
  const label =
    new Intl.DateTimeFormat(
      "da-DK",
      {
        timeZone:
          "Europe/Copenhagen",
        weekday: "long",
        day: "numeric",
        month: "long",
      },
    ).format(
      new Date(value),
    );

  return (
    label.charAt(0)
      .toLocaleUpperCase(
        "da-DK",
      ) +
    label.slice(1)
  );
}

function formatShiftEndDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "da-DK",
    {
      timeZone:
        "Europe/Copenhagen",
      day: "numeric",
      month: "long",
    },
  ).format(new Date(value));
}

function formatShiftDuration(
  shift: Shift,
) {
  const durationMinutes =
    Math.max(
      0,
      Math.round(
        (
          new Date(
            shift.endTime,
          ).getTime() -
          new Date(
            shift.startTime,
          ).getTime()
        ) /
          60000,
      ),
    );
  const hours =
    Math.floor(
      durationMinutes / 60,
    );
  const minutes =
    durationMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} t`;
  }

  return `${hours} t ${minutes} min`;
}

function formatShiftTimeSummary(
  shift: Shift,
) {
  const startsOn =
    dateToLocalDateString(
      new Date(
        shift.startTime,
      ),
    );
  const endsOn =
    dateToLocalDateString(
      new Date(
        shift.endTime,
      ),
    );
  const endDate =
    startsOn === endsOn
      ? ""
      : ` (${formatShiftEndDate(
          shift.endTime,
        )})`;

  return `${formatTimeDK(
    shift.startTime,
  )} → ${formatTimeDK(
    shift.endTime,
  )}${endDate} · ${formatShiftDuration(
    shift,
  )}`;
}

function groupShiftsByDay(
  shifts: Shift[],
): ShiftDayGroup[] {
  const groups =
    new Map<
      string,
      ShiftDayGroup
    >();

  shifts.forEach((shift) => {
    const date =
      dateToLocalDateString(
        new Date(
          shift.startTime,
        ),
      );
    const existing =
      groups.get(date);

    if (existing) {
      existing.shifts.push(
        shift,
      );
      return;
    }

    groups.set(date, {
      date,
      label:
        formatShiftDayLabel(
          shift.startTime,
        ),
      shifts: [shift],
    });
  });

  return Array.from(
    groups.values(),
  );
}

export default function MyShiftsListSection({
  myMonthShifts,
  users,
  currentUserId,
  cinemaSettings,
  focusedShiftId,
  getOpenTradeForShift,
  sendToPool,
  sendDirect,
  cancelTrade,
}: MyShiftsListSectionProps) {
  const [
    showCompletedShifts,
    setShowCompletedShifts,
  ] = useState(false);
  const [
    now,
    setNow,
  ] = useState(
    () => Date.now(),
  );
  const [
    directTradeShiftId,
    setDirectTradeShiftId,
  ] = useState<
    number | null
  >(null);

  useEffect(() => {
    const intervalId =
      window.setInterval(
        () => {
          setNow(
            Date.now(),
          );
        },
        60_000,
      );

    return () =>
      window.clearInterval(
        intervalId,
      );
  }, []);

  const completedShiftCount =
    useMemo(
      () =>
        myMonthShifts.filter(
          (shift) =>
            new Date(
              shift.endTime,
            ).getTime() <= now,
        ).length,
      [
        myMonthShifts,
        now,
      ],
    );

  const visibleShifts =
    useMemo(
      () =>
        [
          ...myMonthShifts,
        ]
          .filter((shift) => {
            if (
              showCompletedShifts
            ) {
              return true;
            }

            if (
              shift.id ===
              focusedShiftId
            ) {
              return true;
            }

            const endTime =
              new Date(
                shift.endTime,
              ).getTime();

            return (
              Number.isNaN(
                endTime,
              ) ||
              endTime > now
            );
          })
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                left.startTime,
              ).getTime() -
              new Date(
                right.startTime,
              ).getTime(),
          ),
      [
        focusedShiftId,
        myMonthShifts,
        now,
        showCompletedShifts,
      ],
    );

  const shiftDayGroups =
    useMemo(
      () =>
        groupShiftsByDay(
          visibleShifts,
        ),
      [visibleShifts],
    );

  const directTradeShift =
    visibleShifts.find(
      (shift) =>
        shift.id ===
        directTradeShiftId,
    ) ?? null;

  const directTradeUsers =
    directTradeShift
      ? users.filter(
          (user) =>
            user.id !==
              currentUserId &&
            user.jobFunctionIds?.includes(
              directTradeShift.jobFunctionId,
            ),
        )
      : [];

  useEffect(() => {
    if (
      !focusedShiftId ||
      !visibleShifts.some(
        (shift) =>
          shift.id ===
          focusedShiftId,
      )
    ) {
      return;
    }

    const timeoutId =
      window.setTimeout(() => {
        const element =
          document.getElementById(
            `my-shift-${focusedShiftId}`,
          );

        if (!element) {
          return;
        }

        element.focus({
          preventScroll: true,
        });
        element.scrollIntoView({
          behavior: window
            .matchMedia(
              "(prefers-reduced-motion: reduce)",
            )
            .matches
            ? "auto"
            : "smooth",
          block: "center",
        });
      }, 100);

    return () =>
      window.clearTimeout(
        timeoutId,
      );
  }, [
    focusedShiftId,
    visibleShifts,
  ]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-gray-950 dark:text-gray-100">
          {showCompletedShifts
            ? "Vagter"
            : "Kommende vagter"}
        </h2>

        {completedShiftCount >
          0 && (
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200">
            <input
              type="checkbox"
              checked={
                showCompletedShifts
              }
              onChange={(
                event,
              ) =>
                setShowCompletedShifts(
                  event.target
                    .checked,
                )
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900"
            />
            Vis afsluttede vagter
          </label>
        )}
      </div>

      <div className="mt-4 space-y-5">
        {shiftDayGroups.map(
          (group) => (
            <section
              key={group.date}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-950/35"
            >
              <div className="border-b border-gray-200 bg-gray-100/80 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/80">
                <h3 className="text-base font-bold text-gray-950 dark:text-gray-100">
                  {group.label}
                </h3>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {group.shifts.map(
                  (shift) => {
                    const canTrade =
                      new Date(
                        shift.startTime,
                      ).getTime() >
                      now;
                    const openTrade =
                      getOpenTradeForShift(
                        shift.id,
                      );
                    const isSent =
                      Boolean(
                        openTrade,
                      );
                    const qualifiedDirectUsers =
                      users.filter(
                        (user) =>
                          user.id !==
                            currentUserId &&
                          user.jobFunctionIds?.includes(
                            shift.jobFunctionId,
                          ),
                      );
                    const directTradeDisabled =
                      isSent ||
                      !cinemaSettings
                        ?.allowShiftTradeDirect ||
                      qualifiedDirectUsers.length ===
                        0;
                    const isFocused =
                      shift.id ===
                      focusedShiftId;

                    return (
                      <article
                        key={
                          shift.id
                        }
                        id={`my-shift-${shift.id}`}
                        tabIndex={
                          -1
                        }
                        aria-label={
                          isFocused
                            ? "Fremhævet vagt"
                            : undefined
                        }
                        className={`px-4 py-3 outline-none transition-colors ${
                          isFocused
                            ? "bg-blue-50 ring-2 ring-inset ring-blue-500 dark:bg-blue-950/25 dark:ring-blue-400"
                            : "bg-white/70 hover:bg-white dark:bg-gray-950/25 dark:hover:bg-gray-900/70"
                        }`}
                      >
                        {isFocused && (
                          <span className="mb-2 inline-flex rounded-full bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white dark:bg-blue-500">
                            Fra push-notifikation
                          </span>
                        )}

                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <span
                              aria-hidden="true"
                              className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-blue-500 dark:bg-blue-400"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-gray-950 dark:text-gray-100">
                                {
                                  shift
                                    .jobFunction
                                    .name
                                }
                              </p>
                              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-semibold">
                                  Planlagt:
                                </span>{" "}
                                {formatShiftTimeSummary(
                                  shift,
                                )}
                              </p>
                              {shift.note && (
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    Note:
                                  </span>{" "}
                                  {
                                    shift.note
                                  }
                                </p>
                              )}
                            </div>
                          </div>

                          {canTrade && (
                            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                              {cinemaSettings
                                ?.allowShiftTradePool ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    sendToPool(
                                      shift.id,
                                    )
                                  }
                                  disabled={
                                    isSent
                                  }
                                  className={
                                    isSent
                                      ? "cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
                                      : primaryButtonClass
                                  }
                                >
                                  Send til fælles pulje
                                </button>
                              ) : (
                                <span className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                                  Vagtpulje deaktiveret
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setDirectTradeShiftId(
                                    shift.id,
                                  )
                                }
                                disabled={
                                  directTradeDisabled
                                }
                                className={
                                  directTradeDisabled
                                    ? "cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
                                    : "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-blue-800 dark:hover:bg-blue-950/30 dark:focus-visible:ring-blue-400"
                                }
                              >
                                {!cinemaSettings
                                  ?.allowShiftTradeDirect
                                  ? "Direkte vagtbytte deaktiveret"
                                  : qualifiedDirectUsers.length ===
                                      0
                                    ? "Ingen kvalificerede kolleger"
                                    : "Send direkte til kollega"}
                              </button>

                              {openTrade &&
                                openTrade.offeredByUserId ===
                                  currentUserId && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      cancelTrade(
                                        openTrade.id,
                                      )
                                    }
                                    className={
                                      dangerButtonClass
                                    }
                                  >
                                    Annuller udsendelse
                                  </button>
                                )}
                            </div>
                          )}
                        </div>

                        {openTrade && (
                          <div className="mt-3 ml-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
                            {openTrade.type ===
                              "POOL" && (
                              <p>
                                Denne
                                vagt er
                                sendt i
                                vagtpuljen.
                              </p>
                            )}
                            {openTrade.type ===
                              "DIRECT" && (
                              <p>
                                Denne
                                vagt er
                                sendt
                                direkte
                                til{" "}
                                {openTrade.targetUser
                                  ? `${openTrade.targetUser.firstName} ${openTrade.targetUser.lastName}`
                                  : "en kollega"}
                                .
                              </p>
                            )}
                          </div>
                        )}

                      </article>
                    );
                  },
                )}
              </div>
            </section>
          ),
        )}

        {visibleShifts.length ===
          0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-400">
            {myMonthShifts.length ===
            0
              ? "Ingen vagter i denne måned."
              : "Ingen kommende vagter i denne måned. Markér “Vis afsluttede vagter” for at se tidligere vagter."}
          </div>
        )}
      </div>

      <EmployeePickerModal
        open={Boolean(
          directTradeShift,
        )}
        title="Send vagt direkte til kollega"
        description={
          directTradeShift
            ? `${directTradeShift.jobFunction.name} · ${formatShiftDayLabel(
                directTradeShift.startTime,
              )} · ${formatTimeDK(
                directTradeShift.startTime,
              )}–${formatTimeDK(
                directTradeShift.endTime,
              )}`
            : undefined
        }
        options={directTradeUsers.map(
          (user) => ({
            id: user.id,
            name:
              `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
              "Ukendt medarbejder",
            profileImage:
              user.profileImage ??
              null,
          }),
        )}
        confirmLabel="Send vagt"
        emptyText="Ingen kvalificerede kolleger kan modtage vagten."
        onClose={() =>
          setDirectTradeShiftId(
            null,
          )
        }
        onConfirm={(
          employeeId,
        ) => {
          if (
            !directTradeShift
          ) {
            return;
          }

          sendDirect(
            directTradeShift.id,
            employeeId,
          );
        }}
      />
    </section>
  );
}
