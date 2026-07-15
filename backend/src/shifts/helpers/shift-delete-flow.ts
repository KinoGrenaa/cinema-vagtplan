import { NotFoundException } from '@nestjs/common';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  AuthUser,
  getShiftCinemaFilter,
  getShiftUserLabel,
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
  const shiftToDelete = await prisma.shift.findFirst({
    where: {
      id,
      ...getShiftCinemaFilter(
        user,
        selectedCinemaId,
      ),
    },
    include: {
      workType: true,
      user: true,
    },
  });

  if (!shiftToDelete) {
    throw new NotFoundException(
      'Vagten blev ikke fundet',
    );
  }

  const shift = await prisma.shift.delete({
    where: {
      id,
    },
  });

  await auditLogsService.create({
    action: 'DELETE_SHIFT',
    entityType: 'Shift',
    entityId: shiftToDelete.id,
    description: `Slettede vagt for ${getShiftUserLabel(
      shiftToDelete,
    )}: ${shiftToDelete.workType.name} - ${formatShiftTime(
      shiftToDelete.startTime,
      shiftToDelete.endTime,
    )}`,
    userId: user.sub,
    cinemaId: shiftToDelete.cinemaId,
  });

  realtimeGateway.notifyCinema(
    shift.cinemaId,
    'shiftsUpdated',
    shift,
  );

  if (shiftToDelete.userId) {
    await pushService.sendToUserInCinema(
      shiftToDelete.userId,
      shiftToDelete.cinemaId,
      {
        title: 'Vagt slettet',
        body: `${shiftToDelete.workType.name} - ${formatShiftTime(
          shiftToDelete.startTime,
          shiftToDelete.endTime,
        )}`,
        url: '/my-shifts',
      },
    );
  }

  return shift;
}
