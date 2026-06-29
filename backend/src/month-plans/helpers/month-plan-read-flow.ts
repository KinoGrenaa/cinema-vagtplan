import { PrismaService } from '../../prisma/prisma.service';
import {
  buildVirtualMonthPlanDay,
  getMonthPlanRange,
  monthPlanDayInclude,
  normalizeMonthPlanDate,
  parseMonthPlanMonth,
  parseMonthPlanYear,
  resolveMonthPlanCinemaId,
  toIsoDateOnly,
} from './month-plan-service-helpers';

export async function findMonthPlanDays(
  prisma: PrismaService,
  user,
  yearValue?: string,
  monthValue?: string,
  cinemaIdValue?: string,
) {
  const cinemaId = resolveMonthPlanCinemaId(user, cinemaIdValue);
  const year = parseMonthPlanYear(yearValue);
  const month = parseMonthPlanMonth(monthValue);
  const { start, end, dayCount } = getMonthPlanRange(year, month);

  const persistedDays = await prisma.monthPlanDay.findMany({
    where: {
      cinemaId,
      date: {
        gte: start,
        lt: end,
      },
    },
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
    include: monthPlanDayInclude,
  });

  const daysByDate = new Map(
    persistedDays.map((day) => [toIsoDateOnly(day.date), day]),
  );

  const days = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, index + 1, 0, 0, 0, 0));
    const dateKey = toIsoDateOnly(date);

    return buildVirtualMonthPlanDay(cinemaId, date, daysByDate.get(dateKey));
  });

  return {
    cinemaId,
    year,
    month,
    startDate: toIsoDateOnly(start),
    endDateExclusive: toIsoDateOnly(end),
    days,
  };
}

export async function findMonthPlanDay(
  prisma: PrismaService,
  user,
  dateValue: string,
  cinemaIdValue?: string,
) {
  const cinemaId = resolveMonthPlanCinemaId(user, cinemaIdValue);
  const date = normalizeMonthPlanDate(dateValue);

  const persistedDay = await prisma.monthPlanDay.findUnique({
    where: {
      cinemaId_date: {
        cinemaId,
        date,
      },
    },
    include: monthPlanDayInclude,
  });

  return buildVirtualMonthPlanDay(cinemaId, date, persistedDay);
}
