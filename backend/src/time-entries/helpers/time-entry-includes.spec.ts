import {
  getOpenTimeEntryInclude,
  getTimeEntryResponseInclude,
  getTimeEntryWithUserCinemaInclude,
} from './time-entry-includes';

describe('time entry includes', () => {
  it('includes pending payroll adjustments in normal entry responses', () => {
    expect(
      getTimeEntryResponseInclude(),
    ).toEqual(
      expect.objectContaining({
        payrollAdjustments: {
          where: {
            status: 'PENDING',
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            minutesDelta: true,
            reason: true,
            createdAt: true,
          },
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
