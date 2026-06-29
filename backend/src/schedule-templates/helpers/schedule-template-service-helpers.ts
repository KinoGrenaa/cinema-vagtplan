import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

export type AuthUser = {
  sub?: number;
  id?: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

export type CinemaContextValue = number | string | null | undefined;
export type NumberContextValue = number | string | null | undefined;
export type BooleanContextValue = boolean | string | null | undefined;

export type ScheduleTemplateWeekParityValue =
  | 'ANY'
  | 'EVEN'
  | 'ODD'
  | string
  | null
  | undefined;

export type ScheduleTemplateCreateData = {
  name: string;
  description?: string | null;
  weekParity?: ScheduleTemplateWeekParityValue;
  startsOn?: string | Date | null;
  sortOrder?: NumberContextValue;
  cinemaId?: CinemaContextValue;
};

export type ScheduleTemplateUpdateData = {
  name?: string;
  description?: string | null;
  weekParity?: ScheduleTemplateWeekParityValue;
  startsOn?: string | Date | null;
  sortOrder?: NumberContextValue;
  cinemaId?: CinemaContextValue;
};

export type ScheduleTemplateDayData = {
  cinemaId?: CinemaContextValue;
  isActive?: BooleanContextValue;
  note?: string | null;
  sortOrder?: NumberContextValue;
};

export type ScheduleTemplateJobFunctionData = {
  cinemaId?: CinemaContextValue;
  jobFunctionId?: NumberContextValue;
  requiredCount?: NumberContextValue;
  sortOrder?: NumberContextValue;
  note?: string | null;
};

export type ScheduleTemplateAssignmentData = {
  cinemaId?: CinemaContextValue;
  userId?: NumberContextValue;
  sortOrder?: NumberContextValue;
};

export const scheduleTemplateInclude: Prisma.ScheduleTemplateInclude = {
  days: {
    orderBy: [{ weekday: 'asc' }, { sortOrder: 'asc' }],
    include: {
      jobFunctions: {
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        include: {
          jobFunction: {
            include: {
              dayPeriod: true,
              timingRule: true,
              _count: { select: { userJobFunctions: true } },
            },
          },
          assignments: {
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                  isActive: true,
                  cinemaId: true,
                },
              },
            },
          },
        },
      },
    },
  },
  _count: {
    select: {
      days: true,
    },
  },
};

export const scheduleTemplateDayInclude: Prisma.ScheduleTemplateDayInclude = {
  jobFunctions: {
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: {
      jobFunction: {
        include: {
          dayPeriod: true,
          timingRule: true,
          _count: { select: { userJobFunctions: true } },
        },
      },
      assignments: {
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              isActive: true,
              cinemaId: true,
            },
          },
        },
      },
    },
  },
};

export const scheduleTemplateJobFunctionInclude: Prisma.ScheduleTemplateJobFunctionInclude = {
  templateDay: {
    include: {
      template: true,
    },
  },
  jobFunction: {
    include: {
      dayPeriod: true,
      timingRule: true,
      _count: { select: { userJobFunctions: true } },
    },
  },
  assignments: {
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          cinemaId: true,
        },
      },
    },
  },
};

function parseCinemaId(value: CinemaContextValue) {
  const cinemaId = Number(value);
  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    return null;
  }
  return cinemaId;
}

export function ensureScheduleTemplateAdmin(user: AuthUser) {
  if (user.role === 'MASTER') return;
  if (user.role === 'ADMIN') return;
  throw new ForbiddenException('Ingen adgang');
}

export function getRequiredScheduleTemplateCinemaId(
  user: AuthUser,
  selectedCinemaId?: CinemaContextValue,
) {
  if (user.role === 'MASTER') {
    const cinemaId = parseCinemaId(selectedCinemaId);
    if (!cinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer vagtsskabeloner.',
      );
    }
    return cinemaId;
  }

  const cinemaId = parseCinemaId(user.cinemaId);
  if (!cinemaId) {
    throw new BadRequestException('Brugeren mangler biograf.');
  }
  return cinemaId;
}

export function getActorUserId(user: AuthUser) {
  const userId = Number(user.sub ?? user.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }
  return userId;
}

export function normalizeScheduleTemplateName(name: unknown) {
  if (typeof name !== 'string') {
    throw new BadRequestException('Navn mangler.');
  }
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new BadRequestException('Navn mangler.');
  }
  return normalizedName;
}

export function normalizeOptionalText(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException('Tekstfeltet er ugyldigt.');
  }
  const normalizedValue = value.trim();
  return normalizedValue || null;
}

