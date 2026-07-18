import { PrismaService } from '../../prisma/prisma.service';
import { getTimeEntryResponseInclude } from './time-entry-includes';
import {
  createUnapprovePayrollAdjustmentIfNeeded,
  getUnapproveTimeEntryUpdateData,
  type UnapprovePayrollContext,
} from './time-entry-unapprove-payroll';
import {
  createVoidPayrollAdjustmentIfNeeded,
  type VoidPayrollContext,
} from './time-entry-void-payroll';

export async function unapproveTimeEntryWithPayrollTransaction({
  prisma,
  id,
  existingEntry,
  payrollContext,
  changedByUserId,
}: {
  prisma: PrismaService;
  id: number;
  existingEntry: any;
  payrollContext: UnapprovePayrollContext;
  changedByUserId: number | null;
}) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.timeEntry.update({
      where: {
        id,
      },
      data: getUnapproveTimeEntryUpdateData(
        payrollContext,
      ),
      include: getTimeEntryResponseInclude(),
    });

    await createUnapprovePayrollAdjustmentIfNeeded({
      prisma: tx as unknown as PrismaService,
      existingEntry,
      entry,
      payrollContext,
      changedByUserId,
    });

    return entry;
  });
}

export async function voidTimeEntryWithPayrollTransaction({
  prisma,
  id,
  existingEntry,
  payrollContext,
  reason,
  changedByUserId,
}: {
  prisma: PrismaService;
  id: number;
  existingEntry: any;
  payrollContext: VoidPayrollContext;
  reason: string;
  changedByUserId: number | null;
}) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.timeEntry.update({
      where: {
        id,
      },
      data: {
        status: 'VOIDED',
        adminNote: reason,
      },
      include: getTimeEntryResponseInclude(),
    });

    await createVoidPayrollAdjustmentIfNeeded({
      prisma: tx as unknown as PrismaService,
      existingEntry,
      entry,
      payrollContext,
      reason,
      changedByUserId,
    });

    return entry;
  });
}
