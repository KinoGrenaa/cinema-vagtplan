import { BadRequestException, ForbiddenException } from '@nestjs/common';

export type PayrollAuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
  canManagePayroll?: boolean;
};

export function ensurePayrollAccess(user: PayrollAuthUser) {
  if (user.role === 'MASTER') return;
  if (user.role === 'ADMIN') return;
  if (user.canManagePayroll) return;

  throw new ForbiddenException('Du har ikke adgang til løndata');
}

export function ensurePayrollExportAccess(user: PayrollAuthUser) {
  if (user.role === 'MASTER') return;
  if (user.role === 'ADMIN') return;
  if (user.canManagePayroll) return;

  throw new ForbiddenException('Du har ikke adgang til eksport');
}

export function ensurePayrollAdminOrMaster(user: PayrollAuthUser) {
  if (user.role !== 'MASTER' && user.role !== 'ADMIN') {
    throw new ForbiddenException('Kun ADMIN eller MASTER kan låse op igen');
  }
}

export function getPayrollCinemaFilter(
  user: PayrollAuthUser,
  selectedCinemaId?: number | null,
) {
  if (user.role === 'MASTER') {
    if (!selectedCinemaId || !Number.isFinite(selectedCinemaId)) {
      throw new BadRequestException('Vælg en aktiv biograf først.');
    }

    return { cinemaId: selectedCinemaId };
  }

  if (!user.cinemaId) {
    throw new BadRequestException('Brugeren er ikke tilknyttet en biograf.');
  }

  return { cinemaId: user.cinemaId };
}
