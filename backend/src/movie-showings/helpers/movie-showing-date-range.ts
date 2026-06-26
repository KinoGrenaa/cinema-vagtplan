function copenhagenDateTimeToUtc(
  date: string,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
) {
  const [year, month, day] = date.split('-').map(Number);

  const utcGuess = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond),
  );

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(utcGuess);

  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  const localAsUtc = Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour'),
    getPart('minute'),
    getPart('second'),
    millisecond,
  );

  const wantedAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond,
  );

  const offset = localAsUtc - utcGuess.getTime();

  return new Date(wantedAsUtc - offset);
}

export function getCopenhagenDayRange(date: string) {
  return {
    start: copenhagenDateTimeToUtc(date, 0, 0, 0, 0),
    end: copenhagenDateTimeToUtc(date, 23, 59, 59, 999),
  };
}
