import { BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { getShiftWithWorkTypeAndCinemaInclude } from './time-entry-includes';
import { findMatchingShiftForClockIn } from './time-entry-shifts';

export async function findManualEntryShift(
  prisma: PrismaService,
  data: {
    shiftId?: number | null;
    cinemaId: number;
  },
) {
  if (!data.shiftId) {
    return null;
  }

  const shift = await prisma.shift.findFirst({
    where: {
      id: data.shiftId,
      cinemaId: data.cinemaId,
    },
    include: getShiftWithWorkTypeAndCinemaInclude(),
  });

  if (!shift) {
    throw new BadRequestException('Vagten blev ikke fundet');
  }

  return shift;
}

export function ensureShiftBelongsToUser(
  shift: { userId: number | null } | null,
  userId: number,
  message: string,
) {
  if (shift && shift.userId !== userId) {
    throw new BadRequestException(message);
  }
}

export async function ensureNoExistingEntryForShift(
  prisma: PrismaService,
  data: {
    shiftId?: number | null;
    userId: number;
    cinemaId: number;
    message: string;
  },
) {
  if (!data.shiftId) {
    return;
  }

  const existingEntry = await prisma.timeEntry.findFirst({
    where: {
      userId: data.userId,
      shiftId: data.shiftId,
      cinemaId: data.cinemaId,
    },
  });

  if (existingEntry) {
    throw new BadRequestException(data.message);
  }
}

export async function resolveClockInShift(
  prisma: PrismaService,
  data: {
    shiftId?: number | null;
    userId: number;
    cinemaId: number;
    clockIn: Date;
  },
) {
  if (!data.shiftId) {
    return findMatchingShiftForClockIn(prisma, {
      userId: data.userId,
      cinemaId: data.cinemaId,
      clockIn: data.clockIn,
    });
  }

  const shift = await prisma.shift.findFirst({
    where: {
      id: data.shiftId,
      cinemaId: data.cinemaId,
    },
    include: {
      workType: true,
    },
  });

  if (!shift) {
    throw new BadRequestException('Vagten blev ikke fundet');
  }

  ensureShiftBelongsToUser(
    shift,
    data.userId,
    'Du kan kun registrere mødetid på dine egne vagter',
  );

  return shift;
}
