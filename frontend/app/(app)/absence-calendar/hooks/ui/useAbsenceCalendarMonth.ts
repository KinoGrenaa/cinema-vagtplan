"use client";

import {
  useMemo,
  useState,
} from "react";
import { dateToLocalMonthString } from "@/app/utils/dateTime";

export function useAbsenceCalendarMonth() {
  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState(
    dateToLocalMonthString(
      new Date(),
    ),
  );

  const calendarDays = useMemo(() => {
    const [year, month] =
      selectedMonth
        .split("-")
        .map(Number);
    const firstDay = new Date(
      year,
      month - 1,
      1,
      12,
    );
    const lastDay = new Date(
      year,
      month,
      0,
      12,
    ).getDate();
    const leadingEmptyDays =
      (firstDay.getDay() + 6) % 7;
    const days: Array<string | null> = [
      ...Array.from(
        {
          length:
            leadingEmptyDays,
        },
        () => null,
      ),
      ...Array.from(
        { length: lastDay },
        (_, index) =>
          `${selectedMonth}-${String(
            index + 1,
          ).padStart(2, "0")}`,
      ),
    ];
    const trailingEmptyDays =
      (7 - (days.length % 7)) %
      7;

    return [
      ...days,
      ...Array.from(
        {
          length:
            trailingEmptyDays,
        },
        () => null,
      ),
    ];
  }, [selectedMonth]);

  const currentMonth =
    dateToLocalMonthString(
      new Date(),
    );

  function changeMonth(
    direction: number,
  ) {
    const [year, month] =
      selectedMonth
        .split("-")
        .map(Number);
    const date = new Date(
      year,
      month - 1 + direction,
      1,
      12,
    );

    setSelectedMonth(
      dateToLocalMonthString(
        date,
      ),
    );
  }

  function goToToday() {
    setSelectedMonth(currentMonth);
  }

  return {
    calendarDays,
    changeMonth,
    goToToday,
    isCurrentMonth:
      selectedMonth === currentMonth,
    selectedMonth,
  };
}
