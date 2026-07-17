import { PrismaService } from '../../prisma/prisma.service';

export function buildAcceptedStaffingRequestAdminFilter(cinemaId: number) {
  return {
    role: 'ADMIN' as const,
    isActive: true,
    OR: [
      { cinemaId },
      {
        cinemaMemberships: {
          some: {
            cinemaId,
            isActive: true,
          },
        },
      },
    ],
  };
}

export async function createStaffingRequestAcceptedNotifications(
  prisma: PrismaService,
  cinemaId: number,
  requestId: number,
  acceptedByEmail: string,
) {
  const admins = await prisma.user.findMany({
    where: buildAcceptedStaffingRequestAdminFilter(cinemaId),
    select: { id: true },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      cinemaId,
      userId: admin.id,
      title: 'Bemandingsforespørgsel accepteret',
      message: `${acceptedByEmail} accepterede bemandingsforespørgsel #${requestId}`,
      type: 'STAFFING_ACCEPTED',
      linkUrl: '/staffing-requests',
    })),
  });
}
