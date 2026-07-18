import { getCinemaDeviationSelect } from './time-entry-deviation';

const payrollPeriodStatusSelect = {
  id: true,
  status: true,
} as const;

export function getTimeEntryResponseInclude() {
  return {
    user: true,
    payrollType: true,
    cinema: {
      select: getCinemaDeviationSelect(),
    },
    shift: {
      include: {
        workType: {
          include: {
            payrollType: true,
          },
        },
      },
    },
  } as const;
}

export function getOpenTimeEntryInclude() {
  return {
    cinema: {
      select: getCinemaDeviationSelect(),
    },
    shift: {
      include: {
        workType: true,
      },
    },
  } as const;
}

export function getShiftWithWorkTypeAndCinemaInclude() {
  return {
    workType: true,
    cinema: {
      select: getCinemaDeviationSelect(),
    },
  } as const;
}

export function getTimeEntryWithCinemaShiftInclude() {
  return {
    cinema: {
      select: getCinemaDeviationSelect(),
    },
    shift: true,
  } as const;
}

export function getTimeEntryWithUserCinemaInclude() {
  return {
    user: true,
    cinema: {
      select: getCinemaDeviationSelect(),
    },
    payrollPeriod: {
      select: payrollPeriodStatusSelect,
    },
  } as const;
}

export function getTimeEntryWithUserCinemaShiftInclude() {
  return {
    ...getTimeEntryWithUserCinemaInclude(),
    shift: true,
  } as const;
}
