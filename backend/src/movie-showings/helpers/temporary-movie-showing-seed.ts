import { Prisma } from '@prisma/client';
import { parseMovieShowingDate } from './movie-showing-date-range';

const COPENHAGEN_TIME_ZONE = 'Europe/Copenhagen';
const MAXIMUM_SEED_DAYS = 366;

const copenhagenDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: COPENHAGEN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const temporaryMovieTitles = [
  'Kino Kuppet',
  'Frost over Fjorden',
  'Agent Nordlys',
  'Mysteriet på Slottet',
  'Ørkenens Dronning',
  'Den Store Rejse',
  'Havets Hemmelighed',
  'Stjernestøv',
  'Den Glemte Planet',
  'Sommer i Grenaa',
  'Mission Midnat',
  'Venskab for Altid',
  'Den Lille Dinosaur',
  'Robotterne Kommer',
  'Skygger over Byen',
  'Familien Finder Hjem',
] as const;

type TemporaryMovieSlot = {
  hall: string;
  startMinute: number;
  durationMinutes: number;
  capacity: number;
};

const weekdaySlots: TemporaryMovieSlot[] = [
  {
    hall: 'Sal 1',
    startMinute: 17 * 60,
    durationMinutes: 105,
    capacity: 344,
  },
  {
    hall: 'Sal 2',
    startMinute: 17 * 60 + 15,
    durationMinutes: 100,
    capacity: 60,
  },
  {
    hall: 'Sal 1',
    startMinute: 19 * 60 + 30,
    durationMinutes: 115,
    capacity: 344,
  },
  {
    hall: 'Sal 2',
    startMinute: 19 * 60 + 45,
    durationMinutes: 110,
    capacity: 60,
  },
];

const weekendSlots: TemporaryMovieSlot[] = [
  {
    hall: 'Sal 1',
    startMinute: 10 * 60,
    durationMinutes: 95,
    capacity: 344,
  },
  {
    hall: 'Sal 2',
    startMinute: 10 * 60 + 15,
    durationMinutes: 90,
    capacity: 60,
  },
  {
    hall: 'Sal 1',
    startMinute: 12 * 60 + 30,
    durationMinutes: 105,
    capacity: 344,
  },
  {
    hall: 'Sal 2',
    startMinute: 12 * 60 + 45,
    durationMinutes: 100,
    capacity: 60,
  },
  {
    hall: 'Sal 1',
    startMinute: 15 * 60,
    durationMinutes: 110,
    capacity: 344,
  },
  {
    hall: 'Sal 2',
    startMinute: 15 * 60 + 15,
    durationMinutes: 105,
    capacity: 60,
  },
  {
    hall: 'Sal 1',
    startMinute: 17 * 60 + 30,
    durationMinutes: 115,
    capacity: 344,
  },
  {
    hall: 'Sal 2',
    startMinute: 17 * 60 + 45,
    durationMinutes: 110,
    capacity: 60,
  },
];

export type TemporaryMovieShowingSeedOptions = {
  cinemaId: number;
  startDate: string;
  dayCount: number;
};

export type TemporaryMovieShowingSeedPlan = {
  cinemaId: number;
  startDate: string;
  dayCount: number;
  periodStart: Date;
  periodEndExclusive: Date;
  deleteWhere: Prisma.MovieShowingWhereInput;
  createData: Prisma.MovieShowingCreateManyInput[];
};

function getPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  const value = Number(
    parts.find((part) => part.type === type)?.value,
  );

  if (!Number.isInteger(value)) {
    throw new Error('Kunne ikke beregne dansk dato og tid');
  }

  return value;
}

function getCopenhagenDateTimeParts(date: Date) {
  const parts = copenhagenDateTimeFormatter.formatToParts(date);

  return {
    year: getPart(parts, 'year'),
    month: getPart(parts, 'month'),
    day: getPart(parts, 'day'),
    hour: getPart(parts, 'hour'),
    minute: getPart(parts, 'minute'),
    second: getPart(parts, 'second'),
  };
}

function getCopenhagenOffsetMilliseconds(date: Date) {
  const parts = getCopenhagenDateTimeParts(date);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const withoutMilliseconds =
    Math.floor(date.getTime() / 1000) * 1000;

  return localAsUtc - withoutMilliseconds;
}

