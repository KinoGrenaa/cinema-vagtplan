import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  formatLeavePeriod,
  formatUserName,
} from './leave-request-formatting';
import {
  LeaveRequestWithUser,
  LeaveStatus,
} from './leave-request-service-helpers';

async function getLeaveManagers(
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

async function notifyLeaveManagers(params: {
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

async function notifyUser(params: {
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

async function getActorName(prisma: PrismaService, userId: number) {
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

export async function notifyLeaveRequestCreated(params: {
  prisma: PrismaService;
  notificationsService: NotificationsService;
  leaveRequest: LeaveRequestWithUser;
  actorUserId: number;
}) {
  const employeeName = formatUserName(params.leaveRequest.user);
  const period = formatLeavePeriod(
    params.leaveRequest.startDate,
    params.leaveRequest.endDate,
  );

  await notifyLeaveManagers({
    prisma: params.prisma,
    notificationsService: params.notificationsService,
    cinemaId: params.leaveRequest.cinemaId,
    excludeUserId: params.actorUserId,
    title: 'Ny fraværsansøgning',
    message: `${period}
${employeeName} har anmodet om fravær.`,
    type: 'LEAVE_REQUEST_CREATED',
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
  const period = formatLeavePeriod(
    params.leaveRequest.startDate,
    params.leaveRequest.endDate,
  );

  if (params.status === 'APPROVED') {
    if (params.leaveRequest.userId !== params.actorUserId) {
      await notifyUser({
        notificationsService: params.notificationsService,
        userId: params.leaveRequest.userId,
        cinemaId: params.leaveRequest.cinemaId,
        title: 'Fravær godkendt',
        message: `${period}
${actorName} har godkendt dit fravær.`,
        type: 'LEAVE_REQUEST_APPROVED',
      });
    }

    return;
  }

  if (params.status === 'REJECTED') {
    if (params.leaveRequest.userId !== params.actorUserId) {
      await notifyUser({
        notificationsService: params.notificationsService,
        userId: params.leaveRequest.userId,
        cinemaId: params.leaveRequest.cinemaId,
        title: 'Fravær afvist',
        message: `${period}
${actorName} har afvist dit fravær.`,
        type: 'LEAVE_REQUEST_REJECTED',
      });
    }

    return;
  }

  const isCancelledByOwner =
    params.status === 'CANCELLED' &&
    params.leaveRequest.userId === params.actorUserId;

  if (isCancelledByOwner) {
    const employeeName = formatUserName(params.leaveRequest.user);

    await notifyLeaveManagers({
      prisma: params.prisma,
      notificationsService: params.notificationsService,
      cinemaId: params.leaveRequest.cinemaId,
      excludeUserId: params.actorUserId,
      title: 'Fravær annulleret',
      message: `${period}
${employeeName} har annulleret sin fraværsansøgning.`,
      type: 'LEAVE_REQUEST_CANCELLED_BY_EMPLOYEE',
    });

    return;
  }

  if (params.leaveRequest.userId !== params.actorUserId) {
    await notifyUser({
      notificationsService: params.notificationsService,
      userId: params.leaveRequest.userId,
      cinemaId: params.leaveRequest.cinemaId,
      title: 'Fravær annulleret',
      message: `${period}
${actorName} har annulleret dit fravær.`,
      type: 'LEAVE_REQUEST_CANCELLED_BY_ADMIN',
    });
  }
}
