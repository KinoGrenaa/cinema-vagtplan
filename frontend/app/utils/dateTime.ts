const TIME_ZONE = "Europe/Copenhagen";

export function getTodayLocalDate() {
  return dateToLocalDateString(new Date());
}

export function getTomorrowLocalDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return dateToLocalDateString(tomorrow);
}

export function dateToLocalDateString(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dateToLocalMonthString(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

export function localDateTimeToISOString(value: string) {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const formattedParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(utcGuess);

  const getPart = (type: string) =>
    Number(formattedParts.find((part) => part.type === type)?.value);

  const localAsUtc = Date.UTC(
    getPart("year"),
    getPart("month") - 1,
    getPart("day"),
    getPart("hour"),
    getPart("minute"),
  );

  const wantedAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const offset = localAsUtc - wantedAsUtc;

  return new Date(wantedAsUtc - offset).toISOString();
}


export function getCopenhagenHour(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(value.getTime())) return 0;

  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(value);

  return Number(hour);
}

export function formatCopenhagenWeekday(date: Date | string) {
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: TIME_ZONE,
    weekday: "long",
  }).format(new Date(date));
}

export function localDateHourToISOString(
  date: string,
  hour: number,
  minute = 0,
) {
  const [year, month, day] = date.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    throw new Error("Ugyldig lokal dato eller tid.");
  }

  const normalized = new Date(
    Date.UTC(year, month - 1, day, hour, minute),
  );
  const normalizedDate = [
    normalized.getUTCFullYear(),
    String(normalized.getUTCMonth() + 1).padStart(2, "0"),
    String(normalized.getUTCDate()).padStart(2, "0"),
  ].join("-");
  const normalizedTime = [
    String(normalized.getUTCHours()).padStart(2, "0"),
    String(normalized.getUTCMinutes()).padStart(2, "0"),
  ].join(":");

  return localDateTimeToISOString(
    `${normalizedDate}T${normalizedTime}`,
  );
}

export function formatDateDK(date: Date | string) {
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatTimeDK(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(value.getTime())) return "-";

  const parts = new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(value);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${hour}:${minute}`;
}

export function isSameLocalDate(left: Date | string, right: Date | string) {
  return (
    dateToLocalDateString(new Date(left)) ===
    dateToLocalDateString(new Date(right))
  );
}
export function toInputDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}
export function formatUtcDateDK(date: Date | string) {
  const value = new Date(date);

  return new Intl.DateTimeFormat("da-DK", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}
