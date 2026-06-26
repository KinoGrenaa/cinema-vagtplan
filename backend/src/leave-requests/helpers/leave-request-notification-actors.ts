import { PrismaService } from '../../prisma/prisma.service';
import { formatUserName } from './leave-request-formatting';

export async function getLeaveManagers(
  prisma: PrismaService,
  cinemaId: number,
  excludeUserId?: number,
) {
  return prisma.user.findMany({
    where: {
      cinemaId,
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      OR: [
        { role: 'ADMIN' },
        { role: 'MASTER' },
        { canManageLeaveRequests: true },
      ],
    },
    select: {
      id: true,
    },
  });
}

export async function getActorName(prisma: PrismaService, userId: number) {
  const actor = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  return formatUserName(actor ?? undefined);
}
