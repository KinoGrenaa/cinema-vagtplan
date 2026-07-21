import type { PrismaService } from '../../prisma/prisma.service';
import {
  ensurePayrollTypeAdmin,
  ensurePayrollTypeCodeAvailable,
  getRequiredPayrollTypeCinemaId,
  normalizeOptionalDescription,
  normalizeOptionalExportCode,
  normalizeOptionalIsDefault,
  normalizeOptionalPayrollTypeColor,
  normalizePayrollTypeCode,
  normalizePayrollTypeName,
  withPayrollTypeCinemaLock,
  type AuthUser,
  type PayrollTypeCreateData,
} from './payroll-type-access';

export async function createPayrollType(
  prisma: PrismaService,
  user: AuthUser,
  data: PayrollTypeCreateData,
) {
  ensurePayrollTypeAdmin(user);

  const cinemaId =
    getRequiredPayrollTypeCinemaId(
      user,
      data?.cinemaId,
    );
  const name = normalizePayrollTypeName(
    data?.name,
  );
  const payrollCode =
    normalizePayrollTypeCode(
      data?.payrollCode,
    );
  const exportCode =
    normalizeOptionalExportCode(
      data?.exportCode,
    ) ?? null;
  const description =
    normalizeOptionalDescription(
      data?.description,
    ) ?? null;
  const color =
    normalizeOptionalPayrollTypeColor(
      data?.color,
    ) ?? null;
  const isDefault =
    normalizeOptionalIsDefault(
      data?.isDefault,
    ) ?? false;

  return withPayrollTypeCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      await ensurePayrollTypeCodeAvailable(
        transaction,
        cinemaId,
        payrollCode,
      );

      if (isDefault) {
        await transaction.payrollType.updateMany({
          where: {
            cinemaId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return transaction.payrollType.create({
        data: {
          cinemaId,
          name,
          payrollCode,
          exportCode,
          description,
          color,
          isDefault,
          isActive: true,
        },
      });
    },
  );
}
