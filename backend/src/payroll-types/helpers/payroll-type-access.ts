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

export type CinemaContextValue = number | string | null | undefined;

export function ensurePayrollTypeAdmin(user: AuthUser) {
  if (user.role === 'MASTER') return;
  if (user.role === 'ADMIN') return;

  throw new ForbiddenException('Ingen adgang');
}

function parsePayrollTypeCinemaId(value: CinemaContextValue) {
  const cinemaId = Number(value);

  if (!Number.isFinite(cinemaId) || cinemaId <= 0) {
    return null;
  }

  return cinemaId;
}

export function getRequiredPayrollTypeCinemaId(
  user: AuthUser,
  selectedCinemaId?: CinemaContextValue,
) {
  if (user.role === 'MASTER') {
    const cinemaId = parsePayrollTypeCinemaId(selectedCinemaId);

    if (!cinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer lønarter.',
      );
    }

    return cinemaId;
  }

  const cinemaId = parsePayrollTypeCinemaId(user.cinemaId);

  if (!cinemaId) {
    throw new BadRequestException('Brugeren mangler biograf.');
  }

  return cinemaId;
}
