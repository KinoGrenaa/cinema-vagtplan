import {
  ForbiddenException,
} from '@nestjs/common';

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
  SHIFT_USER_LOCK_NAMESPACE,
} from './shift-advisory-lock';
import {
  checkShiftConflicts,
} from './shift-conflict-checks';
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
  ensureShiftUserHasCinemaAccess,
} from './shift-user-access';

export async function createShiftFlow({
  prisma,
  realtimeGateway,
  pushService,
  auditLogsService,
  formatShiftTime,
  user,
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
  data: ShiftWriteData;
}) {
  const normalized =
    normalizeShiftWriteData(data);
  const cinemaId =
    resolveShiftCinemaId(
      user,
      normalized.cinemaId,
    );
  const assignedUserId =
    normalized.userId;

  const shift =
    await prisma.$transaction(
      async (transaction) => {
        if (assignedUserId) {
          await acquireShiftAdvisoryLock(
            transaction,
            SHIFT_USER_LOCK_NAMESPACE,
            assignedUserId,
          );
        }

        const workType =
          await transaction.workType.findFirst(
            {
              where: {
                id:
                  normalized.workTypeId,
                cinemaId,
                isActive: true,
              },
              select: {
                id: true,
              },
            },
          );

        if (!workType) {
          throw new ForbiddenException(
            'Vagttypen findes ikke eller er inaktiv i denne biograf',
          );
        }

        if (assignedUserId) {
          await ensureShiftUserHasCinemaAccess(
            transaction,
            assignedUserId,
            cinemaId,
          );

          await checkShiftConflicts(
            transaction,
            {
              startTime:
                normalized.startTime,
              endTime:
                normalized.endTime,
              userId:
                assignedUserId,
              cinemaId,
            },
          );
        }

        return transaction.shift.create(
          {
            data: {
              startTime:
                normalized.startTime,
              endTime:
                normalized.endTime,
              note: normalized.note,
              cinemaId,
              userId:
                assignedUserId,
              workTypeId:
                normalized.workTypeId,
            },
            include:
              shiftResponseInclude,
          },
        );
      },
    );

  await auditLogsService.create({
    action: 'CREATE_SHIFT',
    entityType: 'Shift',
    entityId: shift.id,
    description:
      `Oprettede vagt til ${getShiftUserLabel(
        shift,
      )}: ${shift.workType.name} - ${formatShiftTime(
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

  if (assignedUserId) {
    await pushService.sendToUserInCinema(
      assignedUserId,
      shift.cinemaId,
      {
        title: 'Ny vagt',
        body:
          `${shift.workType.name} - ${formatShiftTime(
            shift.startTime,
            shift.endTime,
          )}`,
        url:
          getMyShiftNotificationLink(
            shift.id,
          ),
      },
    );
  }

  return shift;
}
