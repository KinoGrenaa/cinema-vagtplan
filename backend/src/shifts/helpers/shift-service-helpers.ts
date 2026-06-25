import { BadRequestException, ForbiddenException } from '@nestjs/common';

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

export function resolveShiftCinemaId(
  user: AuthUser,
  selectedCinemaId?: number | null,
) {
  if (user.role === 'MASTER') {
    if (!selectedCinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer vagter.',
      );
    }

    return selectedCinemaId;
  }

  if (!user.cinemaId) {
    throw new ForbiddenException('Din bruger er ikke tilknyttet en biograf');
  }

  return user.cinemaId;
}

export function getShiftCinemaFilter(
  user: AuthUser,
  selectedCinemaId?: number | null,
) {
  return {
    cinemaId: resolveShiftCinemaId(user, selectedCinemaId),
  };
}

function getCopenhagenOffsetMs(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return asUtc - date.getTime();
}

function copenhagenLocalMidnightToUtc(year: number, month: number, day: number) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offsetMs = getCopenhagenOffsetMs(utcGuess);

  return new Date(utcGuess.getTime() - offsetMs);
}

export function getCopenhagenDayRange(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) {
    throw new BadRequestException('Ugyldig dato');
  }

  return {
    start: copenhagenLocalMidnightToUtc(year, month, day),
    end: copenhagenLocalMidnightToUtc(year, month, day + 1),
  };
}

export function getShiftUserLabel(shift: {
  user?: { firstName?: string | null; lastName?: string | null } | null;
  userId?: number | null;
}) {
  const name = `${shift.user?.firstName ?? ''} ${
    shift.user?.lastName ?? ''
  }`.trim();

  if (name) return name;

  return shift.userId ? `Medarbejder #${shift.userId}` : 'Ikke tildelt';
}

export function formatShiftTime(startTime: Date, endTime: Date) {
  const date = startTime.toLocaleDateString('da-DK');
  const start = startTime.toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const end = endTime.toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${date} kl. ${start}-${end}`;
}

export function validateShiftTimes(startTime: Date, endTime: Date) {
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new BadRequestException('Start- eller sluttidspunkt er ikke gyldigt');
  }

  if (endTime <= startTime) {
    throw new BadRequestException(
      'Sluttidspunkt skal være efter starttidspunkt',
    );
  }
}
