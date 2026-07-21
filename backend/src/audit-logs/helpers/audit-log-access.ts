import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

export type CurrentUser = {
  id?: number;
  sub?: number;
  role: string;
  cinemaId: number | null;
};

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export function getAuditLogAccessWhere(
  currentUser: CurrentUser,
  selectedCinemaId?: number | null,
) {
  if (currentUser.role === 'MASTER') {
    if (!isPositiveSafeInteger(selectedCinemaId)) {
      throw new BadRequestException(
        'Vælg en aktiv biograf først.',
      );
    }

    return {
      cinemaId: selectedCinemaId,
    };
  }

  if (!isPositiveSafeInteger(currentUser.cinemaId)) {
    throw new ForbiddenException(
      'Du har ikke adgang til ændringshistorikken',
    );
  }

  return {
    cinemaId: currentUser.cinemaId,
  };
}
