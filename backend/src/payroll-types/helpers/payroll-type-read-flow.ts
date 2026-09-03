import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
  ensurePayrollTypeAdmin,
  getRequiredPayrollTypeCinemaId,
} from './payroll-type-access';
import {
  ensureManualEntryPayrollType,
} from './payroll-type-system';

export async function findPayrollTypes(
  prisma: PrismaService,
  user: AuthUser,
  selectedCinemaId?: CinemaContextValue,
) {
  ensurePayrollTypeAdmin(user);

  const cinemaId = getRequiredPayrollTypeCinemaId(user, selectedCinemaId);

  await ensureManualEntryPayrollType(
    prisma,
    cinemaId,
  );

  return prisma.payrollType.findMany({
    where: {
      cinemaId,
    },
    orderBy: {
      name: 'asc',
    },
  });
}
