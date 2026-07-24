import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CreateStaffingRequestInput,
} from './staffing-request-helpers';

export type StaffingRequestShift = {
  id: number;
  cinemaId: number;
  userId: number | null;
  workTypeId: number;
  startTime: Date;
  endTime: Date;
  note: string | null;
  user?: unknown;
  workType?: unknown;
};

type EnsureStaffingRequestTargetUserExistsParams = {
  prisma: PrismaService;
  cinemaId: number;
  targetUserId?: number | null;
};

type ResolveStaffingRequestShiftParams = {
  prisma: PrismaService;
  cinemaId: number;
  shiftId?: number | null;
};

type ResolveStaffingRequestWorkTypeIdParams = {
  prisma: PrismaService;
  cinemaId: number;
  dto: CreateStaffingRequestInput;
  shift: StaffingRequestShift | null;
};

function getActiveCinemaUserFilter(
  userId: number,
  cinemaId: number,
) {
  return {
    id: userId,
    isActive: true,
    cinemaMemberships: {
      some: {
        cinemaId,
        isActive: true,
      },
    },
  };
}

export async function ensureStaffingRequestActorAccess({
  prisma,
  user,
  cinemaId,
}: {
  prisma: PrismaService;
  user: AuthUser;
  cinemaId: number;
}) {
  if (user.role === 'MASTER') {
    return;
  }

  const actor = await prisma.user.findFirst({
    where: getActiveCinemaUserFilter(
      user.sub,
      cinemaId,
    ),
    select: {
      id: true,
    },
  });

  if (!actor) {
    throw new ForbiddenException(
      'Du er ikke aktivt tilknyttet denne biograf',
    );
  }
}

export async function ensureStaffingRequestTargetUserExists({
  prisma,
  cinemaId,
  targetUserId,
}: EnsureStaffingRequestTargetUserExistsParams) {
  if (!targetUserId) {
    return;
  }

  const targetUser =
    await prisma.user.findFirst({
      where: getActiveCinemaUserFilter(
        targetUserId,
        cinemaId,
      ),
      select: {
        id: true,
      },
    });

  if (!targetUser) {
    throw new NotFoundException(
      'Medarbejderen blev ikke fundet i den aktive biograf',
    );
  }
}

export async function resolveStaffingRequestShift({
  prisma,
  cinemaId,
  shiftId,
}: ResolveStaffingRequestShiftParams):
  Promise<StaffingRequestShift | null> {
  const shift = shiftId
    ? await prisma.shift.findFirst({
        where: {
          id: shiftId,
          cinemaId,
        },
        include: {
          user: true,
          workType: true,
        },
      })
    : null;

  if (shiftId && !shift) {
    throw new NotFoundException(
      'Vagt blev ikke fundet',
    );
  }

  return shift;
}

export async function resolveStaffingRequestWorkTypeId({
  prisma,
  cinemaId,
  dto,
  shift,
}: ResolveStaffingRequestWorkTypeIdParams):
  Promise<number> {
  const requestedWorkTypeId =
    shift?.workTypeId ??
    dto.workTypeId ??
    null;

  if (!requestedWorkTypeId) {
    throw new BadRequestException(
      'Vælg jobfunktion for bemandingsbehovet.',
    );
  }

  const workType =
    await prisma.workType.findFirst({
      where: {
        id: requestedWorkTypeId,
        cinemaId,
      },
    });

  if (!workType) {
    throw new NotFoundException(
      'Jobfunktionen blev ikke fundet',
    );
  }

  return requestedWorkTypeId;
}
