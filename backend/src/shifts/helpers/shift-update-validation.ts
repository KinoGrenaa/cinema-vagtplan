import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { checkShiftConflicts } from './shift-conflict-checks';
import { NormalizedShiftWriteData } from './shift-input';
import { shiftResponseInclude } from './shift-service-helpers';
import { ensureShiftUserHasCinemaAccess } from './shift-user-access';

type ShiftUpdatePrismaClient = Pick<
  PrismaService,
  'shift' | 'jobFunction' | 'userJobFunction' | 'user' | 'cinema' | 'leaveRequest'
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
      where: { id, cinemaId },
      include: shiftResponseInclude,
    }));
  if (!existingShift) throw new NotFoundException('Vagten blev ikke fundet');

  const jobFunction = await prisma.jobFunction.findFirst({
    where: { id: data.jobFunctionId, cinemaId, isActive: true },
    select: { id: true, name: true, color: true },
  });
  if (!jobFunction) {
    throw new ForbiddenException(
      'Jobfunktionen findes ikke eller er inaktiv i denne biograf',
    );
  }

  if (data.userId) {
    await ensureShiftUserHasCinemaAccess(prisma, data.userId, cinemaId);
    const qualification = await prisma.userJobFunction.findFirst({
      where: {
        cinemaId,
        userId: data.userId,
        jobFunctionId: jobFunction.id,
      },
      select: { id: true },
    });
    if (!qualification) {
      throw new ForbiddenException(
        'Medarbejderen er ikke kvalificeret til denne jobfunktion.',
      );
    }
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
    jobFunction,
  };
}
