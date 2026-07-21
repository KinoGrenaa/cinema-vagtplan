import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

export type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

export type ShiftWriteData = {
  startTime: string;
  endTime: string;
  note?: string | null;
  cinemaId?: number;
  userId?: number | null;
  workTypeId: number;
};

export const shiftResponseInclude = {
  workType: true,
  user: true,
} as const;

export function getRequiredPositiveShiftId(
  value: unknown,
  message: string,
) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException(message);
  }

  return id;
}

export function getOptionalPositiveShiftId(
  value: unknown,
  message: string,
) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return getRequiredPositiveShiftId(
    value,
    message,
  );
}

export function resolveShiftCinemaId(
  user: AuthUser,
  selectedCinemaId?: number | null,
) {
  const requestedCinemaId =
    getOptionalPositiveShiftId(
      selectedCinemaId,
      'Biograf skal være et gyldigt ID',
    );

  if (user.role === 'MASTER') {
    if (!requestedCinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer vagter.',
      );
    }

    return requestedCinemaId;
  }

  const sessionCinemaId = Number(
    user.cinemaId,
  );

  if (
    !Number.isInteger(sessionCinemaId) ||
    sessionCinemaId <= 0
  ) {
    throw new ForbiddenException(
      'Din bruger er ikke tilknyttet en biograf',
    );
  }

  if (
    requestedCinemaId &&
    requestedCinemaId !== sessionCinemaId
  ) {
    throw new ForbiddenException(
      'Du har ikke adgang til denne biograf',
    );
  }

  return sessionCinemaId;
}

export function getShiftCinemaFilter(
  user: AuthUser,
  selectedCinemaId?: number | null,
) {
  return {
    cinemaId: resolveShiftCinemaId(
      user,
      selectedCinemaId,
    ),
  };
}

function getDateTimePart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  const value = Number(
    parts.find((part) => part.type === type)
      ?.value,
  );

  if (!Number.isInteger(value)) {
    throw new BadRequestException(
      'Ugyldig dato',
    );
  }

  return value;
}

function getCopenhagenOffsetMs(date: Date) {
  const parts = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Europe/Copenhagen',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    },
  ).formatToParts(date);
  const asUtc = Date.UTC(
    getDateTimePart(parts, 'year'),
    getDateTimePart(parts, 'month') - 1,
    getDateTimePart(parts, 'day'),
    getDateTimePart(parts, 'hour'),
    getDateTimePart(parts, 'minute'),
    getDateTimePart(parts, 'second'),
  );

  return asUtc - date.getTime();
}

function copenhagenLocalMidnightToUtc(
  year: number,
  month: number,
  day: number,
) {
  const utcGuess = new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0),
  );
  const offsetMs =
    getCopenhagenOffsetMs(utcGuess);

  return new Date(
    utcGuess.getTime() - offsetMs,
  );
}

export function getCopenhagenDayRange(
  date: string,
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      date,
    );

  if (!match) {
    throw new BadRequestException(
      'Dato skal være i formatet YYYY-MM-DD',
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarDate = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !==
      month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    throw new BadRequestException(
      'Ugyldig dato',
    );
  }

  return {
    start: copenhagenLocalMidnightToUtc(
      year,
      month,
      day,
    ),
    end: copenhagenLocalMidnightToUtc(
      year,
      month,
      day + 1,
    ),
  };
}

export function getShiftUserLabel(shift: {
  user?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  userId?: number | null;
}) {
  const name = `${
    shift.user?.firstName ?? ''
  } ${shift.user?.lastName ?? ''}`.trim();

  if (name) {
    return name;
  }

  return shift.userId
    ? `Medarbejder #${shift.userId}`
    : 'Ikke tildelt';
}

export function formatShiftTime(
  startTime: Date,
  endTime: Date,
) {
  const date = startTime.toLocaleDateString(
    'da-DK',
    {
      timeZone: 'Europe/Copenhagen',
    },
  );
  const start =
    startTime.toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Copenhagen',
    });
  const end = endTime.toLocaleTimeString(
    'da-DK',
    {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Copenhagen',
    },
  );

  return `${date} kl. ${start}-${end}`;
}

export function validateShiftTimes(
  startTime: Date,
  endTime: Date,
) {
  if (
    Number.isNaN(startTime.getTime()) ||
    Number.isNaN(endTime.getTime())
  ) {
    throw new BadRequestException(
      'Start- eller sluttidspunkt er ikke gyldigt',
    );
  }

  if (endTime <= startTime) {
    throw new BadRequestException(
      'Sluttidspunkt skal være efter starttidspunkt',
    );
  }
}
