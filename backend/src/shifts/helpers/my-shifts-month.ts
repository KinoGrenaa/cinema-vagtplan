import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { getCopenhagenDayRange } from './shift-service-helpers';

export const myShiftSelect = {
  id: true,
  startTime: true,
  endTime: true,
  note: true,
  userId: true,
  workType: {
    select: {
      name: true,
      color: true,
    },
  },
} as const;

export function getCopenhagenMonthRange(value: unknown) {
  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Måned skal være i formatet YYYY-MM',
    );
  }

  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    throw new BadRequestException(
      'Måned skal være i formatet YYYY-MM',
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new BadRequestException('Ugyldig måned');
  }

  const normalizedMonth =
    `${year}-${String(month).padStart(2, '0')}`;
  const start = getCopenhagenDayRange(
    `${normalizedMonth}-01`,
  ).start;
  const nextMonthDate = new Date(
    Date.UTC(year, month, 1),
  );
  const nextMonth =
    `${nextMonthDate.getUTCFullYear()}-${String(
      nextMonthDate.getUTCMonth() + 1,
    ).padStart(2, '0')}`;
  const end = getCopenhagenDayRange(
    `${nextMonth}-01`,
  ).start;

  return {
    month: normalizedMonth,
    start,
    end,
  };
}

export async function findMyShiftsForMonth(
  prisma: PrismaService,
  params: {
    userId: number;
    cinemaId: number;
    month: unknown;
    targetId?: number;
  },
) {
  const range = getCopenhagenMonthRange(
    params.month,
  );
  const monthWhere = {
    cinemaId: params.cinemaId,
    userId: params.userId,
    AND: [
      {
        startTime: {
          lt: range.end,
        },
      },
      {
        endTime: {
          gt: range.start,
        },
      },
    ],
  };

  const [items, target] = await Promise.all([
    prisma.shift.findMany({
      where: monthWhere,
      select: myShiftSelect,
      orderBy: [
        {
          startTime: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    }),
    params.targetId
      ? prisma.shift.findFirst({
          where: {
            id: params.targetId,
            cinemaId: params.cinemaId,
            userId: params.userId,
          },
          select: myShiftSelect,
        })
      : Promise.resolve(null),
  ]);

  return {
    month: range.month,
    items,
    target,
  };
}
