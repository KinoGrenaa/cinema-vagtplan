import {
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  PrismaService,
} from "../../prisma/prisma.service";
import {
  AuthUser,
  getRequiredPositiveShiftId,
} from "./shift-service-helpers";

type ShiftUserAccessPrismaClient = Pick<
  PrismaService,
  "user" | "cinema"
>;

export async function ensureShiftActorHasCinemaAccess(
  prisma: ShiftUserAccessPrismaClient,
  user: AuthUser,
  cinemaIdValue: number,
) {
  const actorUserId =
    getRequiredPositiveShiftId(
      user?.sub,
      "Brugeren kunne ikke identificeres",
    );
  const cinemaId =
    getRequiredPositiveShiftId(
      cinemaIdValue,
      "Biograf skal være et gyldigt ID",
    );

  const actor =
    await prisma.user.findUnique({
      where: {
        id: actorUserId,
      },
      select: {
        id: true,
        role: true,
        isActive: true,
        cinemaMemberships: {
          where: {
            cinemaId,
            isActive: true,
          },
          select: {
            role: true,
          },
          take: 1,
        },
      },
    });

  if (!actor || !actor.isActive) {
    throw new ForbiddenException(
      "Din session er ikke længere gyldig.\nLog ind igen.",
    );
  }

  if (user.role === "MASTER") {
    if (actor.role !== "MASTER") {
      throw new ForbiddenException(
        "Din session er ikke længere gyldig.\nLog ind igen.",
      );
    }

    const cinema =
      await prisma.cinema.findUnique({
        where: {
          id: cinemaId,
        },
        select: {
          id: true,
        },
      });

    if (!cinema) {
      throw new NotFoundException(
        "Biografen blev ikke fundet",
      );
    }

    return;
  }

  const membership =
    actor.cinemaMemberships[0];

  if (
    !membership ||
    membership.role !== user.role
  ) {
    throw new ForbiddenException(
      "Du er ikke længere aktivt tilknyttet denne biograf",
    );
  }
}

export async function ensureShiftUserHasCinemaAccess(
  prisma: ShiftUserAccessPrismaClient,
  userIdValue: number,
  cinemaIdValue: number,
) {
  const userId =
    getRequiredPositiveShiftId(
      userIdValue,
      "Medarbejder skal være et gyldigt ID",
    );
  const cinemaId =
    getRequiredPositiveShiftId(
      cinemaIdValue,
      "Biograf skal være et gyldigt ID",
    );

  const shiftUser =
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

  if (!shiftUser) {
    throw new ForbiddenException(
      "Medarbejderen er ikke aktivt tilknyttet denne biograf",
    );
  }
}
