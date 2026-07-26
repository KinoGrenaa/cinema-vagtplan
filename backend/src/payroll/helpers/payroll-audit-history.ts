import { PrismaService } from '../../prisma/prisma.service';
import { getPeriodDates } from './payroll-periods';

import {
  ensurePayrollAccess,
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './payroll-access';

type AuditUser = {
  firstName: string;
  lastName: string;
  email: string;
};

type AuditPeriod = {
  id: number;
  startDate: Date;
  endDate: Date;
};

type AuditAdjustment = {
  id: number;
  type: string;
  status: string;
  minutesDelta: number;
  reason: string;
  createdAt: Date;
  includedAt: Date | null;
  voidedAt: Date | null;
  user: AuditUser;
  createdByUser: AuditUser | null;
};

function getAuditUserName(user: AuditUser) {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  return fullName || user.email;
}

function mapAuditAdjustment(
  adjustment: AuditAdjustment,
  relation: 'ORIGINAL' | 'SETTLEMENT',
  originalPeriod: AuditPeriod,
  settlementPeriod: AuditPeriod | null,
) {
  return {
    id: adjustment.id,
    relation,
    type: adjustment.type,
    status: adjustment.status,
    minutesDelta: adjustment.minutesDelta,
    reason: adjustment.reason,
    createdAt: adjustment.createdAt,
    includedAt: adjustment.includedAt,
    voidedAt: adjustment.voidedAt,
    employeeName: getAuditUserName(adjustment.user),
    createdByName: adjustment.createdByUser
      ? getAuditUserName(adjustment.createdByUser)
      : null,
    originalPayrollPeriodId: originalPeriod.id,
    originalPayrollPeriodStartDate: originalPeriod.startDate,
    originalPayrollPeriodEndDate: originalPeriod.endDate,
    settlementPayrollPeriodId: settlementPeriod?.id ?? null,
    settlementPayrollPeriodStartDate: settlementPeriod?.startDate ?? null,
    settlementPayrollPeriodEndDate: settlementPeriod?.endDate ?? null,
  };
}

const auditAdjustmentSelect = {
  id: true,
  type: true,
  status: true,
  minutesDelta: true,
  reason: true,
  createdAt: true,
  includedAt: true,
  voidedAt: true,
  user: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  createdByUser: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

export async function getPayrollAuditHistoryData(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  selectedCinemaId?: number | null,
) {
  ensurePayrollAccess(user);
  const { start, end } = getPeriodDates(startDate, endDate);

  const periods = await prisma.payrollPeriod.findMany({
    where: {
      ...getPayrollCinemaFilter(user, selectedCinemaId),
      startDate: {
        gte: start,
      },
      endDate: {
        lte: end,
      },
    },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      lockedAt: true,
      lockedByUserId: true,
      exportedAt: true,
      exportedByUserId: true,
      unlockedAt: true,
      unlockedByUserId: true,
      unlockNote: true,
      originalPayrollAdjustments: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          ...auditAdjustmentSelect,
          settlementPayrollPeriod: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      },
      settlementPayrollAdjustments: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          ...auditAdjustmentSelect,
          originalPayrollPeriod: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });

  return periods.map((period) => {
    const currentPeriod = {
      id: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
    };
    const adjustments = [
      ...period.originalPayrollAdjustments.map((adjustment) =>
        mapAuditAdjustment(
          adjustment,
          'ORIGINAL',
          currentPeriod,
          adjustment.settlementPayrollPeriod,
        ),
      ),
      ...period.settlementPayrollAdjustments.map((adjustment) =>
        mapAuditAdjustment(
          adjustment,
          'SETTLEMENT',
          adjustment.originalPayrollPeriod,
          currentPeriod,
        ),
      ),
    ];
    const uniqueAdjustments = Array.from(
      new Map(
        adjustments.map((adjustment) => [adjustment.id, adjustment]),
      ).values(),
    ).sort(
      (left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime() ||
        right.id - left.id,
    );

    return {
      id: period.id,
      status: period.status,
      startDate: period.startDate,
      endDate: period.endDate,
      lockedAt: period.lockedAt,
      lockedByUserId: period.lockedByUserId,
      exportedAt: period.exportedAt,
      exportedByUserId: period.exportedByUserId,
      unlockedAt: period.unlockedAt,
      unlockedByUserId: period.unlockedByUserId,
      unlockNote: period.unlockNote,
      adjustments: uniqueAdjustments,
    };
  });
}
