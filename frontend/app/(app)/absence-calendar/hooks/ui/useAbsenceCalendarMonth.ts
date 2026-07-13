"use client";

import { useMemo, useState } from "react";
import { dateToLocalMonthString } from "@/app/utils/dateTime";

export function useAbsenceCalendarMonth() {
  const [selectedMonth, setSelectedMonth] = useState(
    dateToLocalMonthString(new Date()),
  );

  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();

    return Array.from({ length: lastDay }, (_, index) => {
      const day = index + 1;
      return `${selectedMonth}-${String(day).padStart(2, "0")}`;
    });
  }, [selectedMonth]);

  function changeMonth(direction: number) {
    const date = new Date(`${selectedMonth}-01T12:00:00`);
    date.setMonth(date.getMonth() + direction);
    setSelectedMonth(dateToLocalMonthString(date));
  }

  return {
    changeMonth,
    daysInMonth,
    selectedMonth,
  };
}
