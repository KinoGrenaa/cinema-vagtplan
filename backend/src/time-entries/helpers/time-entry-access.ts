import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

export function getTimeEntryCinemaFilter(
  user: any,
  selectedCinemaId?: number | null,
) {
  if (!user) {
    throw new BadRequestException('Mangler brugeroplysninger.');
  }

  if (user.role === 'MASTER') {
    if (
      !selectedCinemaId ||
      !Number.isFinite(selectedCinemaId)
    ) {
      throw new BadRequestException(
        'Vælg en aktiv biograf først.',
      );
    }

    return {
      cinemaId: selectedCinemaId,
    };
  }

  if (!user.cinemaId) {
    throw new BadRequestException(
      'Brugeren er ikke tilknyttet en biograf.',
    );
  }

  return {
    cinemaId: user.cinemaId,
  };
}

export function ensureUserCanAccessTimeEntry(
  user: any,
  entry: {
    cinemaId: number;
  },
  selectedCinemaId?: number | null,
) {
  const cinemaFilter = getTimeEntryCinemaFilter(
    user,
    selectedCinemaId,
  );

  if (entry.cinemaId !== cinemaFilter.cinemaId) {
    throw new NotFoundException(
      'Tidsregistrering blev ikke fundet',
    );
  }
}

export function ensureTimeEntryEditable(
  entry: any,
  user?: any,
) {
  if (entry.status === 'VOIDED') {
    throw new BadRequestException(
      'En afvist tidsregistrering kan ikke redigeres.',
    );
  }

  if (!entry.payrollLocked) {
    return;
  }

  const payrollPeriodStatus =
    entry.payrollPeriod?.status ?? null;
  const isPayrollAdministrator =
    user?.role === 'MASTER' || user?.role === 'ADMIN';

  if (
    payrollPeriodStatus === 'EXPORTED' &&
    isPayrollAdministrator
  ) {
    return;
  }

  if (payrollPeriodStatus === 'LOCKED') {
    throw new BadRequestException(
      'Lønperioden er låst. Genåbn lønperioden, før tidsregistreringen ændres.',
    );
  }

  throw new BadRequestException(
    'Denne tidsregistrering er låst, fordi den allerede indgår i en låst eller eksporteret lønperiode.',
  );
}
