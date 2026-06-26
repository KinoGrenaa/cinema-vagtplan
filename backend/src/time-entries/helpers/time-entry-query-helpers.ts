import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
  getTimeEntryWithCinemaShiftInclude,
  getTimeEntryWithUserCinemaShiftInclude,
} from './time-entry-includes';

const TIME_ENTRY_NOT_FOUND_MESSAGE = 'Tidsregistrering blev ikke fundet';

export async function findTimeEntryWithCinemaShiftOrThrow(
  prisma: PrismaService,
  id: number,
) {
  const entry = await prisma.timeEntry.findUnique({
    where: { id },
    include: getTimeEntryWithCinemaShiftInclude(),
  });

  if (!entry) {
    throw new NotFoundException(TIME_ENTRY_NOT_FOUND_MESSAGE);
  }

  return entry;
}

export async function findTimeEntryWithUserCinemaShiftOrThrow(
  prisma: PrismaService,
  id: number,
) {
  const entry = await prisma.timeEntry.findUnique({
    where: { id },
    include: getTimeEntryWithUserCinemaShiftInclude(),
  });

  if (!entry) {
    throw new NotFoundException(TIME_ENTRY_NOT_FOUND_MESSAGE);
  }

  return entry;
}

export async function findTimeEntryRevisionTargetOrThrow(
  prisma: PrismaService,
  id: number,
) {
  const entry = await prisma.timeEntry.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      cinemaId: true,
    },
  });

  if (!entry) {
    throw new NotFoundException(TIME_ENTRY_NOT_FOUND_MESSAGE);
  }

  return entry;
}
