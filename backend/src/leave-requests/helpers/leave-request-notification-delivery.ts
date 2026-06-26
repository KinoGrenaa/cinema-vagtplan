import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getLeaveManagers } from './leave-request-notification-actors';

export async function notifyLeaveManagers(params: {
  prisma: PrismaService;
  notificationsService: NotificationsService;
  cinemaId: number;
  excludeUserId?: number;
  title: string;
  message: string;
  type: string;
}) {
  const managers = await getLeaveManagers(
    params.prisma,
    params.cinemaId,
    params.excludeUserId,
  );

  await Promise.all(
    managers.map((manager) =>
      params.notificationsService.create({
        userId: manager.id,
        cinemaId: params.cinemaId,
        title: params.title,
        message: params.message,
        type: params.type,
        linkUrl: '/leave-approval',
      }),
    ),
  );
}

export async function notifyLeaveUser(params: {
  notificationsService: NotificationsService;
  userId: number;
  cinemaId: number;
  title: string;
  message: string;
  type: string;
}) {
  await params.notificationsService.create({
    userId: params.userId,
    cinemaId: params.cinemaId,
    title: params.title,
    message: params.message,
    type: params.type,
    linkUrl: '/leave-requests',
  });
}
