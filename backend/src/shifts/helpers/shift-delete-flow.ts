import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
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
      await tx.$queryRaw(
        Prisma.sql`
          SELECT pg_advisory_xact_lock(
            56002,
            ${id}
          )
        `,
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
      )}: ${shiftToDelete.workType.name} - ${formatShiftTime(
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
          `${shiftToDelete.workType.name} - ${formatShiftTime(
            shiftToDelete.startTime,
            shiftToDelete.endTime,
          )}`,
        url: '/my-shifts',
      },
    );
  }

  return shiftToDelete;
}
