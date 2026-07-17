import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';

import {
  type AuthUser,
  resolveEmployeeDocumentCinemaId,
} from './employee-document-access';

export async function deleteEmployeeDocument(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: number | null,
) {
  const cinemaId = resolveEmployeeDocumentCinemaId(user, selectedCinemaId);

  const document = await prisma.employeeDocument.findFirst({
    where: {
      id,
      cinemaId,
    },
  });

  if (!document) {
    throw new NotFoundException('Dokumentet blev ikke fundet');
  }

  if (user.role === 'EMPLOYEE' && document.userId !== user.sub) {
    throw new ForbiddenException('Du har ikke adgang til dette dokument');
  }

  return prisma.employeeDocument.delete({
    where: {
      id,
    },
  });
}
