import { Prisma } from '@prisma/client';
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

async function unapproveTimeEntryWithPayrollClient({
  tx,
  id,
  existingEntry,
  payrollContext,
  changedByUserId,
}: {
  tx: Prisma.TransactionClient;
  id: number;
  existingEntry: any;
  payrollContext: UnapprovePayrollContext;
  changedByUserId: number | null;
}) {
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
    prisma:
      tx as unknown as PrismaService,
    existingEntry,
    entry,
    payrollContext,
    changedByUserId,
  });

  return entry;
}

async function voidTimeEntryWithPayrollClient({
  tx,
  id,
  existingEntry,
  payrollContext,
  reason,
  changedByUserId,
}: {
  tx: Prisma.TransactionClient;
  id: number;
  existingEntry: any;
  payrollContext: VoidPayrollContext;
  reason: string;
  changedByUserId: number | null;
}) {
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
    prisma:
      tx as unknown as PrismaService,
    existingEntry,
    entry,
    payrollContext,
    reason,
    changedByUserId,
  });

  return entry;
}

export async function unapproveTimeEntryWithPayrollTransaction({
  prisma,
  transactionClient,
  id,
  existingEntry,
  payrollContext,
  changedByUserId,
}: {
  prisma: PrismaService;
  transactionClient?: Prisma.TransactionClient;
  id: number;
  existingEntry: any;
  payrollContext: UnapprovePayrollContext;
  changedByUserId: number | null;
}) {
  const execute = (
    tx: Prisma.TransactionClient,
  ) =>
    unapproveTimeEntryWithPayrollClient({
      tx,
      id,
      existingEntry,
      payrollContext,
      changedByUserId,
    });

  if (transactionClient) {
    return execute(transactionClient);
  }

  return prisma.$transaction(execute);
}

export async function voidTimeEntryWithPayrollTransaction({
  prisma,
  transactionClient,
  id,
  existingEntry,
  payrollContext,
  reason,
  changedByUserId,
}: {
  prisma: PrismaService;
  transactionClient?: Prisma.TransactionClient;
  id: number;
  existingEntry: any;
  payrollContext: VoidPayrollContext;
  reason: string;
  changedByUserId: number | null;
}) {
  const execute = (
    tx: Prisma.TransactionClient,
  ) =>
    voidTimeEntryWithPayrollClient({
      tx,
      id,
      existingEntry,
      payrollContext,
      reason,
      changedByUserId,
    });

  if (transactionClient) {
    return execute(transactionClient);
  }

  return prisma.$transaction(execute);
}
