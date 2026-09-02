import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { withUserWriteLock } from './user-write-lock';

export const DEFAULT_DASHBOARD_HORIZON_DAYS = 10;
export const MIN_DASHBOARD_HORIZON_DAYS = 1;
export const MAX_DASHBOARD_HORIZON_DAYS = 30;

export function normalizeDashboardHorizonDays(
  value: unknown,
) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < MIN_DASHBOARD_HORIZON_DAYS ||
    value > MAX_DASHBOARD_HORIZON_DAYS
  ) {
    throw new BadRequestException(
      'Dashboardperioden skal være mellem 1 og 30 dage',
    );
  }

  return value;
}

export async function findDashboardHorizonPreference(
  prisma: PrismaService,
  id: number,
) {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      dashboardHorizonDays: true,
    },
  });

  if (!user) {
    throw new NotFoundException(
      'Bruger blev ikke fundet',
    );
  }

  return user;
}

export async function updateDashboardHorizonPreference(
  prisma: PrismaService,
  id: number,
  dashboardHorizonDays: number,
) {
  return withUserWriteLock(
    prisma,
    id,
    (transaction, userId) =>
      transaction.user.update({
        where: {
          id: userId,
        },
        data: {
          dashboardHorizonDays,
        },
        select: {
          dashboardHorizonDays: true,
        },
      }),
  );
}
