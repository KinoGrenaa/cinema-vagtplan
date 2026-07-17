import { BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { validateShiftTimes } from './shift-service-helpers';

type ShiftConflictPrismaClient = Pick<
  PrismaService,
  'shift' | 'leaveRequest'
>;

export async function checkShiftConflicts(
  prisma: ShiftConflictPrismaClient,
  data: {
    startTime: Date;
    endTime: Date;
    userId: number;
    cinemaId: number;
    ignoreShiftId?: number;
  },
) {
  validateShiftTimes(data.startTime, data.endTime);

  const overlappingShift = await prisma.shift.findFirst({
    where: {
      userId: data.userId,
      id: data.ignoreShiftId
        ? {
            not: data.ignoreShiftId,
          }
        : undefined,
      startTime: {
        lt: data.endTime,
      },
      endTime: {
        gt: data.startTime,
      },
    },
  });

  if (overlappingShift) {
    throw new BadRequestException(
      'Medarbejderen har allerede en vagt i dette tidsrum',
    );
  }

  const leaveRequest = await prisma.leaveRequest.findFirst({
    where: {
      cinemaId: data.cinemaId,
      userId: data.userId,
      status: 'APPROVED',
      startDate: {
        lt: data.endTime,
      },
      endDate: {
        gt: data.startTime,
      },
    },
  });

  if (leaveRequest) {
    throw new BadRequestException(
      'Medarbejderen har godkendt fri i dette tidsrum',
    );
  }
}
