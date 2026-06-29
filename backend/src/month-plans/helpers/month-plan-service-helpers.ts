import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type AuthUser = {
  id: number;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId?: number | null;
};

export const monthPlanDayInclude: Prisma.MonthPlanDayInclude = {
  scheduleTemplate: {
    select: {
      id: true,
      name: true,
      description: true,
      weekParity: true,
      startsOn: true,
      sortOrder: true,
      isActive: true,
      archivedAt: true,
      _count: {
        select: {
          days: true,
        },
      },
    },
  },
};

export function resolveMonthPlanCinemaId(user: AuthUser, providedCinemaId?: string | number | null) {
  if (user.role === 'MASTER') {
    const parsedCinemaId = Number(providedCinemaId);

    if (!Number.isInteger(parsedCinemaId) || parsedCinemaId <= 0) {
      throw new BadRequestException('Vælg en biograf, før du administrerer månedsplanen.');
    }

    return parsedCinemaId;
  }

  if (user.role === 'ADMIN') {
    if (!user.cinemaId) {
      throw new ForbiddenException('Ingen biograf er knyttet til din bruger.');
    }

    return user.cinemaId;
  }

  throw new ForbiddenException('Ingen adgang.');
}

export function parseMonthPlanYear(value?: string) {
  const parsedYear = Number(value);

  if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
    throw new BadRequestException('År skal være et gyldigt tal.');
  }

  return parsedYear;
}

export function parseMonthPlanMonth(value?: string) {
  const parsedMonth = Number(value);

  if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    throw new BadRequestException('Måned skal være et gyldigt tal fra 1 til 12.');
  }

  return parsedMonth;
}

export function normalizeMonthPlanDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException('Dato skal angives som ÅÅÅÅ-MM-DD.');
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new BadRequestException('Dato skal være en gyldig kalenderdato.');
  }

  return parsedDate;
}

export function getMonthPlanRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return { start, end, dayCount };
}

export function toIsoDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function parseOptionalBoolean(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new BadRequestException(`${fieldName} skal være sand/falsk.`);
  }

  return value;
}

export function parseOptionalText(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(`${fieldName} skal være tekst.`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseOptionalPositiveId(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new BadRequestException(`${fieldName} skal være et gyldigt ID.`);
  }

  return parsedValue;
}

export function parseOptionalCount(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new BadRequestException(`${fieldName} skal være et positivt heltal.`);
  }

  return parsedValue;
}

export function parseOptionalDateTime(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(`${fieldName} skal være et tidspunkt.`);
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestException(`${fieldName} skal være et gyldigt tidspunkt.`);
  }

  return parsedDate;
}

export async function ensureScheduleTemplateForMonthPlan(
  prisma: PrismaService,
  cinemaId: number,
  scheduleTemplateId: number | null | undefined,
) {
  if (scheduleTemplateId === undefined || scheduleTemplateId === null) {
    return;
  }

  const template = await prisma.scheduleTemplate.findFirst({
    where: {
      id: scheduleTemplateId,
      cinemaId,
      isActive: true,
      archivedAt: null,
    },
  });

  if (!template) {
    throw new BadRequestException('Vagtsskabelonen findes ikke for den valgte biograf.');
  }
}

export function buildVirtualMonthPlanDay(cinemaId: number, date: Date, persistedDay?: any) {
  if (persistedDay) {
    return {
      ...persistedDay,
      dateKey: toIsoDateOnly(persistedDay.date),
      isPersisted: true,
    };
  }

  return {
    id: null,
    cinemaId,
    date,
    dateKey: toIsoDateOnly(date),
    isPersisted: false,
    isActive: true,
    scheduleTemplateId: null,
    scheduleTemplate: null,
    note: null,
    movieProgramFirstStart: null,
    movieProgramLastEnd: null,
    movieShowingCount: 0,
    plannedShiftCount: 0,
    unassignedShiftCount: 0,
    createdAt: null,
    updatedAt: null,
  };
}
