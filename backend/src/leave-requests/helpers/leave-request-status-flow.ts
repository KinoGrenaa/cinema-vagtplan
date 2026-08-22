import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { AbsenceImpactEngineService } from '../../staffing-ai/absence-impact-engine.service';
import {
  ensureLeaveActorCinemaAccess,
} from './leave-request-cinema-access';
import {
  AuthUser,
  LeaveStatus,
  ensureLeaveStatusChangeAllowed,
  requireUserId,
  resolveLeaveCinemaId,
  validateLeaveRequestDates,
} from './leave-request-service-helpers';
import {
  notifyLeaveRequestStatusChanged,
} from './leave-request-notifications';
import {
  normalizeLeaveStatusNote,
} from './leave-request-status-note';
import {
  analyzeAbsenceImpact,
  ensureNoOverlappingLeaveRequest,
  ensureNoOverlappingShift,
  notifyLeaveRequestsUpdated,
} from './leave-request-processing-helpers';

export async function updateLeaveRequestStatusFlow(
  params: {
    prisma: PrismaService;
    absenceImpactEngineService:
      AbsenceImpactEngineService;
    realtimeGateway: RealtimeGateway;
    notificationsService: NotificationsService;
    user: AuthUser;
    id: number;
    status: LeaveStatus;
    note?: string;
    selectedCinemaId?: number | null;
  },
) {
  const requestId = Number(params.id);

  if (
    !Number.isInteger(requestId) ||
    requestId <= 0
  ) {
    throw new NotFoundException(
      'Fraværsansøgningen blev ikke fundet.',
    );
  }

  const actorUserId = requireUserId(
    params.user,
  );
  const cinemaId = resolveLeaveCinemaId(
    params.user,
    params.selectedCinemaId,
  );
  const isAdmin =
    params.user.role === 'ADMIN' ||
    params.user.role === 'MASTER';
  const statusNote =
    normalizeLeaveStatusNote({
      isAdmin,
      status: params.status,
      note: params.note,
    });

  await ensureLeaveActorCinemaAccess(
    params.prisma,
    params.user,
    cinemaId,
  );

  const leaveRequest =
    await params.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw(
          Prisma.sql`
            SELECT pg_advisory_xact_lock(
              54002::integer,
              ${requestId}::integer
            )
          `,
        );

        const existing =
          await tx.leaveRequest.findFirst({
            where: {
              id: requestId,
              cinemaId,
            },
          });

        if (!existing) {
          throw new NotFoundException(
            'Fraværsansøgningen blev ikke fundet.',
          );
        }

        await tx.$executeRaw(
          Prisma.sql`
            SELECT pg_advisory_xact_lock(
              54001::integer,
              ${existing.userId}::integer
            )
          `,
        );

        ensureLeaveStatusChangeAllowed({
          actorUserId,
          existing,
          isAdmin,
          status: params.status,
        });

        if (params.status === 'APPROVED') {
          validateLeaveRequestDates(
            existing.startDate,
            existing.endDate,
          );
          await ensureNoOverlappingShift({
            prisma: tx,
            userId: existing.userId,
            cinemaId: existing.cinemaId,
            startDate: existing.startDate,
            endDate: existing.endDate,
          });
          await ensureNoOverlappingLeaveRequest({
            prisma: tx,
            userId: existing.userId,
            cinemaId: existing.cinemaId,
            startDate: existing.startDate,
            endDate: existing.endDate,
            excludeLeaveRequestId:
              existing.id,
            statuses: ['APPROVED'],
          });
        }

        const updated =
          await tx.leaveRequest.updateMany({
            where: {
              id: requestId,
              cinemaId,
              status: existing.status,
            },
            data: {
              status: params.status,
              ...(params.status === 'CANCELLED'
                ? {
                    cancelledAt:
                      new Date(),
                    cancelledByUserId:
                      actorUserId,
                    cancellationNote:
                      statusNote,
                  }
                : {}),
              ...(params.status === 'REJECTED'
                ? {
                    rejectedAt:
                      new Date(),
                    rejectedByUserId:
                      actorUserId,
                    rejectionNote:
                      statusNote,
                  }
                : {}),
            },
          });

        if (updated.count !== 1) {
          throw new ConflictException(
            'Fraværsansøgningen blev ændret af en anden. Genindlæs og prøv igen.',
          );
        }

        return tx.leaveRequest.findUnique({
          where: {
            id: requestId,
          },
          include: {
            user: true,
            cancelledByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            rejectedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });
      },
    );

  if (!leaveRequest) {
    throw new NotFoundException(
      'Fraværsansøgningen blev ikke fundet.',
    );
  }

  await notifyLeaveRequestStatusChanged({
    prisma: params.prisma,
    notificationsService:
      params.notificationsService,
    leaveRequest,
    actorUserId,
    status: params.status,
  });

  notifyLeaveRequestsUpdated(
    params.realtimeGateway,
    leaveRequest.cinemaId,
  );

  const absenceImpact =
    params.status === 'APPROVED'
      ? await analyzeAbsenceImpact({
          absenceImpactEngineService:
            params.absenceImpactEngineService,
          leaveRequest,
        })
      : null;

  return {
    leaveRequest,
    absenceImpact,
  };
}
