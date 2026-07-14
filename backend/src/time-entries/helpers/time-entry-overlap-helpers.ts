import { BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export type TimeEntryRange = {
  userId: number;
  cinemaId: number;
  clockIn: Date;
  clockOut: Date;
};

export async function ensureNoOverlappingManualTimeEntry(
  prisma: PrismaService,
  range: TimeEntryRange,
) {
  const overlappingTimeEntry =
    await prisma.timeEntry.findFirst({
      where: {
        userId: range.userId,
        status: {
          not: 'VOIDED',
        },
        AND: [
          {
            clockIn: {
              lt: range.clockOut,
            },
          },
          {
            OR: [
              {
                clockOut: {
                  gt: range.clockIn,
                },
              },
              {
                clockOut: null,
              },
            ],
          },
        ],
      },
    });

  if (overlappingTimeEntry) {
    throw new BadRequestException(
      'Der findes allerede en tidsregistrering i dette tidsrum',
    );
  }
}

export async function ensureNoOverlappingManualShift(
  prisma: PrismaService,
  range: TimeEntryRange,
) {
  const overlappingShift = await prisma.shift.findFirst({
    where: {
      userId: range.userId,
      startTime: {
        lt: range.clockOut,
      },
      endTime: {
        gt: range.clockIn,
      },
    },
  });

  if (overlappingShift) {
    throw new BadRequestException(
      'Du har allerede en planlagt vagt i dette tidsrum.\nRegistrer tid på vagten i stedet.',
    );
  }
}
