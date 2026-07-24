import {
  getOpenTimeEntryInclude,
  getTimeEntryResponseInclude,
  getTimeEntryWithUserCinemaInclude,
} from './time-entry-includes';

describe('time entry includes', () => {
  it('includes exported payroll context in normal entry responses', () => {
    expect(
      getTimeEntryResponseInclude(),
    ).toEqual(
      expect.objectContaining({
        payrollPeriod: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
        originalPayrollPeriod: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
        adjustmentPayrollPeriod: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
        payrollAdjustments: {
          where: {
            status: 'PENDING',
          },
          orderBy: {
            createdAt: 'desc',
          },
          select:
            expect.objectContaining({
              id: true,
              type: true,
              minutesDelta: true,
              reason: true,
              createdAt: true,
              originalPayrollPeriod:
                expect.any(Object),
              settlementPayrollPeriod:
                expect.any(Object),
            }),
        },
      }),
    );
  });

  it('keeps open-entry responses focused on clock state', () => {
    expect(
      getOpenTimeEntryInclude(),
    ).not.toHaveProperty(
      'payrollAdjustments',
    );
  });

  it('keeps payroll-period status on administrative mutation reads', () => {
    expect(
      getTimeEntryWithUserCinemaInclude(),
    ).toEqual(
      expect.objectContaining({
        payrollPeriod: {
          select: {
            id: true,
            status: true,
          },
        },
      }),
    );
  });
});
