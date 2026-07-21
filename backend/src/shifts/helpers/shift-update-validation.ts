import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { checkShiftConflicts } from './shift-conflict-checks';
import {
  NormalizedShiftWriteData,
} from './shift-input';
import {
  shiftResponseInclude,
} from './shift-service-helpers';
import {
  ensureShiftUserHasCinemaAccess,
} from './shift-user-access';

type ShiftUpdatePrismaClient = Pick<
  PrismaService,
  'shift' | 'workType' | 'user' | 'cinema' | 'leaveRequest'
>;

export async function getShiftUpdateContext({
  prisma,
  cinemaId,
  id,
  data,
  oldShift,
}: {
  prisma: ShiftUpdatePrismaClient;
  cinemaId: number;
  id: number;
  data: NormalizedShiftWriteData;
  oldShift?: any;
}) {
  const existingShift =
    oldShift ??
    (await prisma.shift.findFirst({
      where: {
        id,
        cinemaId,
      },
      include: shiftResponseInclude,
    }));

  if (!existingShift) {
    throw new NotFoundException(
      'Vagten blev ikke fundet',
    );
  }

  const workType =
    await prisma.workType.findFirst({
      where: {
        id: data.workTypeId,
        cinemaId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

  if (!workType) {
    throw new ForbiddenException(
      'Vagttypen findes ikke eller er inaktiv i denne biograf',
    );
  }

  if (data.userId) {
    await ensureShiftUserHasCinemaAccess(
      prisma,
      data.userId,
      cinemaId,
    );
    await checkShiftConflicts(prisma, {
      startTime: data.startTime,
      endTime: data.endTime,
      userId: data.userId,
      cinemaId,
      ignoreShiftId: id,
    });
  }

  return {
    oldShift: existingShift,
    assignedUserId: data.userId,
    startTime: data.startTime,
    endTime: data.endTime,
  };
}
