import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getOptionalPositiveShiftId,
  getRequiredPositiveShiftId,
  validateShiftTimes,
} from './shift-service-helpers';

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
  validateShiftTimes(
    data.startTime,
    data.endTime,
  );
  const userId = getRequiredPositiveShiftId(
    data.userId,
    'Medarbejder skal være et gyldigt ID',
  );
  const cinemaId =
    getRequiredPositiveShiftId(
      data.cinemaId,
      'Biograf skal være et gyldigt ID',
    );
  const ignoreShiftId =
    getOptionalPositiveShiftId(
      data.ignoreShiftId,
      'Vagt skal være et gyldigt ID',
    );
  const overlappingShift =
    await prisma.shift.findFirst({
      where: {
        userId,
        id: ignoreShiftId
          ? {
              not: ignoreShiftId,
            }
          : undefined,
        startTime: {
          lt: data.endTime,
        },
        endTime: {
          gt: data.startTime,
        },
      },
      select: {
        id: true,
      },
    });

  if (overlappingShift) {
    throw new BadRequestException(
      'Medarbejderen har allerede en vagt i dette tidsrum',
    );
  }

  const leaveRequest =
    await prisma.leaveRequest.findFirst({
      where: {
        cinemaId,
        userId,
        status: 'APPROVED',
        startDate: {
          lt: data.endTime,
        },
        endDate: {
          gt: data.startTime,
        },
      },
      select: {
        id: true,
      },
    });

  if (leaveRequest) {
    throw new BadRequestException(
      'Medarbejderen har godkendt fri i dette tidsrum',
    );
  }
}
