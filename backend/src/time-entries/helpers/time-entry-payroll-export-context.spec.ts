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

function adjustment(
  overrides:
    Record<string, unknown> = {},
) {
  return {
    id: 8,
    type:
      'EDIT_AFTER_EXPORT',
    status: 'PENDING',
    minutesDelta: 90,
    exportedMinutes: 360,
    adjustedMinutes: 450,
    previousMinutes: 360,
    newMinutes: 450,
    reason:
      'EDIT_AFTER_EXPORT',
    createdAt:
      new Date(
        '2026-07-24T08:00:00.000Z',
      ),
    includedAt: null,
    originalPayrollPeriod:
      exportedPeriod,
    settlementPayrollPeriod:
      openPeriod,
    createdByUser: {
      firstName: 'Admin',
      lastName: 'Test',
      email:
        'admin@example.com',
    },
    ...overrides,
  };
}

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
        payrollAdjustments: [],
        payrollAdjustmentHistory: [],
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

    it('keeps only pending items in the compact notice and every item in history', () => {
      const pending =
        adjustment();
      const included =
        adjustment({
          id: 9,
          status: 'INCLUDED',
          minutesDelta: -30,
          includedAt:
            new Date(
              '2026-08-21T09:00:00.000Z',
            ),
        });

      const result =
        withTimeEntryPayrollExportContext({
          id: 11,
          payrollPeriod:
            openPeriod,
          payrollAdjustments: [
            pending,
            included,
          ],
        });

      expect(
        result.payrollAdjustments,
      ).toEqual([
        pending,
      ]);
      expect(
        result.payrollAdjustmentHistory,
      ).toEqual([
        expect.objectContaining({
          id: 8,
          status: 'PENDING',
          originalPayrollPeriod: {
            id: 4,
            startDate:
              exportedPeriod.startDate,
            endDate:
              exportedPeriod.endDate,
          },
          settlementPayrollPeriod: {
            id: 5,
            startDate:
              openPeriod.startDate,
            endDate:
              openPeriod.endDate,
          },
        }),
        expect.objectContaining({
          id: 9,
          status: 'INCLUDED',
          includedAt:
            new Date(
              '2026-08-21T09:00:00.000Z',
            ),
        }),
      ]);
      expect(
        result.payrollExportContext,
      ).toMatchObject({
        originalPayrollPeriod: {
          id: 4,
        },
        adjustmentPayrollPeriod: {
          id: 5,
        },
        hasPendingAdjustment:
          true,
      });
    });

    it('uses an included adjustment when no pending adjustment exists', () => {
      expect(
        withTimeEntryPayrollExportContext({
          id: 11,
          payrollPeriod:
            openPeriod,
          payrollAdjustments: [
            adjustment({
              status: 'INCLUDED',
              includedAt:
                new Date(
                  '2026-08-21T09:00:00.000Z',
                ),
            }),
          ],
        }),
      ).toMatchObject({
        payrollAdjustments: [],
        payrollAdjustmentHistory: [
          {
            id: 8,
            status: 'INCLUDED',
          },
        ],
        payrollExportContext: {
          originalPayrollPeriod: {
            id: 4,
          },
          hasPendingAdjustment:
            false,
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
        payrollAdjustmentHistory: [],
        payrollExportContext: null,
      });
    });
  },
);
