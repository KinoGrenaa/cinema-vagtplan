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

export type CinemaContextValue =
  | number
  | string
  | null
  | undefined;

export type NumberContextValue =
  | number
  | string
  | null
  | undefined;

export type BooleanContextValue =
  | boolean
  | string
  | null
  | undefined;

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

export type ScheduleTemplateDbClient =
  Prisma.TransactionClient;

const SCHEDULE_TEMPLATE_LOCK_NAMESPACE = 1_397_909_604;
const MAX_TEMPLATE_NAME_LENGTH = 200;
const MAX_TEMPLATE_TEXT_LENGTH = 5_000;

export const scheduleTemplateInclude: Prisma.ScheduleTemplateInclude =
  {
    days: {
      orderBy: [
        {
          weekday: 'asc',
        },
        {
          sortOrder: 'asc',
        },
      ],
      include: {
        jobFunctions: {
          orderBy: [
            {
              sortOrder: 'asc',
            },
            {
              id: 'asc',
            },
          ],
          include: {
            jobFunction: {
              include: {
                dayPeriod: true,
                timingRule: true,
                _count: {
                  select: {
                    userJobFunctions: true,
                  },
                },
              },
            },
            assignments: {
              orderBy: [
                {
                  sortOrder: 'asc',
                },
                {
                  id: 'asc',
                },
              ],
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

export const scheduleTemplateDayInclude: Prisma.ScheduleTemplateDayInclude =
  {
    jobFunctions: {
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      include: {
        jobFunction: {
          include: {
            dayPeriod: true,
            timingRule: true,
            _count: {
              select: {
                userJobFunctions: true,
              },
            },
          },
        },
        assignments: {
          orderBy: [
            {
              sortOrder: 'asc',
            },
            {
              id: 'asc',
            },
          ],
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

export const scheduleTemplateJobFunctionInclude: Prisma.ScheduleTemplateJobFunctionInclude =
  {
    templateDay: {
      include: {
        template: true,
      },
    },
    jobFunction: {
      include: {
        dayPeriod: true,
        timingRule: true,
        _count: {
          select: {
            userJobFunctions: true,
          },
        },
      },
    },
    assignments: {
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          id: 'asc',
        },
      ],
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

function parseStrictInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  message: string,
) {
  if (
    (typeof value !== 'string' &&
      typeof value !== 'number') ||
    (typeof value === 'string' &&
      !/^[0-9]+$/.test(value))
  ) {
    throw new BadRequestException(message);
  }

  const parsedValue = Number(value);

  if (
    !Number.isSafeInteger(parsedValue) ||
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    throw new BadRequestException(message);
  }

  return parsedValue;
}

function parseCinemaId(value: CinemaContextValue) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  try {
    return parseStrictInteger(
      value,
      1,
      Number.MAX_SAFE_INTEGER,
      'Biograf skal være et gyldigt ID.',
    );
  } catch {
    return null;
  }
}

export function ensureScheduleTemplateAdmin(
  user: AuthUser,
) {
  if (user.role === 'MASTER') return;
  if (user.role === 'ADMIN') return;

  throw new ForbiddenException('Ingen adgang');
}

export function getRequiredScheduleTemplateCinemaId(
  user: AuthUser,
  selectedCinemaId?: CinemaContextValue,
) {
  if (user.role === 'MASTER') {
    const cinemaId = parseCinemaId(
      selectedCinemaId,
    );

    if (!cinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer vagtsskabeloner.',
      );
    }

    return cinemaId;
  }

  const cinemaId = parseCinemaId(user.cinemaId);

  if (!cinemaId) {
    throw new BadRequestException(
      'Brugeren mangler biograf.',
    );
  }

  return cinemaId;
}

export function getActorUserId(user: AuthUser) {
  const value = user.sub ?? user.id;

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  try {
    return parseStrictInteger(
      value,
      1,
      Number.MAX_SAFE_INTEGER,
      'Bruger skal være et gyldigt ID.',
    );
  } catch {
    return null;
  }
}

export function normalizeScheduleTemplateName(
  name: unknown,
) {
  if (typeof name !== 'string') {
    throw new BadRequestException('Navn mangler.');
  }

  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new BadRequestException('Navn mangler.');
  }

  if (
    normalizedName.length >
      MAX_TEMPLATE_NAME_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(normalizedName)
  ) {
    throw new BadRequestException(
      'Navnet er for langt eller indeholder ugyldige tegn.',
    );
  }

  return normalizedName;
}

export function normalizeOptionalText(
  value: unknown,
) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Tekstfeltet er ugyldigt.',
    );
  }

  const normalizedValue = value.trim();

  if (
    normalizedValue.length >
      MAX_TEMPLATE_TEXT_LENGTH ||
    normalizedValue.includes('\u0000')
  ) {
    throw new BadRequestException(
      'Tekstfeltet er for langt eller ugyldigt.',
    );
  }

  return normalizedValue || null;
}

export function parseOptionalSortOrder(
  value: NumberContextValue,
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return undefined;
  }

  return parseStrictInteger(
    value,
    0,
    Number.MAX_SAFE_INTEGER,
    'Sortering skal være et gyldigt tal.',
  );
}

export function parseRequiredPositiveId(
  value: NumberContextValue,
  message: string,
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    throw new BadRequestException(message);
  }

  return parseStrictInteger(
    value,
    1,
    Number.MAX_SAFE_INTEGER,
    message,
  );
}

export function parseOptionalPositiveId(
  value: NumberContextValue,
  message: string,
) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  return parseRequiredPositiveId(value, message);
}

