import { useState } from "react";

import { dateToLocalDateString } from "@/app/utils/dateTime";

import {
  calculatePayrollPeriod,
  firstDayOfMonthIso,
  lastDayOfMonthIso,
} from "../../utils";
import type { CinemaPayrollSettings } from "../../types";

function toLocalDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`);
}

function calculateCalendarMonth(referenceDate: Date) {
  return {
    startDate: dateToLocalDateString(
      new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1),
    ),
    endDate: dateToLocalDateString(
      new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0),
    ),
  };
}

function calculatePeriodFromReference(
  settings: CinemaPayrollSettings | null | undefined,
  referenceDate: Date,
) {
  if (!settings || settings.payrollPeriodModel === "CALENDAR_MONTH") {
    return calculateCalendarMonth(referenceDate);
  }

  return calculatePayrollPeriod(settings, referenceDate);
}

export function usePayrollFilters() {
  const [startDate, setStartDate] = useState(firstDayOfMonthIso());
  const [endDate, setEndDate] = useState(lastDayOfMonthIso());
  const [userId, setUserId] = useState("");

  function applyCurrentPayrollPeriod(settings?: CinemaPayrollSettings | null) {
    const periodDates = calculatePayrollPeriod(settings ?? null);
    setStartDate(periodDates.startDate);
    setEndDate(periodDates.endDate);
  }

  function previousPayrollPeriod(settings?: CinemaPayrollSettings | null) {
    const referenceDate = toLocalDate(startDate);
    referenceDate.setDate(referenceDate.getDate() - 1);
    const periodDates = calculatePeriodFromReference(settings, referenceDate);
    setStartDate(periodDates.startDate);
    setEndDate(periodDates.endDate);
  }

  function nextPayrollPeriod(settings?: CinemaPayrollSettings | null) {
    const referenceDate = toLocalDate(endDate);
    referenceDate.setDate(referenceDate.getDate() + 1);
    const periodDates = calculatePeriodFromReference(settings, referenceDate);
    setStartDate(periodDates.startDate);
    setEndDate(periodDates.endDate);
  }

  return {
    startDate,
    endDate,
    userId,
    setStartDate,
    setEndDate,
    setUserId,
    applyCurrentPayrollPeriod,
    previousPayrollPeriod,
    nextPayrollPeriod,
  };
}
