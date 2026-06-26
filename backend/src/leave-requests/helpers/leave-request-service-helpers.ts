import { BadRequestException, ForbiddenException } from '@nestjs/common';

export type AuthUser = {
  sub?: number;
  id?: number;
  email?: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

export type LeaveStatus = 'APPROVED' | 'REJECTED' | 'CANCELLED';

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

type ShiftWithWorkType = {
  startTime: Date;
  endTime: Date;
  workType?: {
    name: string;
  } | null;
};

export function getUserId(user: AuthUser) {
  return user.sub ?? user.id;
}

export function requireUserId(user: AuthUser) {
  const userId = getUserId(user);

  if (!userId) {
    throw new ForbiddenException('Brugeren kunne ikke identificeres.');
  }

  return userId;
}

function getTomorrowStart() {
  const tomorrow = new Date();

  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return tomorrow;
}

export function resolveLeaveCinemaId(
  user: AuthUser,
  selectedCinemaId?: number | null,
) {
  if (user.role === 'MASTER') {
    if (!selectedCinemaId) {
      throw new BadRequestException('Vælg en biograf, før du henter fravær.');
    }

    return selectedCinemaId;
  }

  if (!user.cinemaId) {
    throw new ForbiddenException('Din bruger er ikke tilknyttet en biograf');
  }

  return user.cinemaId;
}

export function validateLeaveRequestDates(startDate: Date, endDate: Date) {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new BadRequestException('Ugyldig dato eller tid.');
  }

  if (startDate < getTomorrowStart()) {
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

export function createOverlappingShiftException(shift: ShiftWithWorkType) {
  const shiftDate = shift.startTime.toLocaleDateString('da-DK', {
    timeZone: 'Europe/Copenhagen',
  });

  const shiftStart = shift.startTime.toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Copenhagen',
  });

  const shiftEnd = shift.endTime.toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Copenhagen',
  });

  const workTypeName = shift.workType?.name
    ? `${shift.workType.name}-vagt`
    : 'vagt';

  return new BadRequestException(
    `Du har en ${workTypeName} den ${shiftDate} kl. ${shiftStart}-${shiftEnd}. Byt vagten først, eller kontakt din planlægger, før du søger fravær.`,
  );
}

export function ensureLeaveStatusChangeAllowed(params: {
  actorUserId: number;
  existing: ExistingLeaveRequest;
  isAdmin: boolean;
  status: LeaveStatus;
}) {
  const isOwner = params.existing.userId === params.actorUserId;

  if (params.status === 'CANCELLED') {
    if (!params.isAdmin && !isOwner) {
      throw new ForbiddenException(
        'Du kan kun annullere dine egne fraværsansøgninger.',
      );
    }

    if (
      params.existing.status === 'REJECTED' ||
      params.existing.status === 'CANCELLED'
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
}
