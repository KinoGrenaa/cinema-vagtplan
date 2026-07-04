import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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

export type JobFunctionTimingAnchorValue =
  | 'DAY_PERIOD_START'
  | 'DAY_PERIOD_END'
  | 'FIRST_MOVIE_START'
  | 'FIRST_MOVIE_END'
  | 'LAST_MOVIE_START'
  | 'LAST_MOVIE_END'
  | 'FIXED_TIME';

export type JobFunctionCreateData = {
  name: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: NumberContextValue;
  dayPeriodId?: NumberContextValue;
  workTypeId?: NumberContextValue;
  payrollTypeId?: NumberContextValue;
  cinemaId?: CinemaContextValue;
};

export type JobFunctionUpdateData = {
  name?: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: NumberContextValue;
  dayPeriodId?: NumberContextValue;
  workTypeId?: NumberContextValue;
  payrollTypeId?: NumberContextValue;
  cinemaId?: CinemaContextValue;
};

export type UserJobFunctionAssignData = {
  userId: NumberContextValue;
  cinemaId?: CinemaContextValue;
};

export type JobFunctionTimingRuleData = {
  cinemaId?: CinemaContextValue;
  startAnchor?: JobFunctionTimingAnchorValue | string | null;
  startOffsetMinutes?: NumberContextValue;
  startFixedMinute?: NumberContextValue;
  endAnchor?: JobFunctionTimingAnchorValue | string | null;
  endOffsetMinutes?: NumberContextValue;
  endFixedMinute?: NumberContextValue;
  fallbackStartMinute?: NumberContextValue;
  fallbackEndMinute?: NumberContextValue;
  clampToDayPeriod?: BooleanContextValue;
};

export const jobFunctionInclude = {
  dayPeriod: true,
  workType: {
    select: {
      id: true,
      name: true,
      color: true,
      isActive: true,
      cinemaId: true,
      payrollTypeId: true,
      payrollType: {
        select: {
          id: true,
          name: true,
          payrollCode: true,
          exportCode: true,
          color: true,
          isDefault: true,
          isActive: true,
        },
      },
    },
  },
  timingRule: true,
  _count: {
    select: {
      userJobFunctions: true,
    },
  },
} as const;

export const jobFunctionTimingRuleInclude = {
  jobFunction: {
    select: {
      id: true,
      name: true,
      color: true,
      isActive: true,
      cinemaId: true,
      dayPeriod: true,
    },
  },
} as const;

export const userJobFunctionInclude = {
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
  jobFunction: {
    select: {
      id: true,
      name: true,
      color: true,
      isActive: true,
      cinemaId: true,
    },
  },
  assignedByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

export function ensureJobFunctionAdmin(user: AuthUser) {
  if (user.role === 'MASTER') return;
  if (user.role === 'ADMIN') return;

  throw new ForbiddenException('Ingen adgang');
}

function parseCinemaId(value: CinemaContextValue) {
  const cinemaId = Number(value);

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    return null;
  }

  return cinemaId;
}

export function getRequiredJobFunctionCinemaId(
  user: AuthUser,
  selectedCinemaId?: CinemaContextValue,
) {
  if (user.role === 'MASTER') {
    const cinemaId = parseCinemaId(selectedCinemaId);

    if (!cinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer jobfunktioner.',
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

export function normalizeJobFunctionName(name: unknown) {
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
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Tekstfeltet er ugyldigt.');
  }

  const normalizedValue = value.trim();
  return normalizedValue || null;
}

export function normalizeJobFunctionColor(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Farve skal være en gyldig hex-farve.');
  }

  const normalizedColor = value.trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(normalizedColor)) {
    throw new BadRequestException('Farve skal være en gyldig hex-farve.');
  }

  return normalizedColor;
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
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException(message);
  }

  return id;
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

