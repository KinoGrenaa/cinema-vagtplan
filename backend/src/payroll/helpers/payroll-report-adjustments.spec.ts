import {
  addPayrollReportAdjustment,
} from './payroll-report-adjustments';

describe(
  'payroll report adjustments',
  () => {
    it('includes settlement-period dates and status in the report', () => {
      const grouped =
        new Map<number, any>();

      addPayrollReportAdjustment(
        grouped,
        {
          id: 31,
          userId: 7,
          timeEntryId: 19,
          type: 'HOURS_DELTA',
          status: 'INCLUDED',
          exportCategory:
            'ADJUSTMENT',
          minutesDelta: 90,
          exportedMinutes: 360,
          adjustedMinutes: 450,
          previousMinutes: 360,
          newMinutes: 450,
          reason:
            'EDIT_AFTER_EXPORT',
          originalPayrollPeriodId:
            4,
          settlementPayrollPeriodId:
            5,
          originalPayrollPeriod: {
            startDate:
              new Date(
                '2026-06-20T22:00:00.000Z',
              ),
            endDate:
              new Date(
                '2026-07-20T22:00:00.000Z',
              ),
          },
          settlementPayrollPeriod: {
            startDate:
              new Date(
                '2026-07-20T22:00:00.000Z',
              ),
            endDate:
              new Date(
                '2026-08-20T22:00:00.000Z',
              ),
          },
          payrollType: null,
          user: {
            firstName: 'Anna',
            lastName: 'Andersen',
            email:
              'anna@example.com',
            cinemaMemberships: [
              {
                hireDate: null,
                employeeNumber:
                  'KG-42',
                payrollEmployeeId:
                  'LON-42',
              },
            ],
          },
          timeEntry: {
            shift: {
              jobFunction: {
                name: 'Kiosk',
                payrollType: null,
              },
            },
          },
          createdAt:
            new Date(
              '2026-07-24T08:00:00.000Z',
            ),
        } as never,
      );

      expect(
        grouped.get(7)
          .payrollAdjustments,
      ).toEqual([
        expect.objectContaining({
          id: 31,
          timeEntryId: 19,
          status: 'INCLUDED',
          hours: 1.5,
          originalPayrollPeriodStartDate:
            '2026-06-20',
          originalPayrollPeriodEndDate:
            '2026-07-20',
          settlementPayrollPeriodStartDate:
            '2026-07-20',
          settlementPayrollPeriodEndDate:
            '2026-08-20',
        }),
      ]);
    });

    it('returns null settlement dates while an adjustment awaits a period', () => {
      const grouped =
        new Map<number, any>();

      addPayrollReportAdjustment(
        grouped,
        {
          id: 32,
          userId: 8,
          timeEntryId: 20,
          type: 'HOURS_DELTA',
          status: 'PENDING',
          exportCategory:
            'ADJUSTMENT',
          minutesDelta: -30,
          exportedMinutes: 300,
          adjustedMinutes: 270,
          previousMinutes: 300,
          newMinutes: 270,
          reason:
            'UNAPPROVAL_AFTER_EXPORT',
          originalPayrollPeriodId:
            4,
          settlementPayrollPeriodId:
            null,
          originalPayrollPeriod: {
            startDate:
              new Date(
                '2026-06-20T22:00:00.000Z',
              ),
            endDate:
              new Date(
                '2026-07-20T22:00:00.000Z',
              ),
          },
          settlementPayrollPeriod:
            null,
          payrollType: null,
          user: {
            firstName: 'Bo',
            lastName: 'Berg',
            email:
              'bo@example.com',
            cinemaMemberships: [],
          },
          timeEntry: {
            shift: null,
          },
          createdAt:
            new Date(
              '2026-07-24T09:00:00.000Z',
            ),
        } as never,
      );

      expect(
        grouped.get(8)
          .payrollAdjustments[0],
      ).toMatchObject({
        status: 'PENDING',
        settlementPayrollPeriodId:
          null,
        settlementPayrollPeriodStartDate:
          null,
        settlementPayrollPeriodEndDate:
          null,
      });
    });
  },
);
