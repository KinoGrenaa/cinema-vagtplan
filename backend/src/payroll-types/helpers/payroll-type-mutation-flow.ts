import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  ensurePayrollTypeAdmin,
  ensurePayrollTypeCodeAvailable,
  ensurePayrollTypeUnused,
  findPayrollTypeForCinema,
  getRequiredPayrollTypeCinemaId,
  normalizeOptionalDescription,
  normalizeOptionalExportCode,
  normalizeOptionalIsActive,
  normalizeOptionalIsDefault,
  normalizeOptionalPayrollTypeColor,
  normalizePayrollTypeCode,
  normalizePayrollTypeName,
  withPayrollTypeCinemaLock,
  type AuthUser,
  type CinemaContextValue,
  type PayrollTypeUpdateData,
} from './payroll-type-access';

export async function updatePayrollType(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  data: PayrollTypeUpdateData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensurePayrollTypeAdmin(user);

  const cinemaId =
    getRequiredPayrollTypeCinemaId(
      user,
      selectedCinemaId ?? data?.cinemaId,
    );
  const name =
    data?.name === undefined
      ? undefined
      : normalizePayrollTypeName(data.name);
  const payrollCode =
    data?.payrollCode === undefined
      ? undefined
      : normalizePayrollTypeCode(
          data.payrollCode,
        );
  const exportCode =
    normalizeOptionalExportCode(
      data?.exportCode,
    );
  const description =
    normalizeOptionalDescription(
      data?.description,
    );
  const color =
    normalizeOptionalPayrollTypeColor(
      data?.color,
    );
  const isDefault =
    normalizeOptionalIsDefault(
      data?.isDefault,
    );
  const isActive =
    normalizeOptionalIsActive(
      data?.isActive,
    );

  return withPayrollTypeCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      const existing =
        await findPayrollTypeForCinema(
          transaction,
          id,
          cinemaId,
        );

      if (
        payrollCode !== undefined &&
        payrollCode !== existing.payrollCode
      ) {
        await ensurePayrollTypeCodeAvailable(
          transaction,
          cinemaId,
          payrollCode,
          existing.id,
        );
      }

      const effectiveIsDefault =
        isDefault ?? existing.isDefault;
      const effectiveIsActive =
        isActive ?? existing.isActive;

      if (
        effectiveIsDefault &&
        !effectiveIsActive
      ) {
        throw new BadRequestException(
          'Standardlønarten skal være aktiv.',
        );
      }

      if (isDefault === true) {
        await transaction.payrollType.updateMany({
          where: {
            cinemaId,
            isDefault: true,
            id: {
              not: existing.id,
            },
          },
          data: {
            isDefault: false,
          },
        });
      }

      const updateData: Prisma.PayrollTypeUncheckedUpdateInput =
        {};

      if (name !== undefined) {
        updateData.name = name;
      }
      if (payrollCode !== undefined) {
        updateData.payrollCode = payrollCode;
      }
      if (exportCode !== undefined) {
        updateData.exportCode = exportCode;
      }
      if (description !== undefined) {
        updateData.description = description;
      }
      if (color !== undefined) {
        updateData.color = color;
      }
      if (isDefault !== undefined) {
        updateData.isDefault = isDefault;
      }
      if (isActive !== undefined) {
        updateData.isActive = isActive;
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

export async function removePayrollType(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensurePayrollTypeAdmin(user);

  const cinemaId =
    getRequiredPayrollTypeCinemaId(
      user,
      selectedCinemaId,
    );

  return withPayrollTypeCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      const existing =
        await findPayrollTypeForCinema(
          transaction,
          id,
          cinemaId,
        );

      await ensurePayrollTypeUnused(
        transaction,
        existing.id,
      );

      return transaction.payrollType.delete({
        where: {
          id: existing.id,
        },
      });
    },
  );
}
