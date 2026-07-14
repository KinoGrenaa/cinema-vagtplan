import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export type MessageActor = {
  sub?: number;
  id?: number;
  role?: string;
  cinemaId?: number | null;
};

function parsePositiveId(
  value: unknown,
  message: string,
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(message);
  }

  return parsed;
}

function parseOptionalPositiveId(
  value: unknown,
  message: string,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  return parsePositiveId(value, message);
}

export async function resolveMessageActorContext(
  prisma: PrismaService,
  actor: MessageActor,
  selectedCinemaId?: number | null,
) {
  const userId = parsePositiveId(
    actor?.sub ?? actor?.id,
    'Bruger skal være et gyldigt ID',
  );
  const requestedCinemaId = parseOptionalPositiveId(
    selectedCinemaId,
    'Biograf skal være et gyldigt ID',
  );

  if (actor?.role === 'MASTER') {
    if (!requestedCinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du bruger beskeder.',
      );
    }

    const master = await prisma.user.findFirst({
      where: {
        id: userId,
        role: 'MASTER',
        isActive: true,
      },
      select: {
        id: true,
        role: true,
        canSendBroadcastMessages: true,
      },
    });

    if (!master) {
      throw new ForbiddenException(
        'Du har ikke adgang til beskeder.',
      );
    }

    const cinema = await prisma.cinema.findUnique({
      where: {
        id: requestedCinemaId,
      },
      select: {
        id: true,
      },
    });

    if (!cinema) {
      throw new NotFoundException(
        'Biograf blev ikke fundet.',
      );
    }

    return {
      userId,
      cinemaId: requestedCinemaId,
      role: master.role,
      canSendBroadcastMessages:
        master.canSendBroadcastMessages,
    };
  }

  const sessionCinemaId = parseOptionalPositiveId(
    actor?.cinemaId,
    'Brugerens biograf skal være et gyldigt ID',
  );

  if (!sessionCinemaId) {
    throw new BadRequestException(
      'Vælg en biograf, før du bruger beskeder.',
    );
  }

  if (
    requestedCinemaId &&
    requestedCinemaId !== sessionCinemaId
  ) {
    throw new ForbiddenException(
      'Du har ikke adgang til denne biografs beskeder.',
    );
  }

  const user = await prisma.user.findFirst({
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
      canSendBroadcastMessages: true,
    },
  });

  if (!user) {
    throw new ForbiddenException(
      'Du er ikke længere aktivt tilknyttet denne biograf.',
    );
  }

  return {
    userId,
    cinemaId: sessionCinemaId,
    role: user.role,
    canSendBroadcastMessages:
      user.canSendBroadcastMessages,
  };
}

export function getActiveMessageReceiverWhere(
  receiverId: number,
  cinemaId: number,
) {
  return {
    id: receiverId,
    isActive: true,
    role: {
      not: 'MASTER' as const,
    },
    OR: [
      {
        cinemaId,
      },
      {
        cinemaMemberships: {
          some: {
            cinemaId,
            isActive: true,
          },
        },
      },
    ],
  };
}
