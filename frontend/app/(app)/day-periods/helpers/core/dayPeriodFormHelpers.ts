import {
  minuteToTime,
  timeToMinute,
} from "./dayPeriodHelpers";
import type { DayPeriod } from "./dayPeriodTypes";

export type FormState = {
  name: string;
  startTime: string;
  endTime: string;
  sortOrder: string;
};

export const emptyForm: FormState = {
  name: "",
  startTime: "08:00",
  endTime: "17:30",
  sortOrder: "0",
};

export function toFormState(dayPeriod: DayPeriod): FormState {
  return {
    name: dayPeriod.name,
    startTime: minuteToTime(dayPeriod.startMinute),
    endTime: minuteToTime(dayPeriod.endMinute),
    sortOrder: String(dayPeriod.sortOrder ?? 0),
  };
}

export function parseForm(form: FormState) {
  const name = form.name.trim();
  const startMinute = timeToMinute(form.startTime);
  const endMinute = timeToMinute(form.endTime);
  const sortOrder = form.sortOrder.trim() ? Number(form.sortOrder) : 0;

  if (!name) {
    throw new Error("Indtast et navn på dagsperioden.");
  }

  if (startMinute === null) {
    throw new Error("Starttidspunkt skal være et gyldigt tidspunkt.");
  }

  if (endMinute === null) {
    throw new Error("Sluttidspunkt skal være et gyldigt tidspunkt.");
  }

  if (endMinute <= startMinute) {
    throw new Error("Starttidspunkt skal være før sluttidspunkt.");
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Sortering skal være et gyldigt tal.");
  }

  return {
    name,
    startMinute,
    endMinute,
    sortOrder,
  };
}

export function getDurationText(form: FormState) {
  const startMinute = timeToMinute(form.startTime);
  const endMinute = timeToMinute(form.endTime);

  if (startMinute === null || endMinute === null || endMinute <= startMinute) {
    return "Varighed kan beregnes, når start og slut er gyldige.";
  }

  const durationMinutes = endMinute - startMinute;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min.`;
  }

  if (minutes === 0) {
    return `${hours} t.`;
  }

  return `${hours} t. ${minutes} min.`;
}
