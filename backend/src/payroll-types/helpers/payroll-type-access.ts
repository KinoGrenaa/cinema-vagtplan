import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

export type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

export type CinemaContextValue =
  | number
  | null
  | undefined;

export type PayrollTypeCreateData = {
  name: unknown;
  payrollCode: unknown;
  exportCode?: unknown;
  description?: unknown;
  color?: unknown;
  isDefault?: unknown;
  cinemaId?: CinemaContextValue;
};

export type PayrollTypeUpdateData = {
  name?: unknown;
  payrollCode?: unknown;
  exportCode?: unknown;
  description?: unknown;
  color?: unknown;
  isDefault?: unknown;
  isActive?: unknown;
  cinemaId?: CinemaContextValue;
};

export type PayrollTypeDbClient =
  Prisma.TransactionClient;

const PAYROLL_TYPE_LOCK_NAMESPACE = 1_348_797_556;
const MAX_PAYROLL_TYPE_NAME_LENGTH = 200;
const MAX_PAYROLL_TYPE_CODE_LENGTH = 100;
const MAX_PAYROLL_TYPE_DESCRIPTION_LENGTH = 5_000;

function parsePayrollTypeCinemaId(
  value: CinemaContextValue,
) {
  if (
    !Number.isSafeInteger(value) ||
    (value ?? 0) <= 0
  ) {
    return null;
  }

  return value as number;
}

function normalizeRequiredText(
  value: unknown,
  fieldName: string,
  maximumLength: number,
) {
  if (typeof value !== 'string') {
    throw new BadRequestException(
      `${fieldName} mangler.`,
    );
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new BadRequestException(
      `${fieldName} mangler.`,
    );
  }

  if (
    normalizedValue.length > maximumLength ||
    /[\u0000-\u001f\u007f]/.test(
      normalizedValue,
    )
  ) {
    throw new BadRequestException(
      `${fieldName} er for lang eller indeholder ugyldige tegn.`,
    );
  }

  return normalizedValue;
}

function normalizeOptionalText(
  value: unknown,
  fieldName: string,
  maximumLength: number,
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(
      `${fieldName} skal være tekst.`,
    );
  }

  const normalizedValue = value.trim();

  if (
    normalizedValue.length > maximumLength ||
    normalizedValue.includes('\u0000')
  ) {
    throw new BadRequestException(
      `${fieldName} er for lang eller ugyldig.`,
    );
  }

  return normalizedValue || null;
}

function normalizeOptionalBoolean(
  value: unknown,
  fieldName: string,
) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new BadRequestException(
      `${fieldName} skal være sand eller falsk.`,
    );
  }

  return value;
}

export function ensurePayrollTypeAdmin(
  user: AuthUser,
) {
  if (user.role === 'MASTER') return;
  if (user.role === 'ADMIN') return;

  throw new ForbiddenException('Ingen adgang');
}

export function getRequiredPayrollTypeCinemaId(
  user: AuthUser,
  selectedCinemaId?: CinemaContextValue,
) {
  if (user.role === 'MASTER') {
    const cinemaId = parsePayrollTypeCinemaId(
      selectedCinemaId,
    );

    if (!cinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer eksportkoder.',
      );
    }

    return cinemaId;
  }

  const cinemaId = parsePayrollTypeCinemaId(
    user.cinemaId,
  );

  if (!cinemaId) {
    throw new BadRequestException(
      'Brugeren mangler biograf.',
    );
  }

  return cinemaId;
}

export function normalizePayrollTypeName(
  value: unknown,
) {
  return normalizeRequiredText(
    value,
    'Navn',
    MAX_PAYROLL_TYPE_NAME_LENGTH,
  );
}

export function normalizePayrollTypeCode(
  value: unknown,
) {
  return normalizeRequiredText(
    value,
    'Lønkode',
    MAX_PAYROLL_TYPE_CODE_LENGTH,
  );
}

export function normalizeOptionalExportCode(
  value: unknown,
) {
  return normalizeOptionalText(
    value,
    'Eksportkode',
    MAX_PAYROLL_TYPE_CODE_LENGTH,
  );
}

export function normalizeOptionalDescription(
  value: unknown,
) {
  return normalizeOptionalText(
    value,
    'Beskrivelse',
    MAX_PAYROLL_TYPE_DESCRIPTION_LENGTH,
  );
}

export function normalizeOptionalPayrollTypeColor(
  value: unknown,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return value === undefined
      ? undefined
      : null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Farve skal være en gyldig hex-farve.',
    );
  }

  const color = value.trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new BadRequestException(
      'Farve skal være en gyldig hex-farve.',
    );
  }

  return color;
}

export function normalizeOptionalIsDefault(
  value: unknown,
) {
  return normalizeOptionalBoolean(
    value,
    'Standardeksportkode',
  );
}

export function normalizeOptionalIsActive(
  value: unknown,
) {
  return normalizeOptionalBoolean(
    value,
    'Aktiv status',
  );
}

export async function findPayrollTypeForCinema(
  prisma: PayrollTypeDbClient,
  id: number,
  cinemaId: number,
) {
  const payrollType =
    await prisma.payrollType.findFirst({
      where: {
        id,
        cinemaId,
      },
    });

  if (!payrollType) {
    throw new NotFoundException(
      'Eksportkoden blev ikke fundet',
    );
  }

  return payrollType;
}

export async function ensurePayrollTypeCodeAvailable(
  prisma: PayrollTypeDbClient,
  cinemaId: number,
  payrollCode: string,
  excludeId?: number,
) {
  const duplicate =
    await prisma.payrollType.findFirst({
      where: {
        cinemaId,
        payrollCode,
        ...(excludeId === undefined
          ? {}
          : {
              id: {
                not: excludeId,
              },
            }),
      },
      select: {
        id: true,
      },
    });

  if (duplicate) {
    throw new BadRequestException(
      'En eksportkode med denne interne kode findes allerede',
    );
  }
}

export async function ensurePayrollTypeUnused(
  prisma: PayrollTypeDbClient,
  payrollTypeId: number,
) {
  const [
    jobFunctionCount,
    timeEntryCount,
    adjustmentCount,
  ] = await Promise.all([
    prisma.jobFunction.count({
      where: {
        defaultPayrollExportCodeId: payrollTypeId,
      },
    }),
    prisma.timeEntry.count({
      where: {
        payrollTypeId,
      },
    }),
    prisma.payrollAdjustment.count({
      where: {
        payrollTypeId,
      },
    }),
  ]);

  if (
    jobFunctionCount > 0 ||
    timeEntryCount > 0 ||
    adjustmentCount > 0
  ) {
    throw new BadRequestException(
      'Eksportkoden er i brug og kan ikke slettes.',
    );
  }
}

export async function withPayrollTypeCinemaLock<T>(
  prisma: PrismaService,
  cinemaId: number,
  action: (
    transaction: PayrollTypeDbClient,
  ) => Promise<T>,
) {
  return prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(
          CAST(${PAYROLL_TYPE_LOCK_NAMESPACE} AS integer),
          CAST(${cinemaId} AS integer)
        )
      `;

      return action(transaction);
    },
  );
}
