import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureUserCanAccessTimeEntry } from './time-entry-access';
import { findTimeEntryRevisionTargetOrThrow } from './time-entry-query-helpers';

export async function findRevisionsForTimeEntry(params: {
  prisma: PrismaService;
  user: any;
  id: number;
  selectedCinemaId?: number | null;
}) {
  const { prisma, user, id, selectedCinemaId } = params;

  const entry = await findTimeEntryRevisionTargetOrThrow(prisma, id);

  if (user.role === 'EMPLOYEE' && entry.userId !== user.sub) {
    throw new BadRequestException(
      'Du kan kun se historik for dine egne tidsregistreringer',
    );
  }

  ensureUserCanAccessTimeEntry(user, entry, selectedCinemaId);

  return prisma.timeEntryRevision.findMany({
    where: {
      timeEntryId: id,
    },
    include: {
      changedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
