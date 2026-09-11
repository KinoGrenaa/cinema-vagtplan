import { NotFoundException } from '@nestjs/common';
import {
  ShiftTradeResolutionReason,
} from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  acquireShiftAdvisoryLock,
  SHIFT_RECORD_LOCK_NAMESPACE,
} from './shift-advisory-lock';
import {
  AuthUser,
  getShiftUserLabel,
  resolveShiftCinemaId,
  shiftResponseInclude,
} from './shift-service-helpers';
import {
  resolveOpenShiftLinkedActions,
} from './shift-linked-actions';
import {
  assertShiftHasNoActiveTimeEntry,
} from './shift-time-entry-lock';

export async function deleteShiftFlow({
  prisma,
  realtimeGateway,
  pushService,
  auditLogsService,
  formatShiftTime,
  user,
  id,
  selectedCinemaId,
}: {
  prisma: PrismaService;
  realtimeGateway: RealtimeGateway;
  pushService: PushService;
  auditLogsService: AuditLogsService;
  formatShiftTime: (
    startTime: Date,
    endTime: Date,
  ) => string;
  user: AuthUser;
  id: number;
  selectedCinemaId?: number | null;
}) {
  const cinemaId = resolveShiftCinemaId(
    user,
    selectedCinemaId,
  );
  const deletionResult =
    await prisma.$transaction(async (tx) => {
      await acquireShiftAdvisoryLock(
        tx,
        SHIFT_RECORD_LOCK_NAMESPACE,
        id,
      );

      const shift =
        await tx.shift.findFirst({
          where: {
            id,
            cinemaId,
          },
          include: shiftResponseInclude,
        });

      if (!shift) {
        throw new NotFoundException(
          'Vagten blev ikke fundet',
        );
      }

      await assertShiftHasNoActiveTimeEntry(
        tx,
        {
          cinemaId,
          shiftId: id,
        },
      );

      const linkedActions =
        await resolveOpenShiftLinkedActions(
          tx,
          {
            cinemaId,
            shiftId: id,
            resolvedByUserId: user.sub!,
            resolutionReason:
              ShiftTradeResolutionReason.SHIFT_DELETED,
          },
        );

      if (shift.userId) {
        await tx.notification.create({
          data: {
            userId: shift.userId,
            cinemaId: shift.cinemaId,
            title: 'Vagt slettet',
            message:
              `${shift.jobFunctionNameSnapshot} - ${formatShiftTime(
                shift.startTime,
                shift.endTime,
              )}`,
            type: 'SYSTEM',
            linkUrl: '/my-shifts',
          },
        });
      }

      const deleted =
        await tx.shift.deleteMany({
          where: {
            id,
            cinemaId,
          },
        });

      if (deleted.count !== 1) {
        throw new NotFoundException(
          'Vagten blev ikke fundet',
        );
      }

      return {
        shift,
        linkedActions,
      };
    });

  const {
    shift: shiftToDelete,
    linkedActions,
  } = deletionResult;

  await auditLogsService.create({
    action: 'DELETE_SHIFT',
    entityType: 'Shift',
    entityId: shiftToDelete.id,
    description:
      `Slettede vagt for ${getShiftUserLabel(
        shiftToDelete,
      )}: ${shiftToDelete.jobFunctionNameSnapshot} - ${formatShiftTime(
        shiftToDelete.startTime,
        shiftToDelete.endTime,
      )}`,
    userId: user.sub,
    cinemaId: shiftToDelete.cinemaId,
  });
  realtimeGateway.notifyCinema(
    shiftToDelete.cinemaId,
    'shiftsUpdated',
    {
      id: shiftToDelete.id,
      cinemaId: shiftToDelete.cinemaId,
      deleted: true,
    },
  );

  if (linkedActions.tradeIds.length > 0) {
    realtimeGateway.notifyCinema(
      shiftToDelete.cinemaId,
      'shiftTradesUpdated',
      {
        shiftId: shiftToDelete.id,
        resolved: true,
      },
    );
  }

  if (
    linkedActions.staffingRequestIds
      .length > 0
  ) {
    realtimeGateway.notifyCinema(
      shiftToDelete.cinemaId,
      'staffingRequestsUpdated',
      {
        shiftId: shiftToDelete.id,
        resolved: true,
      },
    );
  }

  for (const notice of linkedActions.cancellationNotices) {
    await pushService.sendToUserInCinema(
      notice.userId,
      shiftToDelete.cinemaId,
      {
        title: notice.title,
        body: notice.message,
        url: notice.linkUrl,
      },
    );
  }
  for (
    const notificationUserId of
    linkedActions.notificationUserIds
  ) {
    realtimeGateway.notifyUser(
      notificationUserId,
      'notificationsUpdated',
      {
        cinemaId:
          shiftToDelete.cinemaId,
        shiftId:
          shiftToDelete.id,
        resolved: true,
      },
    );
  }

  if (
    shiftToDelete.userId &&
    !linkedActions.notificationUserIds.includes(
      shiftToDelete.userId,
    )
  ) {
    realtimeGateway.notifyUser(
      shiftToDelete.userId,
      'notificationsUpdated',
      {
        cinemaId:
          shiftToDelete.cinemaId,
        shiftId:
          shiftToDelete.id,
        deleted: true,
      },
    );
  }

  if (shiftToDelete.userId) {
    await pushService.sendToUserInCinema(
      shiftToDelete.userId,
      shiftToDelete.cinemaId,
      {
        title: 'Vagt slettet',
        body:
          `${shiftToDelete.jobFunctionNameSnapshot} - ${formatShiftTime(
            shiftToDelete.startTime,
            shiftToDelete.endTime,
          )}`,
        url: '/my-shifts',
      },
    );
  }

  return shiftToDelete;
}
