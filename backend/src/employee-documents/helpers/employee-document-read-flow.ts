import type { PrismaService } from '../../prisma/prisma.service';
import {
  type AuthUser,
  resolveEmployeeDocumentCinemaId,
} from './employee-document-access';

export function findEmployeeDocumentsForUser(
  prisma: PrismaService,
  user: AuthUser,
  userId: number,
  selectedCinemaId?: number | null,
) {
  const cinemaId = resolveEmployeeDocumentCinemaId(user, selectedCinemaId);
  const targetUserId = user.role === 'EMPLOYEE' ? user.sub : userId;

  return prisma.employeeDocument.findMany({
    where: {
      userId: targetUserId,
      user: {
        cinemaId,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
