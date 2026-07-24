import {
  getOpenTimeEntryInclude,
  getTimeEntryResponseInclude,
  getTimeEntryWithUserCinemaInclude,
} from './time-entry-includes';

describe('time entry includes', () => {
  it('includes pending and included payroll adjustment history', () => {
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
            status: {
              in: [
                'PENDING',
                'INCLUDED',
              ],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          select:
            expect.objectContaining({
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
              originalPayrollPeriod:
                expect.any(Object),
              settlementPayrollPeriod:
                expect.any(Object),
              createdByUser:
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
