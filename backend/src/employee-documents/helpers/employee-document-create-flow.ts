import { ForbiddenException, NotFoundException } from '@nestjs/common';

import type { PrismaService } from '../../prisma/prisma.service';
import {
  type AuthUser,
  resolveEmployeeDocumentCinemaId,
} from './employee-document-access';

export type CreateEmployeeDocumentData = {
  userId: number;
  title: string;
  fileUrl: string;
  fileName: string;
  fileType?: string;
  cinemaId?: number | null;
};

export async function createEmployeeDocument(
  prisma: PrismaService,
  user: AuthUser,
  data: CreateEmployeeDocumentData,
) {
  const cinemaId = resolveEmployeeDocumentCinemaId(user, data.cinemaId);

  if (user.role === 'EMPLOYEE' && data.userId !== user.sub) {
    throw new ForbiddenException(
      'Du kan kun uploade dokumenter til dig selv',
    );
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: data.userId,
      cinemaId,
    },
  });

  if (!targetUser) {
    throw new NotFoundException('Brugeren blev ikke fundet i denne biograf');
  }

  return prisma.employeeDocument.create({
    data: {
      userId: data.userId,
      title: data.title,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileType: data.fileType,
    },
  });
}
