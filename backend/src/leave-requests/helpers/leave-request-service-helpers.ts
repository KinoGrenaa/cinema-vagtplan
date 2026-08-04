import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

export type AuthUser = {
  sub?: number;
  id?: number;
  email?: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

export type LeaveStatus =
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type LeaveRequestWithUser = {
  id: number;
  userId: number;
  cinemaId: number;
  startDate: Date;
  endDate: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

type ExistingLeaveRequest = {
  userId: number;
  status: string;
};

type ShiftWithJobFunction = {
  startTime: Date;
  endTime: Date;
  jobFunction?: {
    name: string;
  } | null;
  jobFunctionNameSnapshot?: string | null;
};

const COPENHAGEN_TIME_ZONE =
  'Europe/Copenhagen';

const copenhagenDateFormatter =
  new Intl.DateTimeFormat('en-CA', {
    timeZone: COPENHAGEN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

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

function getDateTimePart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  const value = Number(
    parts.find((part) => part.type === type)
      ?.value,
  );

  if (!Number.isInteger(value)) {
    throw new Error(
      `Kunne ikke beregne dansk datogrænse: ${type}`,
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
  const formattedAsUtc = Date.UTC(
    getDateTimePart(parts, 'year'),
    getDateTimePart(parts, 'month') - 1,
    getDateTimePart(parts, 'day'),
    getDateTimePart(parts, 'hour'),
    getDateTimePart(parts, 'minute'),
    getDateTimePart(parts, 'second'),
  );
  const dateWithoutMilliseconds =
    Math.floor(date.getTime() / 1000) * 1000;

  return formattedAsUtc - dateWithoutMilliseconds;
}

function getCopenhagenDayStart(
  referenceDate: Date,
  dayOffset: number,
) {
  const parts =
    copenhagenDateFormatter.formatToParts(
      referenceDate,
    );
  const localMidnightUtcGuess = new Date(
    Date.UTC(
      getDateTimePart(parts, 'year'),
      getDateTimePart(parts, 'month') - 1,
      getDateTimePart(parts, 'day') +
        dayOffset,
      0,
      0,
      0,
    ),
  );
  const offsetMilliseconds =
    getCopenhagenOffsetMilliseconds(
      localMidnightUtcGuess,
    );

  return new Date(
    localMidnightUtcGuess.getTime() -
      offsetMilliseconds,
  );
}

function getPositiveId(
  value: unknown,
  message: string,
) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException(message);
  }

  return id;
}

export function getCopenhagenTodayStart(
  referenceDate = new Date(),
) {
  return getCopenhagenDayStart(
    referenceDate,
    0,
  );
}

export function getCopenhagenTomorrowStart(
  referenceDate = new Date(),
) {
  return getCopenhagenDayStart(
    referenceDate,
    1,
  );
}

export function getUserId(user: AuthUser) {
  return user.sub ?? user.id;
}

export function requireUserId(user: AuthUser) {
  const userId = Number(getUserId(user));

  if (
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    throw new ForbiddenException(
      'Brugeren kunne ikke identificeres.',
    );
  }

  return userId;
}

export function resolveLeaveCinemaId(
  user: AuthUser,
  selectedCinemaId?: number | null,
) {
  const requestedCinemaId =
    selectedCinemaId === undefined ||
    selectedCinemaId === null
      ? undefined
      : getPositiveId(
          selectedCinemaId,
          'Biograf skal være et gyldigt ID.',
        );

  if (user.role === 'MASTER') {
    if (!requestedCinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du henter fravær.',
      );
    }

    return requestedCinemaId;
  }

  const sessionCinemaId = Number(user.cinemaId);

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
      'Du har ikke adgang til denne biograf.',
    );
  }

  return sessionCinemaId;
}

export function validateLeaveRequestDates(
  startDate: Date,
  endDate: Date,
) {
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    throw new BadRequestException(
      'Ugyldig dato eller tid.',
    );
  }

  if (
    startDate <
    getCopenhagenTomorrowStart()
  ) {
    throw new BadRequestException(
      'Du kan ikke anmode om fri i dag eller tilbage i tiden.',
    );
  }

  if (endDate <= startDate) {
    throw new BadRequestException(
      'Sluttidspunkt skal være efter starttidspunkt.',
    );
  }
}

export function createOverlappingShiftException(
  shift: ShiftWithJobFunction,
) {
  const shiftDate =
    shift.startTime.toLocaleDateString(
      'da-DK',
      {
        timeZone: COPENHAGEN_TIME_ZONE,
      },
    );
  const shiftStart =
    shift.startTime.toLocaleTimeString(
      'da-DK',
      {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: COPENHAGEN_TIME_ZONE,
      },
    );
  const shiftEnd =
    shift.endTime.toLocaleTimeString(
      'da-DK',
      {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: COPENHAGEN_TIME_ZONE,
      },
    );
  const jobFunctionName =
    shift.jobFunctionNameSnapshot || shift.jobFunction?.name;
  const shiftLabel = jobFunctionName ? `${jobFunctionName}-vagt` : 'vagt';

  return new BadRequestException(
    `Du har en ${shiftLabel} den ${shiftDate} kl. ${shiftStart}-${shiftEnd}. ` +
      'Byt vagten først, eller kontakt din planlægger, før du søger fravær.',
  );
}

export function ensureLeaveStatusChangeAllowed(
  params: {
    actorUserId: number;
    existing: ExistingLeaveRequest;
    isAdmin: boolean;
    status: LeaveStatus;
  },
) {
  const validStatuses: LeaveStatus[] = [
    'APPROVED',
    'REJECTED',
    'CANCELLED',
  ];

  if (!validStatuses.includes(params.status)) {
    throw new BadRequestException(
      'Fraværsstatus er ugyldig.',
    );
  }

  if (params.existing.status === 'EXPIRED') {
    throw new BadRequestException(
      'Denne fraværsansøgning er udløbet og kan ikke ændres.',
    );
  }

  const isOwner =
    params.existing.userId ===
    params.actorUserId;

  if (params.status === 'CANCELLED') {
    if (!params.isAdmin && !isOwner) {
      throw new ForbiddenException(
        'Du kan kun annullere dine egne fraværsansøgninger.',
      );
    }

    if (
      params.existing.status !== 'PENDING' &&
      params.existing.status !== 'APPROVED'
    ) {
      throw new BadRequestException(
        'Denne fraværsansøgning kan ikke annulleres.',
      );
    }

    return;
  }

  if (!params.isAdmin) {
    throw new ForbiddenException(
      'Kun administratorer kan godkende eller afvise fravær.',
    );
  }

  if (params.existing.status !== 'PENDING') {
    throw new BadRequestException(
      'Kun afventende fraværsansøgninger kan godkendes eller afvises.',
    );
  }
}
