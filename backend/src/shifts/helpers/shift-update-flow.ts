import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  AuthUser,
  ShiftWriteData,
  getShiftCinemaFilter,
  getShiftUserLabel,
  validateShiftTimes,
} from './shift-service-helpers';
import { checkShiftConflicts } from './shift-conflict-checks';

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
  formatShiftTime: (startTime: Date, endTime: Date) => string;
  user: AuthUser;
  id: number;
  data: ShiftWriteData;
}) {
  const oldShift = await prisma.shift.findFirst({
    where: {
      id,
      ...getShiftCinemaFilter(user, data.cinemaId),
    },
    include: {
      user: true,
      workType: true,
    },
  });

  if (!oldShift) {
    throw new NotFoundException('Vagten blev ikke fundet');
  }

  const cinemaId = oldShift.cinemaId;
  const assignedUserId = data.userId ?? null;

  const workType = await prisma.workType.findFirst({
    where: {
      id: data.workTypeId,
      cinemaId,
    },
  });

  if (!workType) {
    throw new ForbiddenException('Vagttypen findes ikke i denne biograf');
  }

  if (assignedUserId) {
    const shiftUser = await prisma.user.findFirst({
      where: {
        id: assignedUserId,
        cinemaId,
      },
    });

    if (!shiftUser) {
      throw new ForbiddenException('Medarbejderen findes ikke i denne biograf');
    }
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
      ignoreShiftId: id,
    });
  }

  const shift = await prisma.shift.update({
    where: {
      id,
    },
    data: {
      startTime,
      endTime,
      note: data.note,
      userId: assignedUserId,
      workTypeId: data.workTypeId,
    },
    include: {
      workType: true,
      user: true,
    },
  });

  await auditLogsService.create({
    action: 'UPDATE_SHIFT',
    entityType: 'Shift',
    entityId: shift.id,
    description: `Opdaterede vagt fra ${oldShift.workType.name} - ${formatShiftTime(
      oldShift.startTime,
      oldShift.endTime,
    )} til ${getShiftUserLabel(shift)}: ${
      shift.workType.name
    } - ${formatShiftTime(shift.startTime, shift.endTime)}`,
    userId: user.sub,
    cinemaId: shift.cinemaId,
  });

  realtimeGateway.notifyCinema(shift.cinemaId, 'shiftsUpdated', shift);

  if (assignedUserId) {
    await pushService.sendToUser(assignedUserId, {
      title: oldShift.userId === assignedUserId ? 'Vagt ændret' : 'Vagt tildelt',
      body: `${shift.workType.name} - ${formatShiftTime(startTime, endTime)}`,
      url: '/my-shifts',
    });
  }

  if (oldShift.userId && oldShift.userId !== assignedUserId) {
    await pushService.sendToUser(oldShift.userId, {
      title: assignedUserId ? 'Vagt fjernet' : 'Vagt ikke længere tildelt',
      body: assignedUserId
        ? 'En vagt er blevet flyttet til en anden medarbejder.'
        : 'En vagt er blevet fjernet fra din vagtplan.',
      url: '/my-shifts',
    });
  }

  return shift;
}
