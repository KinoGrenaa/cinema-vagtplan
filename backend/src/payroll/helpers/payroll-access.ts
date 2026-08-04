import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

export type PayrollAuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
  canManagePayroll?: boolean;
  canManageCinemaSettings?: boolean;
};

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export function ensurePayrollAccess(user: PayrollAuthUser) {
  if (user.role === 'MASTER') return;
  if (user.canManagePayroll) return;

  throw new ForbiddenException('Du har ikke adgang til løndata');
}

export function ensurePayrollExportAccess(user: PayrollAuthUser) {
  if (user.role === 'MASTER') return;
  if (user.canManagePayroll) return;

  throw new ForbiddenException('Du har ikke adgang til eksport');
}

export function ensurePayrollAdminOrMaster(
  user: PayrollAuthUser,
) {
  if (user.role !== 'MASTER' && user.role !== 'ADMIN') {
    throw new ForbiddenException(
      'Kun ADMIN eller MASTER kan låse op igen',
    );
  }
}

export function getPayrollCinemaFilter(
  user: PayrollAuthUser,
  selectedCinemaId?: number | null,
) {
  if (user.role === 'MASTER') {
    if (!isPositiveSafeInteger(selectedCinemaId)) {
      throw new BadRequestException(
        'Vælg en aktiv biograf først.',
      );
    }

    return {
      cinemaId: selectedCinemaId,
    };
  }

  if (!isPositiveSafeInteger(user.cinemaId)) {
    throw new BadRequestException(
      'Brugeren er ikke tilknyttet en biograf.',
    );
  }

  return {
    cinemaId: user.cinemaId,
  };
}
