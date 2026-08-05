import { NotFoundException } from '@nestjs/common';
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
  const shiftToDelete =
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

      return shift;
    });

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
