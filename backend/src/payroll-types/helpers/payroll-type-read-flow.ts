import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
  ensurePayrollTypeAdmin,
  getRequiredPayrollTypeCinemaId,
} from './payroll-type-access';

export async function findPayrollTypes(
  prisma: PrismaService,
  user: AuthUser,
  selectedCinemaId?: CinemaContextValue,
) {
  ensurePayrollTypeAdmin(user);

  const cinemaId = getRequiredPayrollTypeCinemaId(user, selectedCinemaId);

  return prisma.payrollType.findMany({
    where: {
      cinemaId,
    },
    orderBy: {
      name: 'asc',
    },
  });
}
