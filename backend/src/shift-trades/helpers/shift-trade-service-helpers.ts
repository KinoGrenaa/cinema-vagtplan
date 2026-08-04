import { BadRequestException } from '@nestjs/common';

export type AuthUser = {
  sub?: number;
  id?: number;
  role?: string;
  cinemaId?: number | null;
};

export const shiftTradeParticipantSelect = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

export const shiftTradeInclude = {
  shift: {
    select: {
      id: true,
      startTime: true,
      endTime: true,
      userId: true,
      user: {
        select: shiftTradeParticipantSelect,
      },
      jobFunction: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      jobFunctionNameSnapshot: true,
      jobFunctionColorSnapshot: true,
    },
  },
  offeredByUser: {
    select: shiftTradeParticipantSelect,
  },
  targetUser: {
    select: shiftTradeParticipantSelect,
  },
  acceptedByUser: {
    select: shiftTradeParticipantSelect,
  },
  rejectedByUser: {
    select: shiftTradeParticipantSelect,
  },
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
