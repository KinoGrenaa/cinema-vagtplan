import type { Cinema } from "./cinemaSettingsTypes";

export function clampDay(value: number) {
  if (Number.isNaN(value)) return 1;
  return Math.min(31, Math.max(1, value));
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDk(date: Date) {
  return date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function dateWithSafeDay(year: number, monthIndex: number, day: number) {
  return new Date(
    year,
    monthIndex,
    Math.min(day, daysInMonth(year, monthIndex)),
  );
}

export function calculatePeriodExample(cinema: Cinema) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  if (cinema.payrollPeriodModel === "BIWEEKLY") {
    if (!cinema.payrollPeriodAnchorDate) {
      return {
        text: "Vælg en anchor-dato for at se et eksempel.",
        days: null as number | null,
        warning: "14-dages løn kræver en anchor-dato.",
      };
    }

    const anchor = new Date(`${cinema.payrollPeriodAnchorDate}T00:00:00`);
    if (Number.isNaN(anchor.getTime())) {
      return {
        text: "Anchor-datoen er ugyldig.",
        days: null as number | null,
        warning: "Vælg en gyldig anchor-dato.",
      };
    }

    const start = new Date(anchor);
    while (start <= today) {
      start.setDate(start.getDate() + 14);
    }
    start.setDate(start.getDate() - 14);

    const end = new Date(start);
    end.setDate(end.getDate() + 13);

    return {
      text: `${formatDateDk(start)} → ${formatDateDk(end)}`,
      days: 14,
      warning: null as string | null,
    };
  }

  if (cinema.payrollPeriodModel === "FIXED_DAY_TO_DAY") {
    const startDay = clampDay(cinema.payrollPeriodStartDay);
    const endDay = clampDay(cinema.payrollPeriodEndDay);

    let start = dateWithSafeDay(year, month, startDay);
    let end = dateWithSafeDay(year, month, endDay);

    if (startDay > endDay) {
      if (today.getDate() >= startDay) {
        end = dateWithSafeDay(year, month + 1, endDay);
      } else {
        start = dateWithSafeDay(year, month - 1, startDay);
      }
    }

    if (startDay < endDay && today.getDate() > endDay) {
      start = dateWithSafeDay(year, month + 1, startDay);
      end = dateWithSafeDay(year, month + 1, endDay);
    }

    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    let warning: string | null = null;

    if (startDay === endDay) {
      warning = "Startdag og slutdag må ikke være den samme.";
    } else if (days < 14) {
      warning =
        "Kort lønperiode. Kontrollér at fra- og til-dato er valgt korrekt.";
    } else if (days > 35) {
      warning =
        "Lang lønperiode. Kontrollér at fra- og til-dato er valgt korrekt.";
    } else if (startDay === 21 && endDay === 19) {
      warning =
        "Kontrollér perioden. Mange virksomheder med start den 21. bruger slutdag den 20.";
    }

    return {
      text: `${formatDateDk(start)} → ${formatDateDk(end)}`,
      days,
      warning,
    };
  }

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    text: `${formatDateDk(start)} → ${formatDateDk(end)}`,
    days: end.getDate(),
    warning: null as string | null,
  };
}
