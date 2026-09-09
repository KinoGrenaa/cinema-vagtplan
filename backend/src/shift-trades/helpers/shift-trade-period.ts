const COPENHAGEN_TIME_ZONE = 'Europe/Copenhagen';

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('da-DK', {
    timeZone: COPENHAGEN_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat('da-DK', {
    timeZone: COPENHAGEN_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function getDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: COPENHAGEN_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatShiftTradePeriod(startTime: Date, endTime: Date) {
  if (getDateKey(startTime) === getDateKey(endTime)) {
    return `${formatDate(startTime)} kl. ${formatTime(startTime)}–${formatTime(endTime)}`;
  }
  return `${formatDate(startTime)} kl. ${formatTime(startTime)} → ${formatDate(endTime)} kl. ${formatTime(endTime)}`;
}
