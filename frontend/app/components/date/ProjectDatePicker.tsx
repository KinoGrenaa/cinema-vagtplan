"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createPortal,
} from "react-dom";

type ProjectDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  clearable?: boolean;
  variant?: "icon" | "field";
  ariaLabel?: string;
  className?: string;
};

type CalendarWeek = {
  weekNumber: number;
  days: Date[];
};

const DAY_MS =
  24 * 60 * 60 * 1000;

const WEEKDAY_LABELS = [
  "ma",
  "ti",
  "on",
  "to",
  "fr",
  "l\u00f8",
  "s\u00f8",
] as const;

function parseDateValue(
  value: string,
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return null;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDateValue(
  date: Date,
) {
  const year =
    String(
      date.getUTCFullYear(),
    );

  const month =
    String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      date.getUTCDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayValue() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      now.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(
  date: Date,
  days: number,
) {
  return new Date(
    date.getTime() +
      days * DAY_MS,
  );
}

function startOfIsoWeek(
  date: Date,
) {
  const weekday =
    (
      date.getUTCDay() + 6
    ) % 7;

  return addDays(
    date,
    -weekday,
  );
}

function getIsoWeekNumber(
  date: Date,
) {
  const thursday =
    addDays(
      startOfIsoWeek(
        date,
      ),
      3,
    );

  const isoYear =
    thursday.getUTCFullYear();

  const januaryFourth =
    new Date(
      Date.UTC(
        isoYear,
        0,
        4,
      ),
    );

  const firstThursday =
    addDays(
      startOfIsoWeek(
        januaryFourth,
      ),
      3,
    );

  return (
    1 +
    Math.round(
      (
        thursday.getTime() -
        firstThursday.getTime()
      ) /
        (
          7 *
          DAY_MS
        ),
    )
  );
}

function buildCalendarWeeks(
  monthDate: Date,
) {
  const monthStart =
    new Date(
      Date.UTC(
        monthDate.getUTCFullYear(),
        monthDate.getUTCMonth(),
        1,
      ),
    );

  const gridStart =
    startOfIsoWeek(
      monthStart,
    );

  const weeks:
    CalendarWeek[] = [];

  for (
    let weekIndex = 0;
    weekIndex < 6;
    weekIndex += 1
  ) {
    const weekStart =
      addDays(
        gridStart,
        weekIndex * 7,
      );

    const days =
      Array.from(
        {
          length: 7,
        },
        (
          _,
          dayIndex,
        ) =>
          addDays(
            weekStart,
            dayIndex,
          ),
      );

    weeks.push({
      weekNumber:
        getIsoWeekNumber(
          weekStart,
        ),
      days,
    });
  }

  return weeks;
}

function formatMonthTitle(
  date: Date,
) {
  return new Intl.DateTimeFormat(
    "da-DK",
    {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(date);
}

function formatFieldDate(
  value: string,
) {
  const date =
    parseDateValue(
      value,
    );

  if (!date) {
    return "V\u00e6lg dato";
  }

  return new Intl.DateTimeFormat(
    "da-DK",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(date);
}

function formatAccessibleDate(
  date: Date,
) {
  return new Intl.DateTimeFormat(
    "da-DK",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(date);
}

function isDateAllowed(
  value: string,
  min?: string,
  max?: string,
) {
  if (
    min &&
    value < min
  ) {
    return false;
  }

  if (
    max &&
    value > max
  ) {
    return false;
  }

  return true;
}

export default function ProjectDatePicker({
  value,
  onChange,
  min,
  max,
  disabled = false,
  clearable = false,
  variant = "field",
  ariaLabel = "V\u00e6lg dato",
  className = "",
}: ProjectDatePickerProps) {
  const rootRef =
    useRef<HTMLDivElement>(
      null,
    );

  const triggerRef =
    useRef<HTMLButtonElement>(
      null,
    );

  const calendarRef =
    useRef<HTMLDivElement>(
      null,
    );

  const [
    calendarPosition,
    setCalendarPosition,
  ] =
    useState<{
      top: number;
      left: number;
    } | null>(
      null,
    );

  const [open, setOpen] =
    useState(false);

  const selectedDate =
    useMemo(
      () =>
        parseDateValue(
          value,
        ),
      [value],
    );

  const todayValue =
    getTodayValue();

  const todayDate =
    useMemo(
      () =>
        parseDateValue(
          todayValue,
        )!,
      [todayValue],
    );

  const [
    visibleMonth,
    setVisibleMonth,
  ] =
    useState<Date>(
      selectedDate ??
        todayDate,
    );

  useEffect(() => {
    if (
      !open ||
      !selectedDate
    ) {
      return;
    }

    setVisibleMonth(
      selectedDate,
    );
  }, [
    open,
    selectedDate,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown =
      (
        event: MouseEvent,
      ) => {
        const target =
          event.target as Node;

        if (
          rootRef.current?.contains(
            target,
          ) ||
          calendarRef.current?.contains(
            target,
          )
        ) {
          return;
        }

        setOpen(false);
      };

    const handleKeyDown =
      (
        event: KeyboardEvent,
      ) => {
        if (
          event.key ===
          "Escape"
        ) {
          setOpen(false);
        }
      };

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setCalendarPosition(
        null,
      );

      return;
    }

    const updatePosition =
      () => {
        const trigger =
          triggerRef.current;

        const calendar =
          calendarRef.current;

        if (
          !trigger ||
          !calendar
        ) {
          return;
        }

        const triggerRect =
          trigger.getBoundingClientRect();

        const calendarRect =
          calendar.getBoundingClientRect();

        const margin = 8;
        const gap = 8;

        const viewportWidth =
          window.innerWidth;

        const viewportHeight =
          window.innerHeight;

        let left =
          triggerRect.left +
          triggerRect.width / 2 -
          calendarRect.width / 2;

        left =
          Math.max(
            margin,
            Math.min(
              left,
              viewportWidth -
                calendarRect.width -
                margin,
            ),
          );

        const belowTop =
          triggerRect.bottom +
          gap;

        const aboveTop =
          triggerRect.top -
          calendarRect.height -
          gap;

        let top =
          belowTop;

        if (
          belowTop +
            calendarRect.height <=
          viewportHeight -
            margin
        ) {
          top =
            belowTop;
        } else if (
          aboveTop >=
          margin
        ) {
          top =
            aboveTop;
        } else {
          top =
            Math.max(
              margin,
              Math.min(
                belowTop,
                viewportHeight -
                  calendarRect.height -
                  margin,
              ),
            );
        }

        setCalendarPosition({
          top,
          left,
        });
      };

    const frame =
      window.requestAnimationFrame(
        updatePosition,
      );

    window.addEventListener(
      "resize",
      updatePosition,
    );

    window.addEventListener(
      "scroll",
      updatePosition,
      true,
    );

    return () => {
      window.cancelAnimationFrame(
        frame,
      );

      window.removeEventListener(
        "resize",
        updatePosition,
      );

      window.removeEventListener(
        "scroll",
        updatePosition,
        true,
      );
    };
  }, [
    open,
    visibleMonth,
  ]);

  const calendarWeeks =
    useMemo(
      () =>
        buildCalendarWeeks(
          visibleMonth,
        ),
      [visibleMonth],
    );

  const currentMonth =
    visibleMonth.getUTCMonth();

  const goToMonth =
    (
      offset: number,
    ) => {
      setVisibleMonth(
        new Date(
          Date.UTC(
            visibleMonth.getUTCFullYear(),
            visibleMonth.getUTCMonth() +
              offset,
            1,
          ),
        ),
      );
    };

  const chooseDate =
    (
      date: Date,
    ) => {
      const nextValue =
        formatDateValue(
          date,
        );

      if (
        !isDateAllowed(
          nextValue,
          min,
          max,
        )
      ) {
        return;
      }

      onChange(
        nextValue,
      );

      setOpen(false);
    };

  const chooseToday =
    () => {
      if (
        !isDateAllowed(
          todayValue,
          min,
          max,
        )
      ) {
        return;
      }

      onChange(
        todayValue,
      );

      setOpen(false);
    };

  function clearDate() {
    onChange("");
    setOpen(false);
  }

  const triggerClass =
    variant === "icon"
      ? "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-300 bg-blue-50 text-blue-900 shadow-sm transition hover:bg-blue-100 active:bg-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100 dark:hover:bg-blue-950 dark:active:bg-blue-900 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
      : "inline-flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900 dark:focus-visible:ring-offset-gray-900";

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() =>
          setOpen(
            (current) =>
              !current,
          )
        }
        disabled={disabled}
        className={
          triggerClass
        }
        aria-label={
          ariaLabel
        }
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {variant ===
        "field" ? (
          <>
            <span>
              {formatFieldDate(
                value,
              )}
            </span>

            <CalendarDays
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300"
            />
          </>
        ) : (
          <CalendarDays
            aria-hidden="true"
            className="h-5 w-5"
          />
        )}
      </button>

      {open &&
      typeof document !==
        "undefined"
        ? createPortal(
            <div
              ref={calendarRef}
              role="dialog"
              aria-label="Kalender"
              className="fixed z-[300] w-[21.5rem] max-w-[calc(100vw-1rem)] overflow-x-hidden overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
              style={{
                top:
                  calendarPosition?.top ??
                  0,
                left:
                  calendarPosition?.left ??
                  0,
                visibility:
                  calendarPosition
                    ? "visible"
                    : "hidden",
                maxHeight:
                  "calc(100vh - 1rem)",
              }}
            >
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3 dark:border-gray-700">
            <button
              type="button"
              onClick={() =>
                goToMonth(-1)
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-200 dark:hover:bg-gray-800"
              aria-label={"Forrige m\u00e5ned"}
            >
              <ChevronLeft
                aria-hidden="true"
                className="h-5 w-5"
              />
            </button>

            <div className="text-sm font-extrabold capitalize text-gray-950 dark:text-white">
              {formatMonthTitle(
                visibleMonth,
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                goToMonth(1)
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-200 dark:hover:bg-gray-800"
              aria-label={"N\u00e6ste m\u00e5ned"}
            >
              <ChevronRight
                aria-hidden="true"
                className="h-5 w-5"
              />
            </button>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] items-center gap-1">
              <div className="text-center text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Uge
              </div>

              {WEEKDAY_LABELS.map(
                (label) => (
                  <div
                    key={label}
                    className="py-1 text-center text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400"
                  >
                    {label}
                  </div>
                ),
              )}

              {calendarWeeks.flatMap(
                (
                  week,
                  weekIndex,
                ) => [
                  <div
                    key={`week-${weekIndex}`}
                    className="flex h-9 items-center justify-center rounded-lg bg-gray-50 text-[11px] font-bold text-gray-500 dark:bg-gray-950/70 dark:text-gray-400"
                    title={`Uge ${week.weekNumber}`}
                  >
                    {week.weekNumber}
                  </div>,

                  ...week.days.map(
                    (date) => {
                      const dateValue =
                        formatDateValue(
                          date,
                        );

                      const selected =
                        dateValue ===
                        value;

                      const today =
                        dateValue ===
                        todayValue;

                      const outsideMonth =
                        date.getUTCMonth() !==
                        currentMonth;

                      const allowed =
                        isDateAllowed(
                          dateValue,
                          min,
                          max,
                        );

                      return (
                        <button
                          key={
                            dateValue
                          }
                          type="button"
                          onClick={() =>
                            chooseDate(
                              date,
                            )
                          }
                          disabled={
                            !allowed
                          }
                          aria-label={
                            formatAccessibleDate(
                              date,
                            )
                          }
                          aria-current={
                            today
                              ? "date"
                              : undefined
                          }
                          className={[
                            "relative flex h-9 items-center justify-center rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                            selected
                              ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                              : outsideMonth
                                ? "text-gray-300 hover:bg-gray-100 dark:text-gray-600 dark:hover:bg-gray-800"
                                : "text-gray-800 hover:bg-blue-50 hover:text-blue-800 dark:text-gray-100 dark:hover:bg-blue-950/50 dark:hover:text-blue-200",
                            !allowed
                              ? "cursor-not-allowed opacity-30"
                              : "",
                          ].join(
                            " ",
                          )}
                        >
                          {date.getUTCDate()}

                          {today &&
                          !selected ? (
                            <span
                              aria-hidden="true"
                              className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-300"
                            />
                          ) : null}
                        </button>
                      );
                    },
                  ),
                ],
              )}
            </div>
          </div>

          <div
            className={
              clearable && value
                ? "flex items-center justify-between border-t border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-950/60"
                : "flex items-center justify-end border-t border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-950/60"
            }
          >
            {clearable && value ? (
              <button
                type="button"
                onClick={clearDate}
                className="rounded-lg px-3 py-1.5 text-sm font-bold text-gray-600 transition hover:bg-gray-200 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                Ryd
              </button>
            ) : null}

            <button
              type="button"
              onClick={
                chooseToday
              }
              disabled={
                !isDateAllowed(
                  todayValue,
                  min,
                  max,
                )
              }
              className="rounded-lg px-3 py-1.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-300 dark:hover:bg-blue-950"
            >
              I dag
            </button>
          </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
