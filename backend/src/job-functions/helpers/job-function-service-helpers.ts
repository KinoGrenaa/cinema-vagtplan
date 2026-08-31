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
  canManageSchedule?: boolean;
  canManageUsers?: boolean;
};

export type CinemaContextValue = number | string | null | undefined;
export type NumberContextValue = number | string | null | undefined;
export type BooleanContextValue = boolean | string | null | undefined;

export type JobFunctionTimingAnchorValue =
  | 'FIRST_MOVIE_START'
  | 'FIRST_MOVIE_END'
  | 'LAST_MOVIE_START'
  | 'LAST_MOVIE_END'
  | 'FIXED_TIME';

export type JobFunctionTimingRuleData = {
  cinemaId?: CinemaContextValue;
  filmWindowStartMinute?: NumberContextValue;
  filmWindowEndMinute?: NumberContextValue;
  startAnchor?: JobFunctionTimingAnchorValue | string | null;
  startOffsetMinutes?: NumberContextValue;
  startFixedMinute?: NumberContextValue;
  endAnchor?: JobFunctionTimingAnchorValue | string | null;
  endOffsetMinutes?: NumberContextValue;
  endFixedMinute?: NumberContextValue;
  fallbackStartMinute?: NumberContextValue;
  fallbackEndMinute?: NumberContextValue;
  roundToQuarter?: BooleanContextValue;
  roundStartToNearestQuarter?: BooleanContextValue;
  roundEndToNearestQuarter?: BooleanContextValue;
  /** @deprecated Accepted temporarily for clients from the previous AT3A preview. */
  roundStartDownToQuarter?: BooleanContextValue;
  /** @deprecated Accepted temporarily for clients from the previous AT3A preview. */
  roundEndUpToQuarter?: BooleanContextValue;
  restrictMovieStartsToWindow?: BooleanContextValue;
  /** @deprecated Accepted for clients using the first AT3A contract. */
  limitToFilmWindow?: BooleanContextValue;
};

export type JobFunctionCreateData = {
  name: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: NumberContextValue;
  defaultPayrollExportCodeId?: NumberContextValue;
  payrollTypeId?: NumberContextValue;
  cinemaId?: CinemaContextValue;
  timingRule?: JobFunctionTimingRuleData | null;
  userIds?: NumberContextValue[];
};

export type JobFunctionUpdateData = {
  name?: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: NumberContextValue;
  defaultPayrollExportCodeId?: NumberContextValue;
  payrollTypeId?: NumberContextValue;
  cinemaId?: CinemaContextValue;
  timingRule?: JobFunctionTimingRuleData | null;
  userIds?: NumberContextValue[];
};

export type UserJobFunctionAssignData = {
  userId: NumberContextValue;
  cinemaId?: CinemaContextValue;
};

export type UserJobFunctionReplaceData = {
  userIds?: NumberContextValue[];
  jobFunctionIds?: NumberContextValue[];
  cinemaId?: CinemaContextValue;
};

export type JobFunctionCopyData = {
  cinemaId?: CinemaContextValue;
  name?: string | null;
  copyQualifiedUsers?: BooleanContextValue;
  copySpecialPayRules?: BooleanContextValue;
};

export type JobFunctionDbClient = Prisma.TransactionClient;

const JOB_FUNCTION_LOCK_NAMESPACE = 1_245_660_518;
const MAX_JOB_FUNCTION_NAME_LENGTH = 200;
const MAX_JOB_FUNCTION_TEXT_LENGTH = 5_000;

