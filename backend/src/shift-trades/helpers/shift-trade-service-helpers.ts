import { BadRequestException } from '@nestjs/common';

export type AuthUser = {
  sub?: number;
  id?: number;
  role?: string;
  cinemaId?: number | null;
};

export const shiftTradeInclude = {
  shift: {
    include: {
      user: true,
      workType: true,
    },
  },
  offeredByUser: true,
  targetUser: true,
  acceptedByUser: true,
  rejectedByUser: true,
} as const;

function getPositiveId(
  value: unknown,
  errorMessage: string,
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(errorMessage);
  }

  return parsed;
}

export function resolveShiftTradeCinemaId(
  user: AuthUser | null | undefined,
  selectedCinemaId?: number | null,
) {
  if (user?.role === 'MASTER') {
    return getPositiveId(
      selectedCinemaId,
      'Vælg en aktiv biograf først.',
    );
  }

  const cinemaId = getPositiveId(
    user?.cinemaId,
    'Brugeren er ikke tilknyttet en biograf.',
  );

  if (
    selectedCinemaId !== undefined &&
    selectedCinemaId !== null &&
    getPositiveId(
      selectedCinemaId,
      'Biograf skal være et gyldigt ID.',
    ) !== cinemaId
  ) {
    throw new BadRequestException(
      'Du har ikke adgang til denne biograf.',
    );
  }

  return cinemaId;
}

export function getShiftTradeCinemaFilter(
  user: AuthUser | null | undefined,
  selectedCinemaId?: number | null,
) {
  return {
    cinemaId: resolveShiftTradeCinemaId(
      user,
      selectedCinemaId,
    ),
  };
}
