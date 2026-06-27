import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { AbsenceImpactEngineService } from '../../staffing-ai/absence-impact-engine.service';
import {
  AuthUser,
  requireUserId,
  resolveLeaveCinemaId,
  validateLeaveRequestDates,
} from './leave-request-service-helpers';
import { notifyLeaveRequestCreated } from './leave-request-notifications';
import {
  analyzeAbsenceImpact,
  ensureNoOverlappingShift,
  notifyLeaveRequestsUpdated,
} from './leave-request-processing-helpers';

type CreateLeaveRequestData = {
  startDate: string;
  endDate: string;
  reason?: string;
  cinemaId?: number;
  userId?: number;
};

function parseOptionalPositiveId(value: number | undefined, fieldName: string) {
  if (value === undefined || value === null) {
    return null;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException(`${fieldName} skal være et gyldigt ID`);
  }

  return id;
}

async function resolveLeaveRequestTarget(params: {
  prisma: PrismaService;
  user: AuthUser;
  data: CreateLeaveRequestData;
}) {
  const actorUserId = requireUserId(params.user);
  const cinemaId = resolveLeaveCinemaId(params.user, params.data.cinemaId);
  const requestedUserId = parseOptionalPositiveId(
    params.data.userId,
    'Medarbejder',
  );
  const canCreateForOthers =
    params.user.role === 'ADMIN' || params.user.role === 'MASTER';

  if (!canCreateForOthers && requestedUserId && requestedUserId !== actorUserId) {
    throw new ForbiddenException(
      'Du kan kun oprette fraværsansøgninger for dig selv.',
    );
  }

  if (params.user.role === 'MASTER' && !requestedUserId) {
    throw new BadRequestException(
      'Vælg en medarbejder, når du opretter fravær som MASTER.',
    );
  }

  const userId = canCreateForOthers && requestedUserId ? requestedUserId : actorUserId;

  const targetUser = await params.prisma.user.findFirst({
    where: {
      id: userId,
      cinemaId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!targetUser) {
    throw new BadRequestException(
      'Medarbejderen blev ikke fundet i den aktive biograf.',
    );
  }

  return {
    actorUserId,
    cinemaId,
    userId,
  };
}

export async function createLeaveRequestFlow(params: {
  prisma: PrismaService;
  absenceImpactEngineService: AbsenceImpactEngineService;
  realtimeGateway: RealtimeGateway;
  notificationsService: NotificationsService;
  user: AuthUser;
  data: CreateLeaveRequestData;
}) {
  const target = await resolveLeaveRequestTarget({
    prisma: params.prisma,
    user: params.user,
    data: params.data,
  });
  const startDate = new Date(params.data.startDate);
  const endDate = new Date(params.data.endDate);

  validateLeaveRequestDates(startDate, endDate);

  await ensureNoOverlappingShift({
    prisma: params.prisma,
    userId: target.userId,
    cinemaId: target.cinemaId,
    startDate,
    endDate,
  });

  const leaveRequest = await params.prisma.leaveRequest.create({
    data: {
      startDate,
      endDate,
      reason: params.data.reason,
      cinemaId: target.cinemaId,
      userId: target.userId,
      createdByUserId: target.actorUserId,
    },
    include: {
      user: true,
      createdByUser: true,
    },
  });

  await notifyLeaveRequestCreated({
    prisma: params.prisma,
    notificationsService: params.notificationsService,
    leaveRequest,
    actorUserId: target.actorUserId,
  });

  notifyLeaveRequestsUpdated(params.realtimeGateway, leaveRequest.cinemaId);

  const absenceImpact = await analyzeAbsenceImpact({
    absenceImpactEngineService: params.absenceImpactEngineService,
    leaveRequest,
  });

  return {
    leaveRequest,
    absenceImpact,
  };
}
