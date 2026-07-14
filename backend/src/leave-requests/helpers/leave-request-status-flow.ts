import { NotFoundException } from '@nestjs/common';

import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { AbsenceImpactEngineService } from '../../staffing-ai/absence-impact-engine.service';
import { ensureLeaveActorCinemaAccess } from './leave-request-cinema-access';
import {
  AuthUser,
  LeaveStatus,
  ensureLeaveStatusChangeAllowed,
  requireUserId,
  resolveLeaveCinemaId,
  validateLeaveRequestDates,
} from './leave-request-service-helpers';
import { notifyLeaveRequestStatusChanged } from './leave-request-notifications';
import {
  analyzeAbsenceImpact,
  ensureNoOverlappingShift,
  notifyLeaveRequestsUpdated,
} from './leave-request-processing-helpers';

export async function updateLeaveRequestStatusFlow(
  params: {
    prisma: PrismaService;
    absenceImpactEngineService: AbsenceImpactEngineService;
    realtimeGateway: RealtimeGateway;
    notificationsService: NotificationsService;
    user: AuthUser;
    id: number;
    status: LeaveStatus;
    selectedCinemaId?: number | null;
  },
) {
  const userId = requireUserId(params.user);
  const cinemaId = resolveLeaveCinemaId(
    params.user,
    params.selectedCinemaId,
  );

  await ensureLeaveActorCinemaAccess(
    params.prisma,
    params.user,
    cinemaId,
  );

  const existing =
    await params.prisma.leaveRequest.findFirst({
      where: {
        id: params.id,
        cinemaId,
      },
    });

  if (!existing) {
    throw new NotFoundException(
      'Fraværsansøgningen blev ikke fundet.',
    );
  }

  ensureLeaveStatusChangeAllowed({
    actorUserId: userId,
    existing,
    isAdmin:
      params.user.role === 'ADMIN' ||
      params.user.role === 'MASTER',
    status: params.status,
  });

  if (params.status === 'APPROVED') {
    validateLeaveRequestDates(
      existing.startDate,
      existing.endDate,
    );

    await ensureNoOverlappingShift({
      prisma: params.prisma,
      userId: existing.userId,
      cinemaId: existing.cinemaId,
      startDate: existing.startDate,
      endDate: existing.endDate,
    });
  }

  const leaveRequest =
    await params.prisma.leaveRequest.update({
      where: {
        id: params.id,
      },
      data: {
        status: params.status,
      },
      include: {
        user: true,
      },
    });

  await notifyLeaveRequestStatusChanged({
    prisma: params.prisma,
    notificationsService: params.notificationsService,
    leaveRequest,
    actorUserId: userId,
    status: params.status,
  });

  notifyLeaveRequestsUpdated(
    params.realtimeGateway,
    leaveRequest.cinemaId,
  );

  let absenceImpact: any = null;

  if (params.status === 'APPROVED') {
    absenceImpact = await analyzeAbsenceImpact({
      absenceImpactEngineService:
        params.absenceImpactEngineService,
      leaveRequest,
    });
  }

  return {
    leaveRequest,
    absenceImpact,
  };
}
