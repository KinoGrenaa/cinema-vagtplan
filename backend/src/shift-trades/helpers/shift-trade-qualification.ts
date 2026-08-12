import {
  ForbiddenException,
} from '@nestjs/common';
import type {
  Prisma,
} from '@prisma/client';

export async function ensureShiftTradeUserQualified(
  prisma:
    Prisma.TransactionClient,
  params: {
    cinemaId: number;
    userId: number;
    jobFunctionId: number;
  },
) {
  const qualification =
    await prisma.userJobFunction.findFirst({
      where: {
        cinemaId:
          params.cinemaId,
        userId:
          params.userId,
        jobFunctionId:
          params.jobFunctionId,
      },
      select: {
        id: true,
      },
    });

  if (!qualification) {
    throw new ForbiddenException(
      'Du er ikke kvalificeret til denne jobfunktion',
    );
  }
}