export function parseOptionalSortOrder(value: NumberContextValue) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const sortOrder = Number(value);
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new BadRequestException('Sortering skal være et gyldigt tal.');
  }
  return sortOrder;
}

export function parseRequiredPositiveId(
  value: NumberContextValue,
  message: string,
) {
  if (value === null || value === undefined || value === '') {
    throw new BadRequestException(message);
  }
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException(message);
  }
  return id;
}

export function parseOptionalPositiveId(
  value: NumberContextValue,
  message: string,
) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException(message);
  }
  return id;
}

export function parseWeekday(value: NumberContextValue) {
  const weekday = parseRequiredPositiveId(
    value,
    'Ugedag skal være et gyldigt tal fra 1 til 7.',
  );
  if (weekday < 1 || weekday > 7) {
    throw new BadRequestException('Ugedag skal være et gyldigt tal fra 1 til 7.');
  }
  return weekday;
}

export function parseRequiredCount(value: NumberContextValue) {
  if (value === null || value === undefined || value === '') {
    return 1;
  }
  const requiredCount = Number(value);
  if (!Number.isInteger(requiredCount) || requiredCount <= 0 || requiredCount > 50) {
    throw new BadRequestException('Antal på vagt skal være et gyldigt tal.');
  }
  return requiredCount;
}

export function parseOptionalBoolean(value: BooleanContextValue) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new BadRequestException('Værdien skal være sand eller falsk.');
}

export function normalizeWeekParity(value: ScheduleTemplateWeekParityValue) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === 'ANY' || value === 'EVEN' || value === 'ODD') {
    return value;
  }
  throw new BadRequestException('Ugetype skal være Lige, Ulige eller Alle.');
}

export function parseOptionalDate(value: string | Date | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsedDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestException('Startdato skal være en gyldig dato.');
  }
  return parsedDate;
}

export async function findScheduleTemplateForCinema(
  prisma: PrismaService,
  templateId: number,
  cinemaId: number,
  requireActive = false,
) {
  const template = await prisma.scheduleTemplate.findFirst({
    where: {
      id: templateId,
      cinemaId,
      ...(requireActive ? { isActive: true } : {}),
    },
    include: scheduleTemplateInclude,
  });

  if (!template) {
    throw new NotFoundException(
      'Vagtsskabelonen findes ikke for den valgte biograf.',
    );
  }
  return template;
}

export async function findScheduleTemplateDayForCinema(
  prisma: PrismaService,
  templateId: number,
  weekday: number,
  cinemaId: number,
) {
  const day = await prisma.scheduleTemplateDay.findFirst({
    where: {
      templateId,
      weekday,
      cinemaId,
    },
    include: scheduleTemplateDayInclude,
  });

  return day;
}

export async function findScheduleTemplateJobFunctionForCinema(
  prisma: PrismaService,
  templateJobFunctionId: number,
  templateId: number,
  cinemaId: number,
) {
  const templateJobFunction = await prisma.scheduleTemplateJobFunction.findFirst({
    where: {
      id: templateJobFunctionId,
      cinemaId,
      templateDay: {
        templateId,
        cinemaId,
      },
    },
    include: scheduleTemplateJobFunctionInclude,
  });

  if (!templateJobFunction) {
    throw new NotFoundException(
      'Jobfunktionen findes ikke på vagtsskabelonen.',
    );
  }
  return templateJobFunction;
}

export async function ensureActiveJobFunctionForCinema(
  prisma: PrismaService,
  jobFunctionId: number,
  cinemaId: number,
) {
  const jobFunction = await prisma.jobFunction.findFirst({
    where: {
      id: jobFunctionId,
      cinemaId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!jobFunction) {
    throw new BadRequestException(
      'Jobfunktionen findes ikke for den valgte biograf.',
    );
  }
  return jobFunction;
}

export async function ensureAssignableUserForJobFunction(
  prisma: PrismaService,
  userId: number,
  jobFunctionId: number,
  cinemaId: number,
) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      cinemaId,
      isActive: true,
      role: { not: 'MASTER' },
    },
    select: { id: true },
  });

  if (!user) {
    throw new BadRequestException(
      'Medarbejderen findes ikke for den valgte biograf.',
    );
  }

  const eligibility = await prisma.userJobFunction.findFirst({
    where: {
      userId,
      jobFunctionId,
      cinemaId,
    },
    select: { id: true },
  });

  if (!eligibility) {
    throw new BadRequestException(
      'Medarbejderen har ikke denne jobfunktion.',
    );
  }

  return user;
}
