import {
  withTimeEntryPayrollExportContext,
} from './time-entry-payroll-export-context';

const exportedPeriod = {
  id: 4,
  status: 'EXPORTED',
  startDate:
    new Date(
      '2026-06-20T22:00:00.000Z',
    ),
  endDate:
    new Date(
      '2026-07-20T22:00:00.000Z',
    ),
};

const openPeriod = {
  id: 5,
  status: 'OPEN',
  startDate:
    new Date(
      '2026-07-20T22:00:00.000Z',
    ),
  endDate:
    new Date(
      '2026-08-20T22:00:00.000Z',
    ),
};

describe(
  'time entry payroll export context',
  () => {
    it('marks an entry linked directly to an exported period', () => {
      expect(
        withTimeEntryPayrollExportContext({
          id: 11,
          payrollPeriod:
            exportedPeriod,
          payrollAdjustments: [],
        }),
      ).toMatchObject({
        payrollExportContext: {
          originalPayrollPeriod: {
            id: 4,
          },
          adjustmentPayrollPeriod:
            null,
          hasPendingAdjustment:
            false,
          requiresConfirmation:
            true,
        },
      });
    });

    it('uses pending adjustment periods when an adjustment already exists', () => {
      expect(
        withTimeEntryPayrollExportContext({
          id: 11,
          payrollPeriod:
            openPeriod,
          payrollAdjustments: [
            {
              id: 8,
              originalPayrollPeriod:
                exportedPeriod,
              settlementPayrollPeriod:
                openPeriod,
            },
          ],
        }),
      ).toMatchObject({
        payrollExportContext: {
          originalPayrollPeriod: {
            id: 4,
          },
          adjustmentPayrollPeriod: {
            id: 5,
          },
          hasPendingAdjustment:
            true,
        },
      });
    });

    it('uses the original period on adjustment entries', () => {
      expect(
        withTimeEntryPayrollExportContext({
          id: 11,
          originalPayrollPeriod:
            exportedPeriod,
          adjustmentPayrollPeriod:
            openPeriod,
          payrollAdjustments: [],
        }),
      ).toMatchObject({
        payrollExportContext: {
          originalPayrollPeriod: {
            id: 4,
          },
          adjustmentPayrollPeriod: {
            id: 5,
          },
        },
      });
    });

    it('does not mark entries without an exported payroll reference', () => {
      expect(
        withTimeEntryPayrollExportContext({
          id: 11,
          payrollPeriod:
            openPeriod,
          payrollAdjustments: [],
        }),
      ).toMatchObject({
        payrollExportContext: null,
      });
    });
  },
);
