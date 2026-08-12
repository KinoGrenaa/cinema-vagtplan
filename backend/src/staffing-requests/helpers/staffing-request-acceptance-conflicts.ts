import {
  BadRequestException,
} from '@nestjs/common';

import type { Prisma } from '@prisma/client';
import { checkShiftConflicts } from '../../shifts/helpers/shift-conflict-checks';

type StaffingRequestAcceptCandidate = {
  cinemaId: number;
  shiftId: number | null;
  requestStartTime: Date | null;
  requestEndTime: Date | null;
};

export async function assertNoStaffingRequestAcceptConflicts(
  prisma: Pick<Prisma.TransactionClient, 'shift' | 'leaveRequest'>,
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
    throw new BadRequestException(
      'Bemandingsforespørgslen er ikke længere aktuel',
    );
  }

  if (
    requestShift?.userId &&
    requestShift.userId !== userId
  ) {
    throw new BadRequestException(
      'Vagten er allerede tildelt en anden medarbejder.',
    );
  }

  const startTime =
    requestShift?.startTime ?? request.requestStartTime;
  const endTime =
    requestShift?.endTime ?? request.requestEndTime;

  if (!startTime || !endTime) {
    throw new BadRequestException(
      'Bemandingsforespørgslen mangler et gyldigt tidsinterval.',
    );
  }

  await checkShiftConflicts(prisma, {
    cinemaId: request.cinemaId,
    userId,
    startTime,
    endTime,
    ignoreShiftId: requestShift?.id,
  });
}
