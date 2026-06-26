import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

type StaffingRequestAcceptCandidate = {
  cinemaId: number;
  shiftId: number | null;
  requestStartTime: Date | null;
  requestEndTime: Date | null;
};

export async function assertNoStaffingRequestAcceptConflicts(
  prisma: PrismaService,
  request: StaffingRequestAcceptCandidate,
  userId: number,
) {
  const requestShift = request.shiftId
    ? await prisma.shift.findFirst({
        where: {
          id: request.shiftId,
          cinemaId: request.cinemaId,
        },
        select: {
          id: true,
          userId: true,
          startTime: true,
          endTime: true,
        },
      })
    : null;

  if (request.shiftId && !requestShift) {
    throw new NotFoundException('Vagt blev ikke fundet');
  }

  if (requestShift?.userId && requestShift.userId !== userId) {
    throw new BadRequestException(
      'Vagten er allerede tildelt en anden medarbejder.',
    );
  }

  const startTime = requestShift?.startTime ?? request.requestStartTime;
  const endTime = requestShift?.endTime ?? request.requestEndTime;

  if (!startTime || !endTime) {
    throw new BadRequestException(
      'Bemandingsforespørgslen mangler et gyldigt tidsinterval.',
    );
  }

  const overlappingShift = await prisma.shift.findFirst({
    where: {
      cinemaId: request.cinemaId,
      userId,
      id: requestShift
        ? {
            not: requestShift.id,
          }
        : undefined,
      startTime: {
        lt: endTime,
      },
      endTime: {
        gt: startTime,
      },
    },
    select: {
      id: true,
    },
  });

  if (overlappingShift) {
    throw new BadRequestException('Du har allerede en vagt i det tidsrum.');
  }
}
