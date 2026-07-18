import { createEditAfterExportPayrollAdjustmentIfNeeded } from './time-entry-exported-payroll-adjustments';
import {
  recordAdminTimeEntryUpdated,
  recordOwnTimeEntryUpdated,
} from './time-entry-mutation-records';
import { findTimeEntryWithUserCinemaShiftOrThrow } from './time-entry-query-helpers';
import { notifyTimeEntryUpdated } from './time-entry-response';
import {
  getAdminTimeEntryUpdateContext,
  getOwnTimeEntryUpdateContext,
} from './time-entry-update-helpers';
import { lockTimeEntryUpdatePayrollPeriods } from './time-entry-update-payroll-lock';
import {
  updateAdminTimeEntry,
  updateOwnTimeEntry,
} from './time-entry-update-flow';
import { getTimeEntryEditPayrollContext } from './time-entry-edit-payroll-context';

jest.mock('./time-entry-access', () => ({
  ensureTimeEntryEditable: jest.fn(),
  ensureUserCanAccessTimeEntry: jest.fn(),
}));

jest.mock('./time-entry-edit-payroll-context', () => ({
  getTimeEntryEditPayrollContext: jest.fn(),
}));

jest.mock(
  './time-entry-exported-payroll-adjustments',
  () => ({
    createEditAfterExportPayrollAdjustmentIfNeeded:
      jest.fn(),
  }),
);

jest.mock('./time-entry-includes', () => ({
  getTimeEntryResponseInclude: jest.fn(
    () => ({}),
  ),
}));

jest.mock('./time-entry-mutation-records', () => ({
  recordAdminTimeEntryUpdated: jest.fn(),
  recordOwnTimeEntryUpdated: jest.fn(),
}));

jest.mock('./time-entry-query-helpers', () => ({
  findTimeEntryWithUserCinemaShiftOrThrow:
    jest.fn(),
}));

jest.mock('./time-entry-response', () => ({
  notifyTimeEntryUpdated: jest.fn(
    (_gateway, entry) => entry,
  ),
}));

jest.mock('./time-entry-update-helpers', () => ({
  ensureOwnTimeEntryCanBeUpdated: jest.fn(),
  getAdminTimeEntryUpdateContext: jest.fn(),
  getOwnTimeEntryUpdateContext: jest.fn(),
}));

jest.mock('./time-entry-update-payroll-lock', () => ({
  lockTimeEntryUpdatePayrollPeriods:
    jest.fn(),
}));

