import { PrismaService } from '../../prisma/prisma.service';

export async function createStaffingRequestAcceptedNotifications(
  prisma: PrismaService,
  cinemaId: number,
  requestId: number,
  acceptedByEmail: string,
) {
  const admins = await prisma.user.findMany({
    where: {
      cinemaId,
      role: 'ADMIN',
      isActive: true,
    },
    select: {
      id: true,
    },
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
