import {
  PayrollAdjustmentStatus,
} from '@prisma/client';

import {
  getCinemaDeviationSelect,
} from './time-entry-deviation';

const payrollPeriodStatusSelect = {
  id: true,
  status: true,
} as const;

const payrollPeriodContextSelect = {
  id: true,
  status: true,
  startDate: true,
  endDate: true,
} as const;

const payrollAdjustmentsInclude = {
  where: {
    status: {
      in: [
        PayrollAdjustmentStatus.PENDING,
        PayrollAdjustmentStatus.INCLUDED,
      ] as PayrollAdjustmentStatus[],
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
  select: {
    id: true,
    type: true,
    status: true,
    minutesDelta: true,
    exportedMinutes: true,
    adjustedMinutes: true,
    previousMinutes: true,
    newMinutes: true,
    reason: true,
    createdAt: true,
    includedAt: true,
    originalPayrollPeriod: {
      select:
        payrollPeriodContextSelect,
    },
    settlementPayrollPeriod: {
      select:
        payrollPeriodContextSelect,
    },
    createdByUser: {
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    },
  },
} as const;

const latestNeedsChangesRevisionOrderBy = [
  {
    createdAt: "desc" as const,
  },
  {
    id: "desc" as const,
  },
];

export function getTimeEntryResponseInclude() {
  return {
    user: true,
    payrollType: true,
    cinema: {
      select:
        getCinemaDeviationSelect(),
    },
    shift: {
      include: {
        jobFunction: {
          include: {
            defaultPayrollExportCode: true,
          },
        },
      },
    },
    payrollPeriod: {
      select:
        payrollPeriodContextSelect,
    },
    originalPayrollPeriod: {
      select:
        payrollPeriodContextSelect,
    },
    adjustmentPayrollPeriod: {
      select:
        payrollPeriodContextSelect,
    },
    payrollAdjustments:
      payrollAdjustmentsInclude,
    revisions: {
      where: {
        newStatus: "NEEDS_CHANGES",
      },
      orderBy:
        latestNeedsChangesRevisionOrderBy,
      take: 1,
      select: {
        newAdminNote: true,
        changedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    },
  } as const;
}

export function getOpenTimeEntryInclude() {
  return {
    cinema: {
      select:
        getCinemaDeviationSelect(),
    },
    shift: {
      include: {
        jobFunction: true,
      },
    },
  } as const;
}

export function getShiftWithJobFunctionAndCinemaInclude() {
  return {
    jobFunction: {
      include: {
        defaultPayrollExportCode: true,
      },
    },
    cinema: {
      select:
        getCinemaDeviationSelect(),
    },
  } as const;
}

export function getTimeEntryWithCinemaShiftInclude() {
  return {
    cinema: {
      select:
        getCinemaDeviationSelect(),
    },
    shift: true,
  } as const;
}

export function getTimeEntryWithUserCinemaInclude() {
  return {
    user: true,
    cinema: {
      select:
        getCinemaDeviationSelect(),
    },
    payrollPeriod: {
      select:
        payrollPeriodStatusSelect,
    },
  } as const;
}

export function getTimeEntryWithUserCinemaShiftInclude() {
  return {
    ...getTimeEntryWithUserCinemaInclude(),
    shift: true,
  } as const;
}
