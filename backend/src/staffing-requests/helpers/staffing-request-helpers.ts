import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { CreateStaffingRequestDto } from '../dto/create-staffing-request.dto';

export type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

export type CreateStaffingRequestInput = CreateStaffingRequestDto & {
  cinemaId?: number | null;
};

export const staffingRequestInclude = {
  cinema: true,
  shift: {
    include: {
      user: true,
      workType: true,
    },
  },
  workType: true,
  requestedByUser: true,
  targetUser: true,
};

export function canManageStaffing(user: AuthUser) {
  return user.role === 'MASTER' || user.role === 'ADMIN';
}

export function resolveStaffingCinemaId(
  user: AuthUser,
  selectedCinemaId?: number | null,
) {
  if (user.role === 'MASTER') {
    if (!selectedCinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer bemandingsforespørgsler.',
      );
    }

    return selectedCinemaId;
  }

  if (!user.cinemaId) {
    throw new ForbiddenException('Din bruger er ikke tilknyttet en biograf');
  }

  return user.cinemaId;
}

export function parseStaffingRequestDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Tidsintervallet er ikke gyldigt.');
  }

  return date;
}
