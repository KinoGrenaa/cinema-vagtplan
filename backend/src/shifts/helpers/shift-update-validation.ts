import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  ShiftWriteData,
  getShiftCinemaFilter,
  validateShiftTimes,
} from './shift-service-helpers';
import { checkShiftConflicts } from './shift-conflict-checks';
import { ensureShiftUserHasCinemaAccess } from './shift-user-access';

export async function getShiftUpdateContext({
  prisma,
  user,
  id,
  data,
}: {
  prisma: PrismaService;
  user: AuthUser;
  id: number;
  data: ShiftWriteData;
}) {
  const oldShift = await prisma.shift.findFirst({
    where: {
      id,
      ...getShiftCinemaFilter(user, data.cinemaId),
    },
    include: {
      user: true,
      workType: true,
    },
  });

  if (!oldShift) {
    throw new NotFoundException(
      'Vagten blev ikke fundet',
    );
  }

  const cinemaId = oldShift.cinemaId;
  const assignedUserId = data.userId ?? null;

  const workType = await prisma.workType.findFirst({
    where: {
      id: data.workTypeId,
      cinemaId,
    },
  });

  if (!workType) {
    throw new ForbiddenException(
      'Vagttypen findes ikke i denne biograf',
    );
  }

  if (assignedUserId) {
    await ensureShiftUserHasCinemaAccess(
      prisma,
      assignedUserId,
      cinemaId,
    );
  }

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  validateShiftTimes(startTime, endTime);

  if (assignedUserId) {
    await checkShiftConflicts(prisma, {
      startTime,
      endTime,
      userId: assignedUserId,
      cinemaId,
      ignoreShiftId: id,
    });
  }

  return {
    oldShift,
    assignedUserId,
    startTime,
    endTime,
  };
}
