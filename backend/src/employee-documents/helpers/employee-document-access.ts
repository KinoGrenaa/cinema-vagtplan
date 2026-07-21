import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

export type AuthUser = {
  sub: number;
  email?: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export function resolveEmployeeDocumentCinemaId(
  user: AuthUser,
  selectedCinemaId?: number | null,
) {
  if (user.role === 'MASTER') {
    if (!isPositiveSafeInteger(selectedCinemaId)) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer medarbejderdokumenter.',
      );
    }

    return selectedCinemaId;
  }

  if (!isPositiveSafeInteger(user.cinemaId)) {
    throw new ForbiddenException(
      'Din bruger er ikke tilknyttet en biograf',
    );
  }

  return user.cinemaId;
}