export async function getDayPeriodIdForCinema(
  prisma: PrismaService,
  cinemaId: number,
  dayPeriodId: NumberContextValue,
) {
  const parsedDayPeriodId = parseOptionalPositiveId(
    dayPeriodId,
    'Dagsperiode skal være et gyldigt ID.',
  );

  if (parsedDayPeriodId === undefined) {
    return undefined;
  }

  if (parsedDayPeriodId === null) {
    return null;
  }

  const dayPeriod = await prisma.dayPeriod.findFirst({
    where: {
      id: parsedDayPeriodId,
      cinemaId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!dayPeriod) {
    throw new BadRequestException(
      'Dagsperioden findes ikke for den valgte biograf.',
    );
  }

  return dayPeriod.id;
}

export async function getWorkTypeIdForCinema(
  prisma: PrismaService,
  cinemaId: number,
  workTypeId: NumberContextValue,
) {
  const parsedWorkTypeId = parseOptionalPositiveId(
    workTypeId,
    'Arbejdstype skal være et gyldigt ID.',
  );

  if (parsedWorkTypeId === undefined) {
    return undefined;
  }

  if (parsedWorkTypeId === null) {
    return null;
  }

  const workType = await prisma.workType.findFirst({
    where: {
      id: parsedWorkTypeId,
      cinemaId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!workType) {
    throw new BadRequestException(
      'Arbejdstypen findes ikke for den valgte biograf.',
    );
  }

  return workType.id;
}

export async function getWorkTypeIdForPayrollType(
  prisma: PrismaService,
  cinemaId: number,
  payrollTypeId: NumberContextValue,
) {
  const parsedPayrollTypeId = parseOptionalPositiveId(
    payrollTypeId,
    'Løntype skal være et gyldigt ID.',
  );

  if (parsedPayrollTypeId === undefined) {
    return undefined;
  }

  if (parsedPayrollTypeId === null) {
    return null;
  }

  const payrollType = await prisma.payrollType.findFirst({
    where: {
      id: parsedPayrollTypeId,
      cinemaId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      color: true,
    },
  });

  if (!payrollType) {
    throw new BadRequestException(
      'Løntypen findes ikke for den valgte biograf.',
    );
  }

  const workTypeColor = payrollType.color || '#2563eb';
  const existingWorkType =
    (await prisma.workType.findFirst({
      where: {
        cinemaId,
        payrollTypeId: payrollType.id,
        isActive: true,
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        isActive: true,
        archivedAt: true,
      },
    })) ??
    (await prisma.workType.findFirst({
      where: {
        cinemaId,
        payrollTypeId: payrollType.id,
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        isActive: true,
        archivedAt: true,
      },
    }));

  if (existingWorkType) {
    if (
      !existingWorkType.isActive ||
      existingWorkType.archivedAt ||
      existingWorkType.name !== payrollType.name ||
      existingWorkType.color !== workTypeColor
    ) {
      await prisma.workType.update({
        where: { id: existingWorkType.id },
        data: {
          name: payrollType.name,
          color: workTypeColor,
          isActive: true,
          archivedAt: null,
        },
      });
    }

    return existingWorkType.id;
  }

  const workType = await prisma.workType.create({
    data: {
      cinemaId,
      name: payrollType.name,
      color: workTypeColor,
      payrollTypeId: payrollType.id,
      isActive: true,
      archivedAt: null,
    },
    select: { id: true },
  });

  return workType.id;
}

export async function findJobFunctionForCinema(
  prisma: PrismaService,
  jobFunctionId: number,
  cinemaId: number,
  requireActive = false,
) {
  const jobFunction = await prisma.jobFunction.findFirst({
    where: {
      id: jobFunctionId,
      cinemaId,
      ...(requireActive ? { isActive: true } : {}),
    },
    include: jobFunctionInclude,
  });

  if (!jobFunction) {
    throw new NotFoundException(
      'Jobfunktionen findes ikke for den valgte biograf.',
    );
  }

  return jobFunction;
}