describe('time entry update payroll transaction', () => {
  const clockIn = new Date(
    '2026-07-10T14:00:00.000Z',
  );
  const clockOut = new Date(
    '2026-07-10T22:00:00.000Z',
  );
  const nextClockIn = new Date(
    '2026-07-10T15:00:00.000Z',
  );
  const nextClockOut = new Date(
    '2026-07-10T23:00:00.000Z',
  );
  const initialEntry = {
    id: 41,
    cinemaId: 2,
    userId: 8,
    status: 'APPROVED',
    clockIn,
    clockOut,
    adminNote: null,
  };
  const updatedEntry = {
    ...initialEntry,
    clockIn: nextClockIn,
    clockOut: nextClockOut,
  };
  const user = {
    sub: 7,
    role: 'ADMIN',
    cinemaId: 2,
  };

  function createPrisma() {
    const tx = {
      timeEntry: {
        update: jest
          .fn()
          .mockResolvedValue(updatedEntry),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (
          callback: (
            transaction: typeof tx,
          ) => unknown,
        ) => callback(tx),
      ),
    };

    return {
      prisma,
      tx,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (
      findTimeEntryWithUserCinemaShiftOrThrow as jest.Mock
    ).mockResolvedValue(initialEntry);
    (
      lockTimeEntryUpdatePayrollPeriods as jest.Mock
    ).mockResolvedValue({
      existingEntry: initialEntry,
    });
    (
      getAdminTimeEntryUpdateContext as jest.Mock
    ).mockReturnValue({
      nextClockIn,
      nextClockOut,
      nextClockInNote: null,
      nextClockOutNote: null,
      changes: ['Tid rettet'],
    });
    (
      getOwnTimeEntryUpdateContext as jest.Mock
    ).mockReturnValue({
      newClockIn: nextClockIn,
      newClockOut: nextClockOut,
      newClockInNote: null,
      newClockOutNote: null,
      changes: ['Tid rettet'],
    });
    (
      getTimeEntryEditPayrollContext as jest.Mock
    ).mockResolvedValue({
      originalPayrollPeriod: {
        id: 12,
        startDate: new Date(
          '2026-06-21T00:00:00.000Z',
        ),
        endDate: new Date(
          '2026-07-20T23:59:59.999Z',
        ),
      },
      adjustmentPayrollPeriod: {
        id: 13,
        startDate: new Date(
          '2026-07-21T00:00:00.000Z',
        ),
        endDate: new Date(
          '2026-08-20T23:59:59.999Z',
        ),
      },
      exportedMinutes: 480,
    });
    (
      createEditAfterExportPayrollAdjustmentIfNeeded as jest.Mock
    ).mockResolvedValue({
      id: 91,
    });
    (
      recordAdminTimeEntryUpdated as jest.Mock
    ).mockResolvedValue(undefined);
    (
      recordOwnTimeEntryUpdated as jest.Mock
    ).mockResolvedValue(undefined);
  });

  it('gemmer administratorrettelse og efterregulering i samme transaktion', async () => {
    const { prisma, tx } = createPrisma();

    await expect(
      updateAdminTimeEntry({
        prisma: prisma as never,
        payrollService: {} as never,
        realtimeGateway: {} as never,
        auditLogsService: {} as never,
        user,
        id: 41,
        data: {
          clockIn: nextClockIn.toISOString(),
          clockOut: nextClockOut.toISOString(),
          adminNote: 'Rettet efter kontrol',
          confirmPayrollAdjustment: true,
        },
      }),
    ).resolves.toBe(updatedEntry);

    expect(
      createEditAfterExportPayrollAdjustmentIfNeeded,
    ).toHaveBeenCalledWith({
      prisma: tx,
      payrollService: {},
      existingEntry: initialEntry,
      entry: updatedEntry,
      reason: 'Rettet efter kontrol',
      changedByUserId: 7,
    });
    expect(
      tx.timeEntry.update.mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      (
        createEditAfterExportPayrollAdjustmentIfNeeded as jest.Mock
      ).mock.invocationCallOrder[0],
    );
    expect(
      (
        createEditAfterExportPayrollAdjustmentIfNeeded as jest.Mock
      ).mock.invocationCallOrder[0],
    ).toBeLessThan(
      (
        recordAdminTimeEntryUpdated as jest.Mock
      ).mock.invocationCallOrder[0],
    );
  });

  it('ruller administratorrettelsen tilbage, hvis efterreguleringen fejler', async () => {
    const { prisma } = createPrisma();
    (
      createEditAfterExportPayrollAdjustmentIfNeeded as jest.Mock
    ).mockRejectedValue(
      new Error(
        'Efterreguleringen kunne ikke gemmes',
      ),
    );

    await expect(
      updateAdminTimeEntry({
        prisma: prisma as never,
        payrollService: {} as never,
        realtimeGateway: {} as never,
        auditLogsService: {} as never,
        user,
        id: 41,
        data: {
          clockIn: nextClockIn.toISOString(),
          clockOut: nextClockOut.toISOString(),
          adminNote: 'Rettet efter kontrol',
          confirmPayrollAdjustment: true,
        },
      }),
    ).rejects.toThrow(
      'Efterreguleringen kunne ikke gemmes',
    );

    expect(
      recordAdminTimeEntryUpdated,
    ).not.toHaveBeenCalled();
    expect(
      notifyTimeEntryUpdated,
    ).not.toHaveBeenCalled();
  });

  it('bruger også transaktionsklienten ved medarbejderrettelse', async () => {
    const { prisma, tx } = createPrisma();
    const employee = {
      sub: 8,
      role: 'EMPLOYEE',
      cinemaId: 2,
    };

    await expect(
      updateOwnTimeEntry({
        prisma: prisma as never,
        payrollService: {} as never,
        realtimeGateway: {} as never,
        auditLogsService: {} as never,
        user: employee,
        id: 41,
        data: {
          clockIn: nextClockIn.toISOString(),
          clockOut: nextClockOut.toISOString(),
        },
      }),
    ).resolves.toBe(updatedEntry);

    expect(
      createEditAfterExportPayrollAdjustmentIfNeeded,
    ).toHaveBeenCalledWith({
      prisma: tx,
      payrollService: {},
      existingEntry: initialEntry,
      entry: updatedEntry,
      reason:
        'Tidsregistrering rettet af medarbejderen',
      changedByUserId: 8,
    });
  });
});