export const jobFunctionInclude = {
  defaultPayrollExportCode: {
    select: {
      id: true,
      name: true,
      payrollCode: true,
      exportCode: true,
      description: true,
      color: true,
      isDefault: true,
      isActive: true,
    },
  },
  timingRule: true,
  _count: {
    select: {
      userJobFunctions: true,
      shifts: true,
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
      profileImage: true,
      role: true,
      isActive: true,
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

function parseStrictInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  message: string,
) {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'string' && !/^-?[0-9]+$/.test(value))
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
  if (value === null || value === undefined || value === '') return null;
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

export function parseBooleanValue(
  value: BooleanContextValue,
  fallback: boolean,
  message = 'Feltet skal være true eller false.',
) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new BadRequestException(message);
}

export function ensureJobFunctionAdmin(user: AuthUser) {
  if (user.role === 'MASTER' || user.canManageSchedule === true) return;
  throw new ForbiddenException('Du har ikke adgang til at administrere jobfunktioner.');
}

export function ensureJobFunctionAssignmentAdmin(user: AuthUser) {
  if (
    user.role === 'MASTER' ||
    user.canManageSchedule === true ||
    user.canManageUsers === true
  ) {
    return;
  }
  throw new ForbiddenException(
    'Du har ikke adgang til at administrere medarbejdernes jobfunktioner.',
  );
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
  if (!cinemaId) throw new BadRequestException('Brugeren mangler biograf.');
  const requestedCinemaId = parseCinemaId(selectedCinemaId);
  if (requestedCinemaId && requestedCinemaId !== cinemaId) {
    throw new ForbiddenException('Du har ikke adgang til denne biograf.');
  }
  return cinemaId;
}

export function getActorUserId(user: AuthUser) {
  const value = user.sub ?? user.id;
  if (value === undefined || value === null) return null;
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

export function normalizeJobFunctionName(value: unknown) {
  if (typeof value !== 'string') throw new BadRequestException('Navn mangler.');
  const name = value.trim();
  if (!name) throw new BadRequestException('Navn mangler.');
  if (
    name.length > MAX_JOB_FUNCTION_NAME_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(name)
  ) {
    throw new BadRequestException(
      'Navnet er for langt eller indeholder ugyldige tegn.',
    );
  }
  return name;
}

export function normalizeJobFunctionNameKey(name: string) {
  return name.trim().toLocaleLowerCase('da-DK');
}

export function normalizeOptionalText(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException('Tekstfeltet er ugyldigt.');
  }
  const text = value.trim();
  if (text.length > MAX_JOB_FUNCTION_TEXT_LENGTH || text.includes('\u0000')) {
    throw new BadRequestException('Tekstfeltet er for langt eller ugyldigt.');
  }
  return text || null;
}

export function normalizeJobFunctionColor(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new BadRequestException('Farve skal være en gyldig hex-farve.');
  }
  const color = value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new BadRequestException('Farve skal være en gyldig hex-farve.');
  }
  return color;
}

export function parseRequiredPositiveId(
  value: NumberContextValue,
  message: string,
) {
  if (value === null || value === undefined || value === '') {
    throw new BadRequestException(message);
  }
  return parseStrictInteger(value, 1, Number.MAX_SAFE_INTEGER, message);
}

export function parseOptionalPositiveId(
  value: NumberContextValue,
  message: string,
) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return parseRequiredPositiveId(value, message);
}

export function parsePositiveIdList(values: NumberContextValue[] | undefined) {
  if (values === undefined) return undefined;
  if (!Array.isArray(values)) {
    throw new BadRequestException('Listen over ID’er er ugyldig.');
  }
  return [...new Set(values.map((value) => parseRequiredPositiveId(
    value,
    'Listen indeholder et ugyldigt ID.',
  )))];
}

export function parseOptionalSortOrder(value: NumberContextValue) {
  if (value === null || value === undefined || value === '') return undefined;
  return parseStrictInteger(
    value,
    0,
    Number.MAX_SAFE_INTEGER,
    'Sortering skal være et gyldigt tal.',
  );
}

export async function getPayrollExportCodeIdForCinema(
  prisma: JobFunctionDbClient,
  cinemaId: number,
  payrollTypeId: NumberContextValue,
) {
  const parsedId = parseOptionalPositiveId(
    payrollTypeId,
    'Eksportkode skal være et gyldigt ID.',
  );
  if (parsedId === undefined || parsedId === null) return parsedId;
  const payrollType = await prisma.payrollType.findFirst({
    where: { id: parsedId, cinemaId, isActive: true },
    select: { id: true },
  });
  if (!payrollType) {
    throw new BadRequestException(
      'Eksportkoden findes ikke for den valgte biograf.',
    );
  }
  return payrollType.id;
}

export async function findJobFunctionForCinema(
  prisma: JobFunctionDbClient,
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

export async function ensureAssignableJobFunctionUser(
  prisma: JobFunctionDbClient,
  userId: number,
  cinemaId: number,
) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      role: { not: 'MASTER' },
      cinemaMemberships: { some: { cinemaId, isActive: true } },
    },
    select: { id: true },
  });
  if (!user) {
    throw new BadRequestException(
      'Medarbejderen findes ikke som aktivt medlemskab i den valgte biograf.',
    );
  }
  return user;
}

export async function ensureAssignableJobFunctionUsers(
  prisma: JobFunctionDbClient,
  userIds: number[],
  cinemaId: number,
) {
  if (userIds.length === 0) return;
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      isActive: true,
      role: { not: 'MASTER' },
      cinemaMemberships: { some: { cinemaId, isActive: true } },
    },
    select: { id: true },
  });
  const validIds = new Set(users.map((user) => user.id));
  const invalidIds = userIds.filter((id) => !validIds.has(id));
  if (invalidIds.length > 0) {
    throw new BadRequestException(
      `Følgende medarbejdere kan ikke tildeles i biografen: ${invalidIds.join(', ')}.`,
    );
  }
}

export async function withJobFunctionCinemaLock<T>(
  prisma: PrismaService,
  cinemaId: number,
  action: (transaction: JobFunctionDbClient) => Promise<T>,
) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(
        ${JOB_FUNCTION_LOCK_NAMESPACE}::integer,
        ${cinemaId}::integer
      )
    `;
    return action(transaction);
  });
}
