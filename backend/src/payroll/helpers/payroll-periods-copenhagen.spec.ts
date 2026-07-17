import {
  calculatePayrollPeriodForDate,
  getPayrollPeriodTimeRange,
  getPayrollReferenceDateFilters,
  getPeriodDates,
} from './payroll-periods';

describe('payroll period Copenhagen boundaries', () => {
  it('bevarer de eksisterende UTC-periodenøgler i databasen', () => {
    const periodDates = getPeriodDates(
      '2026-07-21',
      '2026-08-20',
    );

    expect(periodDates.start.toISOString()).toBe(
      '2026-07-21T00:00:00.000Z',
    );
    expect(periodDates.end.toISOString()).toBe(
      '2026-08-20T23:59:59.999Z',
    );
  });

  it('beregner dansk midnat korrekt om sommeren', () => {
    const timeRange = getPayrollPeriodTimeRange(
      '2026-07-21',
      '2026-08-20',
    );

    expect(timeRange.start.toISOString()).toBe(
      '2026-07-20T22:00:00.000Z',
    );
    expect(timeRange.endExclusive.toISOString()).toBe(
      '2026-08-20T22:00:00.000Z',
    );
  });

  it('beregner dansk midnat korrekt om vinteren', () => {
    const timeRange = getPayrollPeriodTimeRange(
      '2026-01-21',
      '2026-02-20',
    );

    expect(timeRange.start.toISOString()).toBe(
      '2026-01-20T23:00:00.000Z',
    );
    expect(timeRange.endExclusive.toISOString()).toBe(
      '2026-02-20T23:00:00.000Z',
    );
  });

  it('håndterer den 23 timer lange dag ved sommertidsskift', () => {
    const timeRange = getPayrollPeriodTimeRange(
      '2026-03-29',
      '2026-03-29',
    );

    expect(timeRange.start.toISOString()).toBe(
      '2026-03-28T23:00:00.000Z',
    );
    expect(timeRange.endExclusive.toISOString()).toBe(
      '2026-03-29T22:00:00.000Z',
    );
    expect(
      timeRange.endExclusive.getTime() -
        timeRange.start.getTime(),
    ).toBe(23 * 60 * 60 * 1000);
  });

  it('håndterer den 25 timer lange dag ved vintertidsskift', () => {
    const timeRange = getPayrollPeriodTimeRange(
      '2026-10-25',
      '2026-10-25',
    );

    expect(timeRange.start.toISOString()).toBe(
      '2026-10-24T22:00:00.000Z',
    );
    expect(timeRange.endExclusive.toISOString()).toBe(
      '2026-10-25T23:00:00.000Z',
    );
    expect(
      timeRange.endExclusive.getTime() -
        timeRange.start.getTime(),
    ).toBe(25 * 60 * 60 * 1000);
  });

  it('bruger en eksklusiv slutgrænse i databasefiltrene', () => {
    const start = new Date('2026-07-20T22:00:00.000Z');
    const endExclusive = new Date(
      '2026-08-20T22:00:00.000Z',
    );

    expect(
      getPayrollReferenceDateFilters(start, endExclusive),
    ).toEqual([
      {
        shift: {
          is: {
            startTime: {
              gte: start,
              lt: endExclusive,
            },
          },
        },
      },
      {
        shiftId: null,
        clockIn: {
          gte: start,
          lt: endExclusive,
        },
      },
    ]);
  });

  it('placerer 00.30 dansk tid på startdatoen i den nye periode', () => {
    const period = calculatePayrollPeriodForDate(
      {
        payrollPeriodModel: 'FIXED_DAY_TO_DAY',
        payrollPeriodStartDay: 21,
        payrollPeriodEndDay: 20,
      },
      new Date('2026-07-20T22:30:00.000Z'),
    );

    expect(period).toEqual({
      startDate: '2026-07-21',
      endDate: '2026-08-20',
    });
  });

  it('bevarer 23.30 dansk tid på slutdatoen i den gamle periode', () => {
    const period = calculatePayrollPeriodForDate(
      {
        payrollPeriodModel: 'FIXED_DAY_TO_DAY',
        payrollPeriodStartDay: 21,
        payrollPeriodEndDay: 20,
      },
      new Date('2026-07-20T21:30:00.000Z'),
    );

    expect(period).toEqual({
      startDate: '2026-06-21',
      endDate: '2026-07-20',
    });
  });
});
