import { ForbiddenException } from '@nestjs/common';
import { hasPermission } from '../../auth/permissions';

export type CinemaControllerUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
  canManageCinemaSettings?: boolean;
};

function hasValidCinemaId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export function ensureCinemaMaster(user: CinemaControllerUser) {
  if (user.role !== 'MASTER') {
    throw new ForbiddenException(
      'Kun MASTER har adgang til denne handling',
    );
  }
}

export function ensureCinemaReadAccess(
  user: CinemaControllerUser,
  cinemaId: number,
) {
  if (user.role === 'MASTER') {
    return;
  }

  if (
    !hasValidCinemaId(user.cinemaId) ||
    user.cinemaId !== cinemaId
  ) {
    throw new ForbiddenException(
      'Du har ikke adgang til denne biograf',
    );
  }
}

export function ensureCinemaManageAccess(
  user: CinemaControllerUser,
  cinemaId: number,
) {
  if (user.role === 'MASTER') {
    return;
  }

  ensureCinemaReadAccess(user, cinemaId);

  if (
    user.role !== 'ADMIN' &&
    !hasPermission(user, 'canManageCinemaSettings')
  ) {
    throw new ForbiddenException(
      'Du har ikke rettighed til at ændre biografindstillinger',
    );
  }
}
