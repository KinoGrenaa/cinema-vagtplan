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
  jobFunctionId: number;
  jobFunctionNameSnapshot: string;
  jobFunctionColorSnapshot: string;
  startTime: Date;
  endTime: Date;
  note: string | null;
  user?: unknown;
  jobFunction?: unknown;
};

function getActiveCinemaUserFilter(userId: number, cinemaId: number) {
  return {
    id: userId,
    isActive: true,
    cinemaMemberships: {
      some: { cinemaId, isActive: true },
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
  if (user.role === 'MASTER') return;
  const actor = await prisma.user.findFirst({
    where: getActiveCinemaUserFilter(user.sub, cinemaId),
    select: { id: true },
  });
  if (!actor) {
    throw new ForbiddenException('Du er ikke aktivt tilknyttet denne biograf');
  }
}

export async function ensureStaffingRequestTargetUserExists({
  prisma,
  cinemaId,
  targetUserId,
}: {
  prisma: PrismaService;
  cinemaId: number;
  targetUserId?: number | null;
}) {
  if (!targetUserId) return;
  const targetUser = await prisma.user.findFirst({
    where: getActiveCinemaUserFilter(targetUserId, cinemaId),
    select: { id: true },
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
}: {
  prisma: PrismaService;
  cinemaId: number;
  shiftId?: number | null;
}): Promise<StaffingRequestShift | null> {
  const shift = shiftId
    ? await prisma.shift.findFirst({
        where: { id: shiftId, cinemaId },
        include: { user: true, jobFunction: true },
      })
    : null;
  if (shiftId && !shift) throw new NotFoundException('Vagt blev ikke fundet');
  return shift;
}

export async function resolveStaffingRequestJobFunction({
  prisma,
  cinemaId,
  dto,
  shift,
}: {
  prisma: PrismaService;
  cinemaId: number;
  dto: CreateStaffingRequestInput;
  shift: StaffingRequestShift | null;
}) {
  const requestedJobFunctionId = shift?.jobFunctionId ?? dto.jobFunctionId ?? null;
  if (!requestedJobFunctionId) {
    throw new BadRequestException('Vælg jobfunktion for bemandingsbehovet.');
  }

  const jobFunction = await prisma.jobFunction.findFirst({
    where: { id: requestedJobFunctionId, cinemaId, isActive: true },
    select: { id: true, name: true, color: true },
  });
  if (!jobFunction) {
    throw new NotFoundException('Jobfunktionen blev ikke fundet');
  }
  return jobFunction;
}
