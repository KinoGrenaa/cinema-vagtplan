type LeaveRequestUser = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export function formatUserName(user?: LeaveRequestUser) {
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

  return fullName || user?.email || 'Ukendt bruger';
}

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('da-DK', {
    timeZone: 'Europe/Copenhagen',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('da-DK', {
    timeZone: 'Europe/Copenhagen',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getCopenhagenDateTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date);

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');

  return {
    dateKey: `${year}-${month}-${day}`,
    hour,
    minute,
  };
}

function formatUtcDate(date: Date) {
  return `${pad(date.getUTCDate())}.${pad(
    date.getUTCMonth() + 1,
  )}.${date.getUTCFullYear()}`;
}

function isSameCopenhagenDate(left: Date, right: Date) {
  return (
    getCopenhagenDateTimeParts(left).dateKey ===
    getCopenhagenDateTimeParts(right).dateKey
  );
}

function getAllDayDateRange(startDate: Date, endDate: Date) {
  const startLocal = getCopenhagenDateTimeParts(startDate);
  const endLocal = getCopenhagenDateTimeParts(endDate);

  const isLocalAllDay =
    startLocal.hour === '00' &&
    startLocal.minute === '00' &&
    endLocal.hour === '23' &&
    Number(endLocal.minute) >= 59;

  if (isLocalAllDay) {
    return {
      startDateText: formatDate(startDate),
      endDateText: formatDate(endDate),
    };
  }

  const isUtcAllDay =
    startDate.getUTCHours() === 0 &&
    startDate.getUTCMinutes() === 0 &&
    endDate.getUTCHours() === 23 &&
    endDate.getUTCMinutes() >= 59;

  if (isUtcAllDay) {
    return {
      startDateText: formatUtcDate(startDate),
      endDateText: formatUtcDate(endDate),
    };
  }

  return null;
}

export function formatLeavePeriod(startDate: Date, endDate: Date) {
  const allDayDateRange = getAllDayDateRange(startDate, endDate);

  if (allDayDateRange) {
    return allDayDateRange.startDateText === allDayDateRange.endDateText
      ? `${allDayDateRange.startDateText} · Hele dagen`
      : `${allDayDateRange.startDateText} - ${allDayDateRange.endDateText} · Hele dagen`;
  }

  const startDateText = formatDate(startDate);
  const endDateText = formatDate(endDate);
  const sameDate = isSameCopenhagenDate(startDate, endDate);

  if (sameDate) {
    return `${startDateText} kl. ${formatTime(startDate)}-${formatTime(
      endDate,
    )}`;
  }

  return `${startDateText} kl. ${formatTime(
    startDate,
  )} - ${endDateText} kl. ${formatTime(endDate)}`;
}
