import {
  dateToLocalDateString,
  formatDateDK,
  formatTimeDK,
} from "@/app/utils/dateTime";

import type { CinemaPayrollSettings } from "./types";

export function firstDayOfMonthIso() {
  const now = new Date();

  return dateToLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
}

export function lastDayOfMonthIso() {
  const now = new Date();

  return dateToLocalDateString(
    new Date(now.getFullYear(), now.getMonth() + 1, 0),
  );
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clampDay(year: number, monthIndex: number, day: number) {
  return Math.min(Math.max(day, 1), daysInMonth(year, monthIndex));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function calculatePayrollPeriod(
  settings?: CinemaPayrollSettings | null,
  referenceDate?: Date,
) {
  const today = referenceDate ?? new Date();

  if (!settings || settings.payrollPeriodModel === "CALENDAR_MONTH") {
    return {
      startDate: firstDayOfMonthIso(),
      endDate: lastDayOfMonthIso(),
    };
  }

  if (settings.payrollPeriodModel === "BIWEEKLY") {
    const anchor = settings.payrollPeriodAnchorDate
      ? new Date(settings.payrollPeriodAnchorDate)
      : new Date(today.getFullYear(), today.getMonth(), 1);

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceAnchor = Math.floor(
      (new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ).getTime() -
        new Date(
          anchor.getFullYear(),
          anchor.getMonth(),
          anchor.getDate(),
        ).getTime()) /
        msPerDay,
    );

    const cycleOffset = Math.floor(daysSinceAnchor / 14) * 14;
    const start = addDays(anchor, cycleOffset);
    const end = addDays(start, 13);

    return {
      startDate: dateToLocalDateString(start),
      endDate: dateToLocalDateString(end),
    };
  }

  const startDay = settings.payrollPeriodStartDay || 1;
  const endDay = settings.payrollPeriodEndDay || 31;

  if (startDay <= endDay) {
    return {
      startDate: dateToLocalDateString(
        new Date(
          today.getFullYear(),
          today.getMonth(),
          clampDay(today.getFullYear(), today.getMonth(), startDay),
        ),
      ),
      endDate: dateToLocalDateString(
        new Date(
          today.getFullYear(),
          today.getMonth(),
          clampDay(today.getFullYear(), today.getMonth(), endDay),
        ),
      ),
    };
  }

  const startMonthOffset = today.getDate() >= startDay ? 0 : -1;
  const endMonthOffset = today.getDate() >= startDay ? 1 : 0;

  const startMonth = new Date(
    today.getFullYear(),
    today.getMonth() + startMonthOffset,
    1,
  );
  const endMonth = new Date(
    today.getFullYear(),
    today.getMonth() + endMonthOffset,
    1,
  );

  return {
    startDate: dateToLocalDateString(
      new Date(
        startMonth.getFullYear(),
        startMonth.getMonth(),
        clampDay(startMonth.getFullYear(), startMonth.getMonth(), startDay),
      ),
    ),
    endDate: dateToLocalDateString(
      new Date(
        endMonth.getFullYear(),
        endMonth.getMonth(),
        clampDay(endMonth.getFullYear(), endMonth.getMonth(), endDay),
      ),
    ),
  };
}

export function describePayrollModel(settings?: CinemaPayrollSettings | null) {
  if (!settings || settings.payrollPeriodModel === "CALENDAR_MONTH") {
    return "Kalendermåned";
  }

  if (settings.payrollPeriodModel === "BIWEEKLY") {
    return "14 dage";
  }

  return `${settings.payrollPeriodStartDay || 1}.–${settings.payrollPeriodEndDay || 31}.`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return `${formatDateDK(value)} ${formatTimeDK(value)}`;
}

export function formatHours(value: number) {
  return value.toLocaleString("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
