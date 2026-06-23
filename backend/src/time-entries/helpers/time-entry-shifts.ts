import { PrismaService } from '../../prisma/prisma.service';
import { getCinemaDeviationSelect } from './time-entry-deviation';

const SHIFT_MATCH_BEFORE_MINUTES = 120;
const SHIFT_MATCH_AFTER_MINUTES = 240;

export async function findMatchingShiftForClockIn(
  prisma: PrismaService,
  data: {
    userId: number;
    cinemaId: number;
    clockIn: Date;
  },
) {
  const from = new Date(
    data.clockIn.getTime() - SHIFT_MATCH_BEFORE_MINUTES * 60000,
  );
  const to = new Date(
    data.clockIn.getTime() + SHIFT_MATCH_AFTER_MINUTES * 60000,
  );

  return prisma.shift.findFirst({
    where: {
      userId: data.userId,
      cinemaId: data.cinemaId,
      startTime: {
        lte: to,
      },
      endTime: {
        gte: from,
      },
    },
    include: {
      workType: true,
      cinema: {
        select: getCinemaDeviationSelect(),
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  });
}