export function copenhagenLocalDateTimeToUtc(
  date: string,
  minuteOfDay: number,
) {
  const parsedDate = parseMovieShowingDate(date);

  if (!parsedDate) {
    throw new Error('Dato skal være en gyldig dato');
  }
  if (
    !Number.isInteger(minuteOfDay) ||
    minuteOfDay < 0 ||
    minuteOfDay >= 24 * 60
  ) {
    throw new Error('Tidspunkt skal ligge inden for døgnet');
  }

  const [year, month, day] = parsedDate.split('-').map(Number);
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const localAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
  );
  let candidate = new Date(localAsUtc);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const nextCandidate = new Date(
      localAsUtc - getCopenhagenOffsetMilliseconds(candidate),
    );

    if (nextCandidate.getTime() === candidate.getTime()) {
      break;
    }

    candidate = nextCandidate;
  }

  const resolved = getCopenhagenDateTimeParts(candidate);

  if (
    resolved.year !== year ||
    resolved.month !== month ||
    resolved.day !== day ||
    resolved.hour !== hour ||
    resolved.minute !== minute
  ) {
    throw new Error('Tidspunktet findes ikke i Europe/Copenhagen');
  }

  return candidate;
}

function addDays(date: string, dayOffset: number) {
  const parsedDate = parseMovieShowingDate(date);

  if (!parsedDate) {
    throw new Error('Dato skal være en gyldig dato');
  }

  const [year, month, day] = parsedDate.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + dayOffset));

  return [
    nextDate.getUTCFullYear(),
    String(nextDate.getUTCMonth() + 1).padStart(2, '0'),
    String(nextDate.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function isWeekend(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return weekday === 0 || weekday === 6;
}

function validateOptions(options: TemporaryMovieShowingSeedOptions) {
  if (!Number.isInteger(options.cinemaId) || options.cinemaId <= 0) {
    throw new Error('Biograf-ID skal være et positivt heltal');
  }
  if (
    !Number.isInteger(options.dayCount) ||
    options.dayCount <= 0 ||
    options.dayCount > MAXIMUM_SEED_DAYS
  ) {
    throw new Error(
      `Antal dage skal være mellem 1 og ${MAXIMUM_SEED_DAYS}`,
    );
  }

  const startDate = parseMovieShowingDate(options.startDate);

  if (!startDate) {
    throw new Error('Startdato skal være en gyldig dato');
  }

  return startDate;
}

export function buildTemporaryMovieShowingSeedPlan(
  options: TemporaryMovieShowingSeedOptions,
): TemporaryMovieShowingSeedPlan {
  const startDate = validateOptions(options);
  const endDate = addDays(startDate, options.dayCount);
  const periodStart = copenhagenLocalDateTimeToUtc(startDate, 0);
  const periodEndExclusive = copenhagenLocalDateTimeToUtc(endDate, 0);
  const createData: Prisma.MovieShowingCreateManyInput[] = [];

  for (let dayIndex = 0; dayIndex < options.dayCount; dayIndex += 1) {
    const date = addDays(startDate, dayIndex);
    const slots = isWeekend(date) ? weekendSlots : weekdaySlots;

    slots.forEach((slot, slotIndex) => {
      const startTime = copenhagenLocalDateTimeToUtc(
        date,
        slot.startMinute,
      );
      const endTime = new Date(
        startTime.getTime() + slot.durationMinutes * 60 * 1000,
      );
      const titleIndex =
        (dayIndex * 7 + slotIndex * 3 + options.cinemaId) %
        temporaryMovieTitles.length;
      const soldSeats =
        ((dayIndex + 1) * (slotIndex + 3) * 17 +
          options.cinemaId * 11) %
        (slot.capacity + 1);

      createData.push({
        cinemaId: options.cinemaId,
        title: temporaryMovieTitles[titleIndex],
        hall: slot.hall,
        startTime,
        endTime,
        soldSeats,
        freeSeats: slot.capacity - soldSeats,
      });
    });
  }

  return {
    cinemaId: options.cinemaId,
    startDate,
    dayCount: options.dayCount,
    periodStart,
    periodEndExclusive,
    deleteWhere: {
      cinemaId: options.cinemaId,
      startTime: {
        lt: periodEndExclusive,
      },
      endTime: {
        gt: periodStart,
      },
    },
    createData,
  };
}
