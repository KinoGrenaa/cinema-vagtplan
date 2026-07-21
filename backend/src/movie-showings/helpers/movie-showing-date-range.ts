import { BadRequestException } from '@nestjs/common';

const COPENHAGEN_TIME_ZONE =
  'Europe/Copenhagen';

const copenhagenDateTimeFormatter =
  new Intl.DateTimeFormat('en-CA', {
    timeZone: COPENHAGEN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

function getPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  const value = Number(
    parts.find((part) => part.type === type)
      ?.value,
  );

  if (!Number.isInteger(value)) {
    throw new BadRequestException(
      'Dato skal være en gyldig dato',
    );
  }

  return value;
}

function getCopenhagenOffsetMilliseconds(
  date: Date,
) {
  const parts =
    copenhagenDateTimeFormatter.formatToParts(
      date,
    );
  const localAsUtc = Date.UTC(
    getPart(parts, 'year'),
    getPart(parts, 'month') - 1,
    getPart(parts, 'day'),
    getPart(parts, 'hour'),
    getPart(parts, 'minute'),
    getPart(parts, 'second'),
  );
  const withoutMilliseconds =
    Math.floor(date.getTime() / 1000) * 1000;

  return localAsUtc - withoutMilliseconds;
}

function copenhagenLocalMidnightToUtc(
  year: number,
  month: number,
  day: number,
) {
  const utcGuess = new Date(
    Date.UTC(year, month - 1, day),
  );
  const offsetMilliseconds =
    getCopenhagenOffsetMilliseconds(utcGuess);

  return new Date(
    utcGuess.getTime() - offsetMilliseconds,
  );
}

export function parseMovieShowingDate(
  value?: string,
) {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Dato skal være en gyldig dato',
    );
  }

  const date = value.trim();
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      date,
    );

  if (!match) {
    throw new BadRequestException(
      'Dato skal være en gyldig dato',
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !==
      month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new BadRequestException(
      'Dato skal være en gyldig dato',
    );
  }

  return date;
}

export function getCopenhagenDayRange(
  date: string,
) {
  const parsedDate =
    parseMovieShowingDate(date);

  if (!parsedDate) {
    throw new BadRequestException(
      'Dato skal være en gyldig dato',
    );
  }

  const [year, month, day] =
    parsedDate.split('-').map(Number);

  return {
    start: copenhagenLocalMidnightToUtc(
      year,
      month,
      day,
    ),
    endExclusive:
      copenhagenLocalMidnightToUtc(
        year,
        month,
        day + 1,
      ),
  };
}
