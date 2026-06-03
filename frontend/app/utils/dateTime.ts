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
  return new Date(value).toISOString();
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
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
}

export function isSameLocalDate(left: Date | string, right: Date | string) {
  return (
    dateToLocalDateString(new Date(left)) ===
    dateToLocalDateString(new Date(right))
  );
}
