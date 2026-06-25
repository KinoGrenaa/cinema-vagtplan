import { BadRequestException } from '@nestjs/common';

export type AuthUser = {
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

export function resolveShiftTradeCinemaId(
  user: AuthUser | null | undefined,
  selectedCinemaId?: number | null,
) {
  if (user?.role === 'MASTER') {
    if (!selectedCinemaId || !Number.isFinite(selectedCinemaId)) {
      throw new BadRequestException('Vælg en aktiv biograf først.');
    }

    return selectedCinemaId;
  }

  if (!user?.cinemaId) {
    throw new BadRequestException('Brugeren er ikke tilknyttet en biograf.');
  }

  return user.cinemaId;
}

export function getShiftTradeCinemaFilter(
  user: AuthUser | null | undefined,
  selectedCinemaId?: number | null,
) {
  return {
    cinemaId: resolveShiftTradeCinemaId(user, selectedCinemaId),
  };
}
