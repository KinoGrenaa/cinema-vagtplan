import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
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

async function acquireShiftUserLocks(
  tx: any,
  userIds: Array<number | null | undefined>,
) {
  const uniqueUserIds = [
    ...new Set(
      userIds.filter(
        (value): value is number =>
          Number.isInteger(value) &&
          Number(value) > 0,
      ),
    ),
  ].sort((left, right) => left - right);

  for (const userId of uniqueUserIds) {
    await tx.$queryRaw(
      Prisma.sql`
        SELECT pg_advisory_xact_lock(
          56001,
          ${userId}
        )
      `,
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
  const cinemaId = resolveShiftCinemaId(
    user,
    normalized.cinemaId,
  );
  const result = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`
          SELECT pg_advisory_xact_lock(
            56002,
            ${id}
          )
        `,
      );

      const oldShift =
        await tx.shift.findFirst({
          where: {
            id,
            cinemaId,
          },
          include: shiftResponseInclude,
        });

      if (!oldShift) {
        throw new NotFoundException(
          'Vagten blev ikke fundet',
        );
      }

      await acquireShiftUserLocks(tx, [
        oldShift.userId,
        normalized.userId,
      ]);

      const context =
        await getShiftUpdateContext({
          prisma: tx,
          cinemaId,
          id,
          data: normalized,
          oldShift,
        });
      const updated =
        await tx.shift.updateMany({
          where: {
            id,
            cinemaId,
          },
          data: {
            startTime: normalized.startTime,
            endTime: normalized.endTime,
            note: normalized.note,
            userId: normalized.userId,
            workTypeId:
              normalized.workTypeId,
          },
        });

      if (updated.count !== 1) {
        throw new ConflictException(
          'Vagten blev ændret af en anden. Genindlæs og prøv igen.',
        );
      }

      const shift =
        await tx.shift.findUnique({
          where: {
            id,
          },
          include: shiftResponseInclude,
        });

      if (!shift) {
        throw new NotFoundException(
          'Vagten blev ikke fundet',
        );
      }

      return {
        ...context,
        shift,
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
      `Opdaterede vagt fra ${oldShift.workType.name} - ${formatShiftTime(
        oldShift.startTime,
        oldShift.endTime,
      )} til ${getShiftUserLabel(
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
        title:
          oldShift.userId === assignedUserId
            ? 'Vagt ændret'
            : 'Vagt tildelt',
        body:
          `${shift.workType.name} - ${formatShiftTime(
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
