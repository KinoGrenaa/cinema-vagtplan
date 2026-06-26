import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getActorName } from './leave-request-notification-actors';
import {
  notifyLeaveManagers,
  notifyLeaveUser,
} from './leave-request-notification-delivery';
import {
  buildLeaveRequestApprovedUserNotification,
  buildLeaveRequestCancelledByAdminUserNotification,
  buildLeaveRequestCancelledByEmployeeManagerNotification,
  buildLeaveRequestCreatedManagerNotification,
  buildLeaveRequestRejectedUserNotification,
} from './leave-request-notification-messages';
import {
  LeaveRequestWithUser,
  LeaveStatus,
} from './leave-request-service-helpers';

export async function notifyLeaveRequestCreated(params: {
  prisma: PrismaService;
  notificationsService: NotificationsService;
  leaveRequest: LeaveRequestWithUser;
  actorUserId: number;
}) {
  const notification = buildLeaveRequestCreatedManagerNotification(
    params.leaveRequest,
  );

  await notifyLeaveManagers({
    prisma: params.prisma,
    notificationsService: params.notificationsService,
    cinemaId: params.leaveRequest.cinemaId,
    excludeUserId: params.actorUserId,
    ...notification,
  });
}

export async function notifyLeaveRequestStatusChanged(params: {
  prisma: PrismaService;
  notificationsService: NotificationsService;
  leaveRequest: LeaveRequestWithUser;
  actorUserId: number;
  status: LeaveStatus;
}) {
  const actorName = await getActorName(params.prisma, params.actorUserId);

  if (params.status === 'APPROVED') {
    if (params.leaveRequest.userId !== params.actorUserId) {
      await notifyLeaveUser({
        notificationsService: params.notificationsService,
        userId: params.leaveRequest.userId,
        cinemaId: params.leaveRequest.cinemaId,
        ...buildLeaveRequestApprovedUserNotification(
          params.leaveRequest,
          actorName,
        ),
      });
    }

    return;
  }

  if (params.status === 'REJECTED') {
    if (params.leaveRequest.userId !== params.actorUserId) {
      await notifyLeaveUser({
        notificationsService: params.notificationsService,
        userId: params.leaveRequest.userId,
        cinemaId: params.leaveRequest.cinemaId,
        ...buildLeaveRequestRejectedUserNotification(
          params.leaveRequest,
          actorName,
        ),
      });
    }

    return;
  }

  const isCancelledByOwner =
    params.status === 'CANCELLED' &&
    params.leaveRequest.userId === params.actorUserId;

  if (isCancelledByOwner) {
    await notifyLeaveManagers({
      prisma: params.prisma,
      notificationsService: params.notificationsService,
      cinemaId: params.leaveRequest.cinemaId,
      excludeUserId: params.actorUserId,
      ...buildLeaveRequestCancelledByEmployeeManagerNotification(
        params.leaveRequest,
      ),
    });

    return;
  }

  if (params.leaveRequest.userId !== params.actorUserId) {
    await notifyLeaveUser({
      notificationsService: params.notificationsService,
      userId: params.leaveRequest.userId,
      cinemaId: params.leaveRequest.cinemaId,
      ...buildLeaveRequestCancelledByAdminUserNotification(
        params.leaveRequest,
        actorName,
      ),
    });
  }
}
