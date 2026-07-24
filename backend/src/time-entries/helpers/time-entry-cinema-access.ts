import {
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  PrismaService,
} from "../../prisma/prisma.service";

export type TimeEntryActor = {
  sub?: number;
  id?: number;
  role?: string;
  cinemaId?: number | null;
};

function getPositiveId(value: unknown) {
  const parsed = Number(value);

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : null;
}

export function getTimeEntryActorUserId(
  user: TimeEntryActor,
) {
  const userId = getPositiveId(
    user?.sub ?? user?.id,
  );

  if (!userId) {
    throw new ForbiddenException(
      "Ugyldig bruger.",
    );
  }

  return userId;
}

export async function resolveTimeEntryActorCinemaId(
  prisma: PrismaService,
  user: TimeEntryActor,
  requestedCinemaId?: number | null,
) {
  const actorUserId =
    getTimeEntryActorUserId(user);
  const parsedRequestedCinemaId =
    getPositiveId(requestedCinemaId);

  if (user?.role === "MASTER") {
    if (!parsedRequestedCinemaId) {
      throw new ForbiddenException(
        "MASTER skal vælge en biograf.",
      );
    }

    const cinema =
      await prisma.cinema.findUnique({
        where: {
          id: parsedRequestedCinemaId,
        },
        select: {
          id: true,
        },
      });

    if (!cinema) {
      throw new NotFoundException(
        "Biograf blev ikke fundet.",
      );
    }

    return parsedRequestedCinemaId;
  }

  const sessionCinemaId =
    getPositiveId(user?.cinemaId);

  if (!sessionCinemaId) {
    throw new ForbiddenException(
      "Brugeren er ikke tilknyttet en aktiv biograf.",
    );
  }

  if (
    parsedRequestedCinemaId &&
    parsedRequestedCinemaId !==
      sessionCinemaId
  ) {
    throw new ForbiddenException(
      "Du har ikke adgang til denne biograf.",
    );
  }

  const actor =
    await prisma.user.findFirst({
      where: {
        id: actorUserId,
        isActive: true,
        cinemaMemberships: {
          some: {
            cinemaId: sessionCinemaId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        cinemaMemberships: {
          where: {
            cinemaId: sessionCinemaId,
            isActive: true,
          },
          select: {
            role: true,
          },
          take: 1,
        },
      },
    });

  const membership =
    actor?.cinemaMemberships[0];

  if (
    !actor ||
    !membership ||
    membership.role !== user?.role
  ) {
    throw new ForbiddenException(
      "Du er ikke længere aktivt tilknyttet denne biograf.",
    );
  }

  return sessionCinemaId;
}

export async function ensureTimeEntryTargetUserAccess(
  prisma: PrismaService,
  userId: number,
  cinemaId: number,
) {
  const targetUser =
    await prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        cinemaMemberships: {
          some: {
            cinemaId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
      },
    });

  if (!targetUser) {
    throw new NotFoundException(
      "Brugeren blev ikke fundet i den aktive biograf.",
    );
  }

  return targetUser;
}
