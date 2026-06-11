import { useState } from "react";
import {
  calculatePayrollPeriod,
  firstDayOfMonthIso,
  lastDayOfMonthIso,
} from "../utils";
import type { CinemaPayrollSettings } from "../types";

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getInclusivePeriodLength(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  return (
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
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

  function previousPayrollPeriod() {
    const periodLength = getInclusivePeriodLength(startDate, endDate);

    const newEnd = new Date(`${startDate}T00:00:00`);
    newEnd.setDate(newEnd.getDate() - 1);

    const newStart = new Date(newEnd);
    newStart.setDate(newStart.getDate() - (periodLength - 1));

    setStartDate(toLocalIsoDate(newStart));
    setEndDate(toLocalIsoDate(newEnd));
  }

  function nextPayrollPeriod() {
    const periodLength = getInclusivePeriodLength(startDate, endDate);

    const newStart = new Date(`${endDate}T00:00:00`);
    newStart.setDate(newStart.getDate() + 1);

    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + (periodLength - 1));

    setStartDate(toLocalIsoDate(newStart));
    setEndDate(toLocalIsoDate(newEnd));
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
