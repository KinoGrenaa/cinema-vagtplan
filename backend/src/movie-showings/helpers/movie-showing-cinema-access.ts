import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export type MovieShowingsRequestUser = {
  sub?: number | string;
  id?: number | string;
  role?: string;
  cinemaId?: number | string | null;
};

function parsePositiveInteger(
  value: number | string | null | undefined,
) {
  const numericValue = Number(value);

  if (
    !Number.isInteger(numericValue) ||
    numericValue <= 0
  ) {
    return null;
  }

  return numericValue;
}

export async function resolveMovieShowingsCinemaId(
  prisma: PrismaService,
  user: MovieShowingsRequestUser,
  selectedCinemaId?: number | null,
) {
  const userId = parsePositiveInteger(
    user.sub ?? user.id,
  );
  const selectedCinema = parsePositiveInteger(
    selectedCinemaId,
  );

  if (!userId) {
    throw new ForbiddenException(
      'Brugeren kunne ikke identificeres.',
    );
  }

  if (
    selectedCinemaId !== undefined &&
    selectedCinemaId !== null &&
    !selectedCinema
  ) {
    throw new BadRequestException(
      'Ugyldigt biografvalg.',
    );
  }

  if (user.role === 'MASTER') {
    if (!selectedCinema) {
      throw new BadRequestException(
        'Biograf skal vælges.',
      );
    }

    const [activeMaster, cinema] =
      await Promise.all([
        prisma.user.findFirst({
          where: {
            id: userId,
            role: 'MASTER',
            isActive: true,
          },
          select: {
            id: true,
          },
        }),
        prisma.cinema.findUnique({
          where: {
            id: selectedCinema,
          },
          select: {
            id: true,
          },
        }),
      ]);

    if (!activeMaster) {
      throw new ForbiddenException(
        'Din session er ikke længere gyldig. Log ind igen.',
      );
    }

    if (!cinema) {
      throw new NotFoundException(
        'Biografen blev ikke fundet.',
      );
    }

    return selectedCinema;
  }

  const sessionCinemaId = parsePositiveInteger(
    user.cinemaId,
  );

  if (!sessionCinemaId) {
    throw new ForbiddenException(
      'Brugeren er ikke tilknyttet en aktiv biograf.',
    );
  }

  if (
    selectedCinema &&
    selectedCinema !== sessionCinemaId
  ) {
    throw new ForbiddenException(
      'Du har ikke adgang til denne biograf.',
    );
  }

  const activeUser = await prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      role: {
        not: 'MASTER',
      },
      OR: [
        {
          cinemaId: sessionCinemaId,
        },
        {
          cinemaMemberships: {
            some: {
              cinemaId: sessionCinemaId,
              isActive: true,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (
    !activeUser ||
    activeUser.role !== user.role
  ) {
    throw new ForbiddenException(
      'Du er ikke længere aktivt tilknyttet denne biograf.',
    );
  }

  return sessionCinemaId;
}
