import { useState } from "react";

import {
  calculatePayrollPeriod,
  firstDayOfMonthIso,
  lastDayOfMonthIso,
} from "../../utils";
import type { CinemaPayrollSettings } from "../../types";

function toLocalDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`);
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

    const periodDates = calculatePayrollPeriod(settings ?? null, referenceDate);
    setStartDate(periodDates.startDate);
    setEndDate(periodDates.endDate);
  }

  function nextPayrollPeriod(settings?: CinemaPayrollSettings | null) {
    const referenceDate = toLocalDate(endDate);
    referenceDate.setDate(referenceDate.getDate() + 1);

    const periodDates = calculatePayrollPeriod(settings ?? null, referenceDate);
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
