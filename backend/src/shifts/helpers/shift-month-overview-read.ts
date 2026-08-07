import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { scheduleShiftSelect } from './schedule-shift-read';
import { getCopenhagenDayRange } from './shift-service-helpers';

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getNextMonth(year: number, month: number) {
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }

  return { year, month: month + 1 };
}

function validateMonth(year: number, month: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new BadRequestException('År skal være mellem 1900 og 9999');
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new BadRequestException('Måned skal være mellem 1 og 12');
  }
}

export async function findShiftMonthOverview(
  prisma: PrismaService,
  cinemaId: number,
  year: number,
  month: number,
) {
  validateMonth(year, month);

  const startDate = formatDateKey(year, month, 1);
  const nextMonth = getNextMonth(year, month);
  const endDateExclusive = formatDateKey(nextMonth.year, nextMonth.month, 1);
  const monthStart = getCopenhagenDayRange(startDate).start;
  const monthEnd = getCopenhagenDayRange(endDateExclusive).start;
  const shifts = await prisma.shift.findMany({
    where: {
      cinemaId,
      AND: [{ startTime: { lt: monthEnd } }, { endTime: { gt: monthStart } }],
    },
    select: scheduleShiftSelect,
    orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
  });
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days: Array<{
    dateKey: string;
    shiftCount: number;
    assignedShiftCount: number;
    unassignedShiftCount: number;
    shifts: typeof shifts;
  }> = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = formatDateKey(year, month, day);
    const dayRange = getCopenhagenDayRange(dateKey);
    const dayShifts = shifts.filter(
      (shift) => shift.startTime < dayRange.end && shift.endTime > dayRange.start,
    );

    if (dayShifts.length === 0) {
      continue;
    }

    days.push({
      dateKey,
      shiftCount: dayShifts.length,
      assignedShiftCount: dayShifts.filter((shift) => shift.userId !== null).length,
      unassignedShiftCount: dayShifts.filter((shift) => shift.userId === null).length,
      shifts: dayShifts,
    });
  }

  return {
    cinemaId,
    year,
    month,
    startDate,
    endDateExclusive,
    totalShiftCount: shifts.length,
    days,
  };
}
