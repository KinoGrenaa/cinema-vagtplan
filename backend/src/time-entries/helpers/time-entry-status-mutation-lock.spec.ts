import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { acquirePayrollPeriodMutationLockForDate } from '../../payroll/helpers/payroll-period-mutation-lock';
import {
  ensureTimeEntryEditable,
  ensureUserCanAccessTimeEntry,
} from './time-entry-access';
import { withLockedTimeEntryStatusMutation } from './time-entry-status-mutation-lock';

jest.mock(
  '../../payroll/helpers/payroll-period-mutation-lock',
  () => ({
    acquirePayrollPeriodMutationLockForDate:
      jest.fn(),
  }),
);

jest.mock('./time-entry-access', () => ({
  ensureTimeEntryEditable: jest.fn(),
  ensureUserCanAccessTimeEntry: jest.fn(),
}));

describe('time entry status mutation lock', () => {
  const shiftStart = new Date(
    '2026-07-20T21:30:00.000Z',
  );
  const initialEntry = {
    id: 41,
    cinemaId: 2,
    status: 'PENDING',
    clockIn: new Date(
      '2026-07-20T22:30:00.000Z',
    ),
    shift: {
      id: 19,
      startTime: shiftStart,
    },
  };
  const user = {
    sub: 7,
    role: 'ADMIN',
    cinemaId: 2,
  };

  function createPrisma(currentEntry: any) {
    const tx = {
      timeEntry: {
        findUnique: jest
          .fn()
          .mockResolvedValue(currentEntry),
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
      acquirePayrollPeriodMutationLockForDate as jest.Mock
    ).mockResolvedValue({
      payrollPeriod: null,
    });
  });

  it('låser perioden, genlæser og muterer i samme transaktion', async () => {
    const currentEntry = {
      ...initialEntry,
      status: 'NEEDS_CHANGES',
    };
    const { prisma, tx } =
      createPrisma(currentEntry);
    const mutate = jest
      .fn()
      .mockResolvedValue({
        id: 41,
        status: 'APPROVED',
      });

    await expect(
      withLockedTimeEntryStatusMutation({
        prisma: prisma as never,
        initialEntry,
        user,
        mutate,
      }),
    ).resolves.toEqual({
      id: 41,
      status: 'APPROVED',
    });

    expect(
      acquirePayrollPeriodMutationLockForDate,
    ).toHaveBeenCalledWith(tx, {
      cinemaId: 2,
      referenceDate: shiftStart,
    });
    expect(tx.timeEntry.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 41,
        },
      }),
    );
    expect(
      ensureUserCanAccessTimeEntry,
    ).toHaveBeenCalledWith(
      user,
      currentEntry,
      undefined,
    );
    expect(
      ensureTimeEntryEditable,
    ).toHaveBeenCalledWith(
      currentEntry,
      user,
    );
    expect(mutate).toHaveBeenCalledWith(
      tx,
      currentEntry,
    );
  });

  it('afviser, hvis registreringen blev flyttet før låsen blev opnået', async () => {
    const { prisma } = createPrisma({
      ...initialEntry,
      shift: {
        id: 19,
        startTime: new Date(
          '2026-07-21T21:30:00.000Z',
        ),
      },
    });

    await expect(
      withLockedTimeEntryStatusMutation({
        prisma: prisma as never,
        initialEntry,
        user,
        mutate: jest.fn(),
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('afviser, hvis registreringen blev slettet', async () => {
    const { prisma } = createPrisma(null);

    await expect(
      withLockedTimeEntryStatusMutation({
        prisma: prisma as never,
        initialEntry,
        user,
        mutate: jest.fn(),
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
