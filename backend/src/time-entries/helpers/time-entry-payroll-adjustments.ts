import { PrismaService } from '../../prisma/prisma.service';

function getPayrollAdjustmentExportCategory(entry: any) {
  if (entry.user?.employmentType === 'SALARIED') {
    return 'SALARIED';
  }

  return 'HOURLY';
}

async function createPayrollAdjustmentRevision(
  prisma: PrismaService,
  params: {
    payrollAdjustmentId: number;
    changedByUserId?: number | null;
    action: 'CREATED' | 'UPDATED' | 'INCLUDED' | 'VOIDED';
    before?: any | null;
    after?: any | null;
    reason?: string | null;
  },
) {
  return prisma.payrollAdjustmentRevision.create({
    data: {
      payrollAdjustmentId: params.payrollAdjustmentId,
      changedByUserId: params.changedByUserId ?? null,
      action: params.action,

      previousStatus: params.before?.status ?? null,
      newStatus: params.after?.status ?? null,

      previousExportedMinutes: params.before?.exportedMinutes ?? null,
      newExportedMinutes: params.after?.exportedMinutes ?? null,

      previousAdjustedMinutes: params.before?.adjustedMinutes ?? null,
      newAdjustedMinutes: params.after?.adjustedMinutes ?? null,

      previousMinutesDelta: params.before?.minutesDelta ?? null,
      newMinutesDelta: params.after?.minutesDelta ?? null,

      previousOriginalPayrollPeriodId:
        params.before?.originalPayrollPeriodId ?? null,
      newOriginalPayrollPeriodId: params.after?.originalPayrollPeriodId ?? null,

      previousSettlementPayrollPeriodId:
        params.before?.settlementPayrollPeriodId ?? null,
      newSettlementPayrollPeriodId:
        params.after?.settlementPayrollPeriodId ?? null,

      reason: params.reason ?? null,
    },
  });
}

export async function createOrUpdateTimeEntryPayrollAdjustment(
  prisma: PrismaService,
  params: {
    timeEntry: any;
    originalPayrollPeriodId: number;
    settlementPayrollPeriodId?: number | null;
    type:
      | 'APPROVAL_AFTER_EXPORT'
      | 'EDIT_AFTER_EXPORT'
      | 'MANUAL_ENTRY_IN_EXPORTED_PERIOD';
    exportedMinutes: number;
    adjustedMinutes: number;
    reason: string;
    changedByUserId?: number | null;
  },
) {
  const existingPendingAdjustment = await prisma.payrollAdjustment.findFirst({
    where: {
      timeEntryId: params.timeEntry.id,
      status: 'PENDING',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const exportedMinutes = existingPendingAdjustment
    ? existingPendingAdjustment.exportedMinutes
    : params.exportedMinutes;
  const adjustedMinutes = params.adjustedMinutes;
  const minutesDelta = adjustedMinutes - exportedMinutes;

  if (minutesDelta === 0) {
    if (!existingPendingAdjustment) {
      return null;
    }

    const voidedAdjustment = await prisma.payrollAdjustment.update({
      where: { id: existingPendingAdjustment.id },
      data: {
        status: 'VOIDED',
        adjustedMinutes,
        minutesDelta,
        reason: params.reason,
        voidedAt: new Date(),
      },
    });

    await createPayrollAdjustmentRevision(prisma, {
      payrollAdjustmentId: voidedAdjustment.id,
      changedByUserId: params.changedByUserId ?? null,
      action: 'VOIDED',
      before: existingPendingAdjustment,
      after: voidedAdjustment,
      reason: params.reason,
    });

    return voidedAdjustment;
  }

  if (existingPendingAdjustment) {
    const updatedAdjustment = await prisma.payrollAdjustment.update({
      where: { id: existingPendingAdjustment.id },
      data: {
        settlementPayrollPeriodId: params.settlementPayrollPeriodId ?? null,
        payrollTypeId: params.timeEntry.payrollTypeId ?? null,
        type: params.type,
        exportCategory: getPayrollAdjustmentExportCategory(params.timeEntry),
        adjustedMinutes,
        minutesDelta,
        previousMinutes: existingPendingAdjustment.adjustedMinutes,
        newMinutes: adjustedMinutes,
        previousClockIn: existingPendingAdjustment.newClockIn,
        previousClockOut: existingPendingAdjustment.newClockOut,
        newClockIn: params.timeEntry.clockIn,
        newClockOut: params.timeEntry.clockOut,
        reason: params.reason,
        voidedAt: null,
      },
    });

    await createPayrollAdjustmentRevision(prisma, {
      payrollAdjustmentId: updatedAdjustment.id,
      changedByUserId: params.changedByUserId ?? null,
      action: 'UPDATED',
      before: existingPendingAdjustment,
      after: updatedAdjustment,
      reason: params.reason,
    });

    return updatedAdjustment;
  }

  const adjustment = await prisma.payrollAdjustment.create({
    data: {
      cinemaId: params.timeEntry.cinemaId,
      userId: params.timeEntry.userId,
      timeEntryId: params.timeEntry.id,
      originalPayrollPeriodId: params.originalPayrollPeriodId,
      settlementPayrollPeriodId: params.settlementPayrollPeriodId ?? null,
      payrollTypeId: params.timeEntry.payrollTypeId ?? null,
      type: params.type,
      status: 'PENDING',
      exportCategory: getPayrollAdjustmentExportCategory(params.timeEntry),
      minutesDelta,
      exportedMinutes,
      adjustedMinutes,
      previousMinutes: exportedMinutes,
      newMinutes: adjustedMinutes,
      previousClockIn: null,
      previousClockOut: null,
      newClockIn: params.timeEntry.clockIn,
      newClockOut: params.timeEntry.clockOut,
      reason: params.reason,
      createdByUserId: params.changedByUserId ?? null,
    },
  });

  await createPayrollAdjustmentRevision(prisma, {
    payrollAdjustmentId: adjustment.id,
    changedByUserId: params.changedByUserId ?? null,
    action: 'CREATED',
    before: null,
    after: adjustment,
    reason: params.reason,
  });

  return adjustment;
}
