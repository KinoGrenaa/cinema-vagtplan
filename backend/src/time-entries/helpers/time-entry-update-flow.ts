import { ConflictException } from '@nestjs/common';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PayrollService } from '../../payroll/payroll.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  ensureTimeEntryEditable,
  ensureUserCanAccessTimeEntry,
} from './time-entry-access';
import { getTimeEntryEditPayrollContext } from './time-entry-edit-payroll-context';
import { createEditAfterExportPayrollAdjustmentIfNeeded } from './time-entry-exported-payroll-adjustments';
import { getTimeEntryResponseInclude } from './time-entry-includes';
import {
  recordAdminTimeEntryUpdated,
  recordOwnTimeEntryUpdated,
} from './time-entry-mutation-records';
import { findTimeEntryWithUserCinemaShiftOrThrow } from './time-entry-query-helpers';
import { notifyTimeEntryUpdated } from './time-entry-response';
import {
  ensureOwnTimeEntryCanBeUpdated,
  getAdminTimeEntryUpdateContext,
  getOwnTimeEntryUpdateContext,
} from './time-entry-update-helpers';

type OwnTimeEntryUpdateData = {
  clockIn: string;
  clockOut?: string | null;
  clockInNote?: string | null;
  clockOutNote?: string | null;
};

type AdminTimeEntryUpdateData = {
  clockIn?: string;
  clockOut?: string | null;
  clockInNote?: string | null;
  clockOutNote?: string | null;
  adminNote?: string | null;
  confirmPayrollAdjustment?: boolean;
};

export async function updateOwnTimeEntry(params: {
  prisma: PrismaService;
  payrollService: PayrollService;
  realtimeGateway: RealtimeGateway;
  auditLogsService: AuditLogsService;
  user: any;
  id: number;
  data: OwnTimeEntryUpdateData;
}) {
  const {
    prisma,
    payrollService,
    realtimeGateway,
    auditLogsService,
    user,
    id,
    data,
  } = params;
  const existingEntry =
    await findTimeEntryWithUserCinemaShiftOrThrow(prisma, id);

  ensureOwnTimeEntryCanBeUpdated(user, existingEntry);
  ensureTimeEntryEditable(existingEntry, user);

  const {
    newClockIn,
    newClockOut,
    newClockInNote,
    newClockOutNote,
    changes,
  } = getOwnTimeEntryUpdateContext(existingEntry, data);

  const entry = await prisma.timeEntry.update({
    where: {
      id,
    },
    data: {
      clockIn: newClockIn,
      clockOut: newClockOut,
      clockInNote: newClockInNote,
      clockOutNote: newClockOutNote,
      status: 'PENDING',
    },
    include: getTimeEntryResponseInclude(),
  });

  await createEditAfterExportPayrollAdjustmentIfNeeded({
    prisma,
    payrollService,
    existingEntry,
    entry,
    reason: 'Tidsregistrering rettet af medarbejderen',
    changedByUserId: user.sub,
  });

  await recordOwnTimeEntryUpdated({
    prisma,
    auditLogsService,
    existingEntry,
    entry,
    user,
    changes,
  });

  return notifyTimeEntryUpdated(realtimeGateway, entry);
}

export async function updateAdminTimeEntry(params: {
  prisma: PrismaService;
  payrollService: PayrollService;
  realtimeGateway: RealtimeGateway;
  auditLogsService: AuditLogsService;
  user: any;
  id: number;
  data: AdminTimeEntryUpdateData;
  selectedCinemaId?: number | null;
}) {
  const {
    prisma,
    payrollService,
    realtimeGateway,
    auditLogsService,
    user,
    id,
    data,
    selectedCinemaId,
  } = params;
  const existingEntry =
    await findTimeEntryWithUserCinemaShiftOrThrow(prisma, id);

  ensureUserCanAccessTimeEntry(
    user,
    existingEntry,
    selectedCinemaId,
  );
  ensureTimeEntryEditable(existingEntry, user);

  const exportedPayrollContext =
    await getTimeEntryEditPayrollContext({
      prisma,
      payrollService,
      existingEntry,
    });

  if (
    exportedPayrollContext &&
    !data.confirmPayrollAdjustment
  ) {
    const {
      originalPayrollPeriod,
      adjustmentPayrollPeriod,
    } = exportedPayrollContext;

    throw new ConflictException({
      code: 'PAYROLL_PERIOD_EXPORTED',
      title: 'Lønperioden er allerede eksporteret',
      message:
        'Denne tidsregistrering er allerede med i en eksporteret lønperiode.',
      originalPayrollPeriod: {
        id: originalPayrollPeriod.id,
        startDate: originalPayrollPeriod.startDate,
        endDate: originalPayrollPeriod.endDate,
      },
      adjustmentPayrollPeriod: adjustmentPayrollPeriod
        ? {
            id: adjustmentPayrollPeriod.id,
            startDate: adjustmentPayrollPeriod.startDate,
            endDate: adjustmentPayrollPeriod.endDate,
          }
        : null,
    });
  }

  const {
    nextClockIn,
    nextClockOut,
    nextClockInNote,
    nextClockOutNote,
    changes,
  } = getAdminTimeEntryUpdateContext(existingEntry, data);

  const entry = await prisma.timeEntry.update({
    where: {
      id,
    },
    data: {
      clockIn: nextClockIn,
      clockOut: nextClockOut,
      clockInNote: nextClockInNote,
      clockOutNote: nextClockOutNote,
      adminNote:
        data.adminNote === undefined
          ? existingEntry.adminNote
          : data.adminNote,
      status: existingEntry.status,
    },
    include: getTimeEntryResponseInclude(),
  });

  await createEditAfterExportPayrollAdjustmentIfNeeded({
    prisma,
    payrollService,
    existingEntry,
    entry,
    reason: data.adminNote ?? '',
    changedByUserId: user?.sub ?? null,
  });

  await recordAdminTimeEntryUpdated({
    prisma,
    auditLogsService,
    existingEntry,
    entry,
    user,
    changes,
    adminNote: data.adminNote,
  });

  return notifyTimeEntryUpdated(realtimeGateway, entry);
}
