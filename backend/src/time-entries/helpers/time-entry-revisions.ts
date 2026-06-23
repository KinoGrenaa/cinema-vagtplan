import { PrismaService } from '../../prisma/prisma.service';

type TimeEntryRevisionSnapshot = {
  status?: any;
  clockIn?: Date | string | null;
  clockOut?: Date | string | null;
  note?: string | null;
  clockInNote?: string | null;
  clockOutNote?: string | null;
  adminNote?: string | null;
};

type CreateTimeEntryRevisionParams = {
  timeEntryId: number;
  changedByUserId?: number | null;
  action: string;
  before?: TimeEntryRevisionSnapshot | null;
  after?: TimeEntryRevisionSnapshot | null;
  reason?: string | null;
};

export function createTimeEntryRevision(
  prisma: PrismaService,
  params: CreateTimeEntryRevisionParams,
) {
  return prisma.timeEntryRevision.create({
    data: {
      timeEntryId: params.timeEntryId,
      changedByUserId: params.changedByUserId ?? null,
      action: params.action,

      previousStatus: params.before?.status ?? null,
      newStatus: params.after?.status ?? null,

      previousClockIn: params.before?.clockIn
        ? new Date(params.before.clockIn)
        : null,
      newClockIn: params.after?.clockIn ? new Date(params.after.clockIn) : null,

      previousClockOut: params.before?.clockOut
        ? new Date(params.before.clockOut)
        : null,
      newClockOut: params.after?.clockOut
        ? new Date(params.after.clockOut)
        : null,

      previousNote: params.before?.note ?? null,
      newNote: params.after?.note ?? null,

      previousClockInNote: params.before?.clockInNote ?? null,
      newClockInNote: params.after?.clockInNote ?? null,

      previousClockOutNote: params.before?.clockOutNote ?? null,
      newClockOutNote: params.after?.clockOutNote ?? null,

      previousAdminNote: params.before?.adminNote ?? null,
      newAdminNote: params.after?.adminNote ?? null,

      reason: params.reason ?? null,
    },
  });
}
