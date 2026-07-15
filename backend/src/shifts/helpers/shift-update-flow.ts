import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  AuthUser,
  ShiftWriteData,
  getShiftUserLabel,
} from './shift-service-helpers';
import { getShiftUpdateContext } from './shift-update-validation';

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
  const {
    oldShift,
    assignedUserId,
    startTime,
    endTime,
  } = await getShiftUpdateContext({
    prisma,
    user,
    id,
    data,
  });

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
    } - ${formatShiftTime(
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
        title:
          oldShift.userId === assignedUserId
            ? 'Vagt ændret'
            : 'Vagt tildelt',
        body: `${shift.workType.name} - ${formatShiftTime(
          startTime,
          endTime,
        )}`,
        url: '/my-shifts',
      },
    );
  }

  if (
    oldShift.userId &&
    oldShift.userId !== assignedUserId
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
