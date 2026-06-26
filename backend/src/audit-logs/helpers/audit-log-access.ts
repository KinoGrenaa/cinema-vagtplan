import { BadRequestException, ForbiddenException } from '@nestjs/common';

export type CurrentUser = {
  id?: number;
  sub?: number;
  role: string;
  cinemaId: number | null;
};

export function getAuditLogAccessWhere(
  currentUser: CurrentUser,
  selectedCinemaId?: number | null,
) {
  if (currentUser.role === 'MASTER') {
    if (!selectedCinemaId || !Number.isFinite(selectedCinemaId)) {
      throw new BadRequestException('Vælg en aktiv biograf først.');
    }

    return {
      cinemaId: selectedCinemaId,
    };
  }

  if (!currentUser.cinemaId) {
    throw new ForbiddenException('Du har ikke adgang til ændringshistorikken');
  }

  return {
    cinemaId: currentUser.cinemaId,
  };
}
