import { addPayrollCalculationToReport } from './payroll-calculation-report';

describe('locked payroll calculation report', () => {
  it('bruger efterreguleringen fra det låste snapshot frem for live-værdien', () => {
    const report = {
      employees: [
        {
          userId: 7,
          entries: [],
          payrollAdjustments: [{ amountDelta: 999 }],
        },
      ],
    };
    const calculation = {
      lines: [
        {
          lineType: 'ADJUSTMENT',
          roundedAmount: '50.00',
          minutes: 0,
          membership: { userId: 7 },
        },
      ],
    };

    const locked = addPayrollCalculationToReport(report, calculation, {
      useSnapshotAdjustments: true,
    });
    const preview = addPayrollCalculationToReport(report, calculation);

    expect(locked.employees[0].adjustmentAmount).toBe(50);
    expect(locked.adjustmentAmount).toBe(50);
    expect(locked.totalAmount).toBe(50);
    expect(preview.employees[0].adjustmentAmount).toBe(999);
  });
});
