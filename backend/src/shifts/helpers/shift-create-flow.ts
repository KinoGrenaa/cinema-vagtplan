import { ForbiddenException } from '@nestjs/common';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  AuthUser,
  ShiftWriteData,
  getShiftUserLabel,
  resolveShiftCinemaId,
  validateShiftTimes,
} from './shift-service-helpers';
import { checkShiftConflicts } from './shift-conflict-checks';
import { ensureShiftUserHasCinemaAccess } from './shift-user-access';

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
  const cinemaId = resolveShiftCinemaId(
    user,
    data.cinemaId,
  );
  const assignedUserId = data.userId ?? null;

  const workType = await prisma.workType.findFirst({
    where: {
      id: data.workTypeId,
      cinemaId,
    },
  });

  if (!workType) {
    throw new ForbiddenException(
      'Vagttypen findes ikke i denne biograf',
    );
  }

  if (assignedUserId) {
    await ensureShiftUserHasCinemaAccess(
      prisma,
      assignedUserId,
      cinemaId,
    );
  }

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  validateShiftTimes(startTime, endTime);

  if (assignedUserId) {
    await checkShiftConflicts(prisma, {
      startTime,
      endTime,
      userId: assignedUserId,
      cinemaId,
    });
  }

  const shift = await prisma.shift.create({
    data: {
      startTime,
      endTime,
      note: data.note,
      cinemaId,
      userId: assignedUserId,
      workTypeId: data.workTypeId,
    },
    include: {
      workType: true,
      user: true,
    },
  });

  await auditLogsService.create({
    action: 'CREATE_SHIFT',
    entityType: 'Shift',
    entityId: shift.id,
    description: `Oprettede vagt til ${getShiftUserLabel(
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
    await pushService.sendToUser(assignedUserId, {
      title: 'Ny vagt',
      body: `${shift.workType.name} - ${formatShiftTime(
        startTime,
        endTime,
      )}`,
      url: '/my-shifts',
    });
  }

  return shift;
}
