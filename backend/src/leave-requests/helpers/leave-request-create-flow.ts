import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { AbsenceImpactEngineService } from '../../staffing-ai/absence-impact-engine.service';
import {
  ensureLeaveActorCinemaAccess,
  getActiveLeaveCinemaUserWhere,
} from './leave-request-cinema-access';
import {
  LeaveRequestCreateInput,
  normalizeLeaveRequestCreateInput,
} from './leave-request-input';
import {
  AuthUser,
  requireUserId,
  resolveLeaveCinemaId,
  validateLeaveRequestMinimumNotice,
} from './leave-request-service-helpers';
import { notifyLeaveRequestCreated } from './leave-request-notifications';
import {
  analyzeAbsenceImpact,
  ensureNoOverlappingLeaveRequest,
  ensureNoOverlappingShift,
  notifyLeaveRequestsUpdated,
} from './leave-request-processing-helpers';

async function resolveLeaveRequestTarget(
  params: {
    prisma: PrismaService;
    user: AuthUser;
    data: ReturnType<
      typeof normalizeLeaveRequestCreateInput
    >;
  },
) {
  const actorUserId = requireUserId(params.user);
  const cinemaId = resolveLeaveCinemaId(
    params.user,
    params.data.cinemaId,
  );

  await ensureLeaveActorCinemaAccess(
    params.prisma,
    params.user,
    cinemaId,
  );

  const requestedUserId = params.data.userId;
  const canCreateForOthers =
    params.user.role === 'ADMIN' ||
    params.user.role === 'MASTER';

  if (
    !canCreateForOthers &&
    requestedUserId &&
    requestedUserId !== actorUserId
  ) {
    throw new ForbiddenException(
      'Du kan kun oprette fraværsansøgninger for dig selv.',
    );
  }

  if (
    params.user.role === 'MASTER' &&
    !requestedUserId
  ) {
    throw new BadRequestException(
      'Vælg en medarbejder, når du opretter fravær som MASTER.',
    );
  }

  const userId =
    canCreateForOthers && requestedUserId
      ? requestedUserId
      : actorUserId;
  const targetUser =
    await params.prisma.user.findFirst({
      where: getActiveLeaveCinemaUserWhere(
        userId,
        cinemaId,
      ),
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

export async function createLeaveRequestFlow(
  params: {
    prisma: PrismaService;
    absenceImpactEngineService:
      AbsenceImpactEngineService;
    realtimeGateway: RealtimeGateway;
    notificationsService: NotificationsService;
    user: AuthUser;
    data: LeaveRequestCreateInput;
  },
) {
  const normalized =
    normalizeLeaveRequestCreateInput(
      params.data,
    );
  const target = await resolveLeaveRequestTarget({
    prisma: params.prisma,
    user: params.user,
    data: normalized,
  });

  const cinemaSettings =
    await params.prisma.cinema.findUnique({
      where: {
        id: target.cinemaId,
      },
      select: {
        leaveRequestMinimumNoticeDays:
          true,
      },
    });
  if (!cinemaSettings) {
    throw new BadRequestException(
      'Biografen blev ikke fundet.',
    );
  }

  validateLeaveRequestMinimumNotice(
    normalized.startDate,
    cinemaSettings.leaveRequestMinimumNoticeDays,
  );

  const leaveRequest =
    await params.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw(
          Prisma.sql`
            SELECT pg_advisory_xact_lock(
              54001::integer,
              ${target.userId}::integer
            )
          `,
        );

        await ensureNoOverlappingShift({
          prisma: tx,
          userId: target.userId,
          cinemaId: target.cinemaId,
          startDate: normalized.startDate,
          endDate: normalized.endDate,
        });
        await ensureNoOverlappingLeaveRequest({
          prisma: tx,
          userId: target.userId,
          cinemaId: target.cinemaId,
          startDate: normalized.startDate,
          endDate: normalized.endDate,
        });

        return tx.leaveRequest.create({
          data: {
            startDate: normalized.startDate,
            endDate: normalized.endDate,
            reason: normalized.reason ?? null,
            cinemaId: target.cinemaId,
            userId: target.userId,
            createdByUserId:
              target.actorUserId,
          },
          include: {
            user: true,
            createdByUser: true,
          },
        });
      },
    );

  await notifyLeaveRequestCreated({
    prisma: params.prisma,
    notificationsService:
      params.notificationsService,
    leaveRequest,
    actorUserId: target.actorUserId,
  });

  notifyLeaveRequestsUpdated(
    params.realtimeGateway,
    leaveRequest.cinemaId,
  );

  const absenceImpact =
    await analyzeAbsenceImpact({
      absenceImpactEngineService:
        params.absenceImpactEngineService,
      leaveRequest,
    });

  return {
    leaveRequest,
    absenceImpact,
  };
}