export function parseWeekday(
  value: NumberContextValue,
) {
  return parseStrictInteger(
    value,
    1,
    7,
    'Ugedag skal være et gyldigt tal fra 1 til 7.',
  );
}

export function parseRequiredCount(
  value: NumberContextValue,
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 1;
  }

  return parseStrictInteger(
    value,
    1,
    50,
    'Antal på vagt skal være et gyldigt tal.',
  );
}

export function parseOptionalBoolean(
  value: BooleanContextValue,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') return true;
  if (value === 'false') return false;

  throw new BadRequestException(
    'Værdien skal være sand eller falsk.',
  );
}

export function normalizeWeekParity(
  value: ScheduleTemplateWeekParityValue,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  if (
    value === 'ANY' ||
    value === 'EVEN' ||
    value === 'ODD'
  ) {
    return value;
  }

  throw new BadRequestException(
    'Ugetype skal være Lige, Ulige eller Alle.',
  );
}

export function parseOptionalDate(
  value: string | Date | null | undefined,
) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException(
        'Startdato skal være en gyldig dato.',
      );
    }

    return new Date(value.getTime());
  }

  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new BadRequestException(
      'Startdato skal angives som ÅÅÅÅ-MM-DD.',
    );
  }

  const parsedDate = new Date(
    `${value}T00:00:00.000Z`,
  );

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException(
      'Startdato skal være en gyldig kalenderdato.',
    );
  }

  return parsedDate;
}

export async function withScheduleTemplateCinemaLock<T>(
  prisma: PrismaService,
  cinemaId: number,
  action: (
    transaction: ScheduleTemplateDbClient,
  ) => Promise<T>,
) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(
        ${SCHEDULE_TEMPLATE_LOCK_NAMESPACE},
        ${cinemaId}
      )
    `;

    return action(transaction);
  });
}

export async function findScheduleTemplateForCinema(
  prisma: ScheduleTemplateDbClient,
  templateId: number,
  cinemaId: number,
  requireActive = false,
) {
  const template =
    await prisma.scheduleTemplate.findFirst({
      where: {
        id: templateId,
        cinemaId,
        ...(requireActive
          ? {
              isActive: true,
            }
          : {}),
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
  prisma: ScheduleTemplateDbClient,
  templateId: number,
  weekday: number,
  cinemaId: number,
) {
  return prisma.scheduleTemplateDay.findFirst({
    where: {
      templateId,
      weekday,
      cinemaId,
    },
    include: scheduleTemplateDayInclude,
  });
}

export async function findScheduleTemplateJobFunctionForCinema(
  prisma: ScheduleTemplateDbClient,
  templateJobFunctionId: number,
  templateId: number,
  cinemaId: number,
) {
  const templateJobFunction =
    await prisma.scheduleTemplateJobFunction.findFirst(
      {
        where: {
          id: templateJobFunctionId,
          cinemaId,
          templateDay: {
            templateId,
            cinemaId,
          },
        },
        include:
          scheduleTemplateJobFunctionInclude,
      },
    );

  if (!templateJobFunction) {
    throw new NotFoundException(
      'Jobfunktionen findes ikke på vagtsskabelonen.',
    );
  }

  return templateJobFunction;
}

export async function ensureActiveJobFunctionForCinema(
  prisma: ScheduleTemplateDbClient,
  jobFunctionId: number,
  cinemaId: number,
) {
  const jobFunction =
    await prisma.jobFunction.findFirst({
      where: {
        id: jobFunctionId,
        cinemaId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

  if (!jobFunction) {
    throw new BadRequestException(
      'Jobfunktionen findes ikke for den valgte biograf.',
    );
  }

  return jobFunction;
}

export async function ensureAssignableUserForJobFunction(
  prisma: ScheduleTemplateDbClient,
  userId: number,
  jobFunctionId: number,
  cinemaId: number,
) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      role: {
        not: 'MASTER',
      },
      cinemaMemberships: {
        some: {
          cinemaId,
          isActive: true,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new BadRequestException(
      'Medarbejderen findes ikke for den valgte biograf.',
    );
  }

  const eligibility =
    await prisma.userJobFunction.findFirst({
      where: {
        userId,
        jobFunctionId,
        cinemaId,
      },
      select: {
        id: true,
      },
    });

  if (!eligibility) {
    throw new BadRequestException(
      'Medarbejderen har ikke denne jobfunktion.',
    );
  }

  return user;
}
