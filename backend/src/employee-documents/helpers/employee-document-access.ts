import { BadRequestException, ForbiddenException } from '@nestjs/common';

export type AuthUser = {
  sub: number;
  email?: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

export function resolveEmployeeDocumentCinemaId(
  user: AuthUser,
  selectedCinemaId?: number | null,
) {
  if (user.role === 'MASTER') {
    if (!selectedCinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer medarbejderdokumenter.',
      );
    }

    return selectedCinemaId;
  }

  if (!user.cinemaId) {
    throw new ForbiddenException('Din bruger er ikke tilknyttet en biograf');
  }

  return user.cinemaId;
}
