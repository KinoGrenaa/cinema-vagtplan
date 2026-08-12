import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type {
  Prisma,
} from '@prisma/client';

import {
  AuditLogsService,
} from '../../audit-logs/audit-logs.service';
import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  getMyShiftNotificationLink,
} from '../../notifications/helpers/notification-deep-links';
import {
  PushService,
} from '../../push/push.service';
import {
  RealtimeGateway,
} from '../../realtime/realtime.gateway';
import {
  acquireShiftAdvisoryLock,
  SHIFT_RECORD_LOCK_NAMESPACE,
  SHIFT_USER_LOCK_NAMESPACE,
} from './shift-advisory-lock';
import {
  normalizeShiftWriteData,
} from './shift-input';
import {
  AuthUser,
  ShiftWriteData,
  getShiftUserLabel,
  resolveShiftCinemaId,
  shiftResponseInclude,
} from './shift-service-helpers';
import {
  getShiftUpdateContext,
} from './shift-update-validation';
import {
  resolveOpenShiftLinkedActions,
} from './shift-linked-actions';

async function acquireShiftUserLocks(
  transaction:
    Prisma.TransactionClient,
  userIds: Array<
    number | null | undefined
  >,
) {
  const uniqueUserIds = [
    ...new Set(
      userIds.filter(
        (
          value,
        ): value is number =>
          Number.isInteger(value) &&
          Number(value) > 0,
      ),
    ),
  ].sort(
    (left, right) =>
      left - right,
  );

  for (
    const userId of uniqueUserIds
  ) {
    await acquireShiftAdvisoryLock(
      transaction,
      SHIFT_USER_LOCK_NAMESPACE,
      userId,
    );
  }
}

export async function updateShiftFlow({
  prisma,
  realtimeGateway,
  pushService,
  auditLogsService,
  formatShiftTime,
  user,
  id,
  data,
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
  data: ShiftWriteData;
}) {
  const normalized =
    normalizeShiftWriteData(data);
  const cinemaId =
    resolveShiftCinemaId(
      user,
      normalized.cinemaId,
    );

  const result =
    await prisma.$transaction(
      async (transaction) => {
        await acquireShiftAdvisoryLock(
          transaction,
          SHIFT_RECORD_LOCK_NAMESPACE,
          id,
        );

        const oldShift =
          await transaction.shift.findFirst(
            {
              where: {
                id,
                cinemaId,
              },
              include:
                shiftResponseInclude,
            },
          );

        if (!oldShift) {
          throw new NotFoundException(
            'Vagten blev ikke fundet',
          );
        }

        await acquireShiftUserLocks(
          transaction,
          [
            oldShift.userId,
            normalized.userId,
          ],
        );

        const context =
          await getShiftUpdateContext(
            {
              prisma: transaction,
              cinemaId,
              id,
              data: normalized,
              oldShift,
            },
          );

        const linkedActions =
          oldShift.userId !==
          normalized.userId
            ? await resolveOpenShiftLinkedActions(
                transaction,
                {
                  cinemaId,
                  shiftId: id,
                },
              )
            : {
                tradeIds: [],
                staffingRequestIds: [],
                notificationUserIds: [],
              };

        const updated =
          await transaction.shift.updateMany(
            {
              where: {
                id,
                cinemaId,
              },
              data: {
                startTime:
                  normalized.startTime,
                endTime:
                  normalized.endTime,
                note: normalized.note,
                userId:
                  normalized.userId,
                jobFunctionId:
                  context.jobFunction.id,
                jobFunctionNameSnapshot:
                  context.jobFunction.name,
                jobFunctionColorSnapshot:
                  context.jobFunction.color,
                timingSource: 'MANUAL',
                workTypeId: null,
              },
            },
          );

        if (updated.count !== 1) {
          throw new ConflictException(
            'Vagten blev ændret af en anden. Genindlæs og prøv igen.',
          );
        }

        const shift =
          await transaction.shift.findUnique(
            {
              where: {
                id,
              },
              include:
                shiftResponseInclude,
            },
          );

        if (!shift) {
          throw new NotFoundException(
            'Vagten blev ikke fundet',
          );
        }

        return {
          ...context,
          shift,
          linkedActions,
        };
      },
    );

  const {
    oldShift,
    assignedUserId,
    startTime,
    endTime,
    shift,
  } = result;

  await auditLogsService.create({
    action: 'UPDATE_SHIFT',
    entityType: 'Shift',
    entityId: shift.id,
    description:
      `Opdaterede vagt fra ${oldShift.jobFunctionNameSnapshot} - ${formatShiftTime(
        oldShift.startTime,
        oldShift.endTime,
      )} til ${getShiftUserLabel(
        shift,
      )}: ${shift.jobFunctionNameSnapshot} - ${formatShiftTime(
        shift.startTime,
        shift.endTime,
      )}`,
    userId: user.sub,
    cinemaId: shift.cinemaId,
  });

  realtimeGateway.notifyCinema(
    shift.cinemaId,
    'shiftsUpdated',
    shift,
  );

  if (
    result.linkedActions.tradeIds.length >
    0
  ) {
    realtimeGateway.notifyCinema(
      shift.cinemaId,
      'shiftTradesUpdated',
      {
        shiftId: shift.id,
        resolved: true,
      },
    );
  }

  if (
    result.linkedActions.staffingRequestIds
      .length > 0
  ) {
    realtimeGateway.notifyCinema(
      shift.cinemaId,
      'staffingRequestsUpdated',
      {
        shiftId: shift.id,
        resolved: true,
      },
    );
  }

  for (
    const notificationUserId of
    result.linkedActions
      .notificationUserIds
  ) {
    realtimeGateway.notifyUser(
      notificationUserId,
      'notificationsUpdated',
      {
        cinemaId:
          shift.cinemaId,
        shiftId: shift.id,
        resolved: true,
      },
    );
  }

  if (assignedUserId) {
    await pushService.sendToUserInCinema(
      assignedUserId,
      shift.cinemaId,
      {
        title:
          oldShift.userId ===
          assignedUserId
            ? 'Vagt ændret'
            : 'Vagt tildelt',
        body:
          `${shift.jobFunctionNameSnapshot} - ${formatShiftTime(
            startTime,
            endTime,
          )}`,
        url:
          getMyShiftNotificationLink(
            shift.id,
          ),
      },
    );
  }

  if (
    oldShift.userId &&
    oldShift.userId !==
      assignedUserId
  ) {
    await pushService.sendToUserInCinema(
      oldShift.userId,
      shift.cinemaId,
      {
        title: assignedUserId
          ? 'Vagt fjernet'
          : 'Vagt ikke længere tildelt',
        body: assignedUserId
          ? 'En vagt er blevet flyttet til en anden medarbejder.'
          : 'En vagt er blevet fjernet fra din vagtplan.',
        url: '/my-shifts',
      },
    );
  }

  return shift;
}
