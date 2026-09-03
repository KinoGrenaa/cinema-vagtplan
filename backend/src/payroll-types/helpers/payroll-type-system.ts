import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { PrismaService } from '../../prisma/prisma.service';
import {
  withPayrollTypeCinemaLock,
  type PayrollTypeUpdateData,
} from './payroll-type-access';

export const MANUAL_ENTRY_PAYROLL_CODE = 'MANUAL_ENTRY';
export const MANUAL_ENTRY_PAYROLL_NAME = 'Manuel registrering';
export const MANUAL_ENTRY_PAYROLL_DESCRIPTION =
  'Systemløntype til manuelle tidsregistreringer uden en planlagt vagt.';
export const MANUAL_ENTRY_PAYROLL_COLOR = '#64748b';

type PayrollTypeIdentity = {
  payrollCode?: string | null;
};

export function isManualEntryPayrollTypeCode(value: unknown) {
  return (
    typeof value === 'string' &&
    value.trim().toUpperCase() === MANUAL_ENTRY_PAYROLL_CODE
  );
}

export function isManualEntryPayrollType(
  payrollType: PayrollTypeIdentity | null | undefined,
) {
  return isManualEntryPayrollTypeCode(payrollType?.payrollCode);
}

export function ensureUserManagedPayrollTypeCode(payrollCode: string) {
  if (isManualEntryPayrollTypeCode(payrollCode)) {
    throw new BadRequestException(
      'MANUAL_ENTRY er reserveret til systemløntypen Manuel registrering.',
    );
  }
}

export function ensureManualEntryPayrollTypeUpdateAllowed(
  payrollType: PayrollTypeIdentity,
  data: PayrollTypeUpdateData,
) {
  if (!isManualEntryPayrollType(payrollType)) {
    return;
  }

  const hasImmutableChange =
    data?.name !== undefined ||
    data?.payrollCode !== undefined ||
    data?.description !== undefined ||
    data?.color !== undefined ||
    data?.isDefault !== undefined ||
    data?.isActive !== undefined;

  if (hasImmutableChange) {
    throw new BadRequestException(
      'Systemløntypen Manuel registrering kan kun få ændret sin eksportkode.',
    );
  }
}

export function ensureManualEntryPayrollTypeRemovable(
  payrollType: PayrollTypeIdentity,
) {
  if (isManualEntryPayrollType(payrollType)) {
    throw new BadRequestException(
      'Systemløntypen Manuel registrering kan ikke slettes.',
    );
  }
}

export async function ensureManualEntryPayrollType(
  prisma: PrismaService,
  cinemaId: number,
) {
  return withPayrollTypeCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      const existing =
        await transaction.payrollType.findFirst({
          where: {
            cinemaId,
            payrollCode: MANUAL_ENTRY_PAYROLL_CODE,
          },
        });

      if (!existing) {
        return transaction.payrollType.create({
          data: {
            cinemaId,
            name: MANUAL_ENTRY_PAYROLL_NAME,
            payrollCode: MANUAL_ENTRY_PAYROLL_CODE,
            exportCode: null,
            description: MANUAL_ENTRY_PAYROLL_DESCRIPTION,
            color: MANUAL_ENTRY_PAYROLL_COLOR,
            isDefault: false,
            isActive: true,
          },
        });
      }

      const updateData: Prisma.PayrollTypeUncheckedUpdateInput = {};

      if (existing.name !== MANUAL_ENTRY_PAYROLL_NAME) {
        updateData.name = MANUAL_ENTRY_PAYROLL_NAME;
      }
      if (existing.description !== MANUAL_ENTRY_PAYROLL_DESCRIPTION) {
        updateData.description = MANUAL_ENTRY_PAYROLL_DESCRIPTION;
      }
      if (existing.color !== MANUAL_ENTRY_PAYROLL_COLOR) {
        updateData.color = MANUAL_ENTRY_PAYROLL_COLOR;
      }
      if (existing.isDefault) {
        updateData.isDefault = false;
      }
      if (!existing.isActive) {
        updateData.isActive = true;
      }

      if (Object.keys(updateData).length === 0) {
        return existing;
      }

      return transaction.payrollType.update({
        where: {
          id: existing.id,
        },
        data: updateData,
      });
    },
  );
}
