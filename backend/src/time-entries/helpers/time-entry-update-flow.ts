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
import { lockTimeEntryUpdatePayrollPeriods } from './time-entry-update-payroll-lock';

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
  const initialEntry =
    await findTimeEntryWithUserCinemaShiftOrThrow(
      prisma,
      id,
    );

  ensureOwnTimeEntryCanBeUpdated(
    user,
    initialEntry,
  );
  ensureTimeEntryEditable(initialEntry, user);

  const initialUpdateContext =
    getOwnTimeEntryUpdateContext(
      initialEntry,
      data,
    );

  const result = await prisma.$transaction(
    async (tx) => {
      const locked =
        await lockTimeEntryUpdatePayrollPeriods(
          tx,
          {
            initialEntry,
            nextClockIn:
              initialUpdateContext.newClockIn,
          },
        );
      const existingEntry =
        locked.existingEntry;

      ensureOwnTimeEntryCanBeUpdated(
        user,
        existingEntry,
      );
      ensureTimeEntryEditable(
        existingEntry,
        user,
      );

      const updateContext =
        getOwnTimeEntryUpdateContext(
          existingEntry,
          data,
        );
      const entry = await tx.timeEntry.update({
        where: {
          id,
        },
        data: {
          clockIn:
            updateContext.newClockIn,
          clockOut:
            updateContext.newClockOut,
          clockInNote:
            updateContext.newClockInNote,
          clockOutNote:
            updateContext.newClockOutNote,
          status: 'PENDING',
          automaticClockIn: false,
          automaticClockOut: false,
        },
        include: getTimeEntryResponseInclude(),
      });

      await createEditAfterExportPayrollAdjustmentIfNeeded({
        prisma:
          tx as unknown as PrismaService,
        payrollService,
        existingEntry,
        entry,
        reason:
          'Tidsregistrering rettet af medarbejderen',
        changedByUserId: user.sub,
      });

      return {
        existingEntry,
        entry,
        changes: updateContext.changes,
      };
    },
  );

  await recordOwnTimeEntryUpdated({
    prisma,
    auditLogsService,
    existingEntry: result.existingEntry,
    entry: result.entry,
    user,
    changes: result.changes,
  });

  return notifyTimeEntryUpdated(
    realtimeGateway,
    result.entry,
  );
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
  const initialEntry =
    await findTimeEntryWithUserCinemaShiftOrThrow(
      prisma,
      id,
    );

  ensureUserCanAccessTimeEntry(
    user,
    initialEntry,
    selectedCinemaId,
  );
  ensureTimeEntryEditable(initialEntry, user);

  const initialUpdateContext =
    getAdminTimeEntryUpdateContext(
      initialEntry,
      data,
    );

  const result = await prisma.$transaction(
    async (tx) => {
      const locked =
        await lockTimeEntryUpdatePayrollPeriods(
          tx,
          {
            initialEntry,
            nextClockIn:
              initialUpdateContext.nextClockIn,
          },
        );
      const existingEntry =
        locked.existingEntry;

      ensureUserCanAccessTimeEntry(
        user,
        existingEntry,
        selectedCinemaId,
      );
      ensureTimeEntryEditable(
        existingEntry,
        user,
      );

      const exportedPayrollContext =
        await getTimeEntryEditPayrollContext({
          prisma:
            tx as unknown as PrismaService,
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
          title:
            'Lønperioden er allerede eksporteret',
          message:
            'Denne tidsregistrering er allerede med i en eksporteret lønperiode.',
          originalPayrollPeriod: {
            id: originalPayrollPeriod.id,
            startDate:
              originalPayrollPeriod.startDate,
            endDate:
              originalPayrollPeriod.endDate,
          },
          adjustmentPayrollPeriod:
            adjustmentPayrollPeriod
              ? {
                  id:
                    adjustmentPayrollPeriod.id,
                  startDate:
                    adjustmentPayrollPeriod.startDate,
                  endDate:
                    adjustmentPayrollPeriod.endDate,
                }
              : null,
        });
      }

      const updateContext =
        getAdminTimeEntryUpdateContext(
          existingEntry,
          data,
        );
      const entry = await tx.timeEntry.update({
        where: {
          id,
        },
        data: {
          clockIn:
            updateContext.nextClockIn,
          clockOut:
            updateContext.nextClockOut,
          clockInNote:
            updateContext.nextClockInNote,
          clockOutNote:
            updateContext.nextClockOutNote,
          adminNote:
            data.adminNote === undefined
              ? existingEntry.adminNote
              : data.adminNote,
          status: existingEntry.status,
        },
        include: getTimeEntryResponseInclude(),
      });

      await createEditAfterExportPayrollAdjustmentIfNeeded({
        prisma:
          tx as unknown as PrismaService,
        payrollService,
        existingEntry,
        entry,
        reason: data.adminNote ?? '',
        changedByUserId:
          user?.sub ?? null,
      });

      return {
        existingEntry,
        entry,
        changes: updateContext.changes,
      };
    },
  );

  await recordAdminTimeEntryUpdated({
    prisma,
    auditLogsService,
    existingEntry: result.existingEntry,
    entry: result.entry,
    user,
    changes: result.changes,
    adminNote: data.adminNote,
  });

  return notifyTimeEntryUpdated(
    realtimeGateway,
    result.entry,
  );
}
