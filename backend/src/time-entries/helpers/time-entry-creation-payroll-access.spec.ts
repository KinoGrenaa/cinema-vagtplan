import { BadRequestException } from '@nestjs/common';
import { acquirePayrollPeriodMutationLockForDate } from '../../payroll/helpers/payroll-period-mutation-lock';
import { ensureTimeEntryCreationPeriodWritable } from './time-entry-creation-payroll-access';

jest.mock(
  '../../payroll/helpers/payroll-period-mutation-lock',
  () => ({
    acquirePayrollPeriodMutationLockForDate:
      jest.fn(),
  }),
);

describe('time entry creation payroll access', () => {
  const prisma = {};
  const referenceDate = new Date(
    '2026-07-10T14:00:00.000Z',
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tillader oprettelse, når der ikke findes en lønperiode endnu', async () => {
    (
      acquirePayrollPeriodMutationLockForDate as jest.Mock
    ).mockResolvedValue({
      payrollPeriod: null,
    });

    await expect(
      ensureTimeEntryCreationPeriodWritable(
        prisma as never,
        {
          cinemaId: 2,
          referenceDate,
        },
      ),
    ).resolves.toBeNull();
  });

  it.each(['OPEN', 'UNLOCKED'])(
    'tillader oprettelse i en %s periode',
    async (status) => {
      const period = {
        id: 12,
        status,
      };
      (
        acquirePayrollPeriodMutationLockForDate as jest.Mock
      ).mockResolvedValue({
        payrollPeriod: period,
      });

      await expect(
        ensureTimeEntryCreationPeriodWritable(
          prisma as never,
          {
            cinemaId: 2,
            referenceDate,
          },
        ),
      ).resolves.toBe(period);
    },
  );

  it('blokerer oprettelse i en LOCKED periode', async () => {
    (
      acquirePayrollPeriodMutationLockForDate as jest.Mock
    ).mockResolvedValue({
      payrollPeriod: {
        id: 12,
        status: 'LOCKED',
      },
    });

    await expect(
      ensureTimeEntryCreationPeriodWritable(
        prisma as never,
        {
          cinemaId: 2,
          referenceDate,
        },
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Lønperioden er låst. Genåbn lønperioden, før der oprettes en tidsregistrering i perioden.',
      ),
    );
  });

  it('tillader glemt registrering i en EXPORTED periode', async () => {
    const period = {
      id: 12,
      status: 'EXPORTED',
    };
    (
      acquirePayrollPeriodMutationLockForDate as jest.Mock
    ).mockResolvedValue({
      payrollPeriod: period,
    });

    await expect(
      ensureTimeEntryCreationPeriodWritable(
        prisma as never,
        {
          cinemaId: 2,
          referenceDate,
        },
      ),
    ).resolves.toBe(period);
  });

  it('låser perioden med biograf og lønreference', async () => {
    (
      acquirePayrollPeriodMutationLockForDate as jest.Mock
    ).mockResolvedValue({
      payrollPeriod: null,
    });

    await ensureTimeEntryCreationPeriodWritable(
      prisma as never,
      {
        cinemaId: 4,
        referenceDate,
      },
    );

    expect(
      acquirePayrollPeriodMutationLockForDate,
    ).toHaveBeenCalledWith(
      prisma,
      {
        cinemaId: 4,
        referenceDate,
      },
    );
  });
});
