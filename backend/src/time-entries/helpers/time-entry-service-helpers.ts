import { BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { getShiftWithWorkTypeAndCinemaInclude } from './time-entry-includes';
import { findMatchingShiftForClockIn } from './time-entry-shifts';

type TimeEntryRange = {
  userId: number;
  cinemaId: number;
  clockIn: Date;
  clockOut: Date;
};

type ManualEntryNotesInput = {
  note?: string;
  clockInNote?: string;
  clockOutNote?: string;
};

export function parseRequiredTimeEntryDate(
  value: string,
  invalidMessage: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(invalidMessage);
  }

  return date;
}

export function parseOptionalTimeEntryDate(
  value: string | null | undefined,
  invalidMessage: string,
) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(invalidMessage);
  }

  return date;
}

export function parseNullableTimeEntryDate(
  value: string | null | undefined,
  invalidMessage: string,
) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(invalidMessage);
  }

  return date;
}

export function ensureClockOutAfterClockIn(
  clockIn: Date,
  clockOut: Date | null | undefined,
) {
  if (clockOut && clockOut <= clockIn) {
    throw new BadRequestException('Fyraften skal være efter mødetid');
  }
}

export function getManualEntryNotes(data: ManualEntryNotesInput) {
  return {
    clockInNote: data.clockInNote ?? data.note ?? null,
    clockOutNote: data.clockOutNote ?? data.note ?? null,
  };
}

export function getTrimmedOptionalNote(value?: string | null) {
  return value?.trim() || null;
}

export function ensureRequiredText(
  value: string | null | undefined,
  message: string,
) {
  if (!value?.trim()) {
    throw new BadRequestException(message);
  }
}

export function getRequiredTrimmedNote(
  value: string | null | undefined,
  message: string,
) {
  const note = value?.trim();

  if (!note) {
    throw new BadRequestException(message);
  }

  return note;
}

export function buildCombinedClockOutNote(
  existingNote: string | null | undefined,
  clockOutNote: string | null | undefined,
) {
  return [existingNote, clockOutNote ? `Fyraften: ${clockOutNote}` : null]
    .filter((note): note is string => Boolean(note))
    .join('\n\n');
}

export async function ensureNoOverlappingManualTimeEntry(
  prisma: PrismaService,
  range: TimeEntryRange,
) {
  const overlappingTimeEntry = await prisma.timeEntry.findFirst({
    where: {
      userId: range.userId,
      cinemaId: range.cinemaId,
      status: {
        not: 'VOIDED',
      },
      clockOut: {
        not: null,
      },
      AND: [
        {
          clockIn: {
            lt: range.clockOut,
          },
        },
        {
          clockOut: {
            gt: range.clockIn,
          },
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
      cinemaId: range.cinemaId,
      AND: [
        {
          startTime: {
            lt: range.clockOut,
          },
        },
        {
          endTime: {
            gt: range.clockIn,
          },
        },
      ],
    },
  });

  if (overlappingShift) {
    throw new BadRequestException(
      'Du har allerede en planlagt vagt i dette tidsrum. Registrer tid på vagten i stedet.',
    );
  }
}

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
