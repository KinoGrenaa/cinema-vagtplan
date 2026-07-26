import type { PrismaService } from '../../prisma/prisma.service';
import {
  type AuthUser,
  resolveEmployeeDocumentCinemaId,
} from './employee-document-access';
import { EMPLOYEE_DOCUMENT_PAGE_SIZE } from './employee-document-list-query';

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
      cinemaId,
      userId: targetUserId,
    },
    orderBy: [
      {
        createdAt: 'desc',
      },
      {
        id: 'desc',
      },
    ],
    take: EMPLOYEE_DOCUMENT_PAGE_SIZE,
  });
}
