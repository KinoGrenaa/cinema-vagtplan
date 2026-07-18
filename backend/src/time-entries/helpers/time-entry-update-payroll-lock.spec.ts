import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { acquirePayrollPeriodMutationLocksForDates } from '../../payroll/helpers/payroll-period-mutation-lock';
import { lockTimeEntryUpdatePayrollPeriods } from './time-entry-update-payroll-lock';

jest.mock(
  '../../payroll/helpers/payroll-period-mutation-lock',
  () => ({
    acquirePayrollPeriodMutationLocksForDates:
      jest.fn(),
  }),
);

describe('time entry update payroll lock', () => {
  const sourceStart = new Date(
    '2026-06-21T00:00:00.000Z',
  );
  const destinationStart = new Date(
    '2026-07-21T00:00:00.000Z',
  );
  const initialClockIn = new Date(
    '2026-07-10T14:00:00.000Z',
  );
  const nextClockIn = new Date(
    '2026-07-22T14:00:00.000Z',
  );

  function createLock(
    start: Date,
    status: string | null,
  ) {
    return {
      referenceDate: start,
      startDate: start
        .toISOString()
        .slice(0, 10),
      endDate: '2026-08-20',
      periodDates: {
        start,
        end: new Date(
          start.getTime() +
            30 * 24 * 60 * 60 * 1000,
        ),
      },
      payrollPeriod: status
        ? {
            id:
              start.getTime() ===
              sourceStart.getTime()
                ? 11
                : 12,
            status,
          }
        : null,
    };
  }

  function createEntry(overrides: any = {}) {
    return {
      id: 41,
      cinemaId: 2,
      userId: 8,
      status: 'PENDING',
      clockIn: initialClockIn,
      shift: null,
      payrollPeriod: null,
      ...overrides,
    };
  }

  function createTx(currentEntry: any) {
    return {
      timeEntry: {
        findUnique: jest
          .fn()
          .mockResolvedValue(currentEntry),
      },
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blokerer flytning ind i en LOCKED periode', async () => {
    (
      acquirePayrollPeriodMutationLocksForDates as jest.Mock
    ).mockResolvedValue([
      createLock(sourceStart, 'OPEN'),
      createLock(destinationStart, 'LOCKED'),
    ]);
    const tx = createTx(createEntry());

    await expect(
      lockTimeEntryUpdatePayrollPeriods(
        tx as never,
        {
          initialEntry: createEntry(),
          nextClockIn,
        },
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Lønperioden for den nye mødetid er låst. Genåbn lønperioden, før tidsregistreringen flyttes.',
      ),
    );
  });

  it.each(['OPEN', 'UNLOCKED', 'EXPORTED'])(
    'tillader en PENDING registrering at flytte til %s',
    async (status) => {
      (
        acquirePayrollPeriodMutationLocksForDates as jest.Mock
      ).mockResolvedValue([
        createLock(sourceStart, 'OPEN'),
        createLock(destinationStart, status),
      ]);
      const currentEntry = createEntry();
      const tx = createTx(currentEntry);

      await expect(
        lockTimeEntryUpdatePayrollPeriods(
          tx as never,
          {
            initialEntry: createEntry(),
            nextClockIn,
          },
        ),
      ).resolves.toMatchObject({
        existingEntry: currentEntry,
        destinationLock: {
          payrollPeriod: {
            status,
          },
        },
      });
    },
  );

  it('bevarer vagtens starttid som lønreference', async () => {
    const shiftStart = new Date(
      '2026-07-10T12:00:00.000Z',
    );
    const entry = createEntry({
      shift: {
        id: 19,
        startTime: shiftStart,
      },
    });
    (
      acquirePayrollPeriodMutationLocksForDates as jest.Mock
    ).mockResolvedValue([
      createLock(sourceStart, 'OPEN'),
      createLock(sourceStart, 'OPEN'),
    ]);
    const tx = createTx(entry);

    await lockTimeEntryUpdatePayrollPeriods(
      tx as never,
      {
        initialEntry: entry,
        nextClockIn,
      },
    );

    expect(
      acquirePayrollPeriodMutationLocksForDates,
    ).toHaveBeenCalledWith(tx, {
      cinemaId: 2,
      referenceDates: [
        shiftStart,
        shiftStart,
      ],
    });
  });

  it('afviser en registrering, som blev ændret før låsen blev opnået', async () => {
    (
      acquirePayrollPeriodMutationLocksForDates as jest.Mock
    ).mockResolvedValue([
      createLock(sourceStart, 'OPEN'),
      createLock(destinationStart, 'OPEN'),
    ]);
    const tx = createTx(
      createEntry({
        clockIn: new Date(
          '2026-07-11T14:00:00.000Z',
        ),
      }),
    );

    await expect(
      lockTimeEntryUpdatePayrollPeriods(
        tx as never,
        {
          initialEntry: createEntry(),
          nextClockIn,
        },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('kræver fjernelse af godkendelse før flytning mellem perioder', async () => {
    (
      acquirePayrollPeriodMutationLocksForDates as jest.Mock
    ).mockResolvedValue([
      createLock(sourceStart, 'EXPORTED'),
      createLock(destinationStart, 'EXPORTED'),
    ]);
    const tx = createTx(
      createEntry({
        status: 'APPROVED',
      }),
    );

    await expect(
      lockTimeEntryUpdatePayrollPeriods(
        tx as never,
        {
          initialEntry: createEntry({
            status: 'APPROVED',
          }),
          nextClockIn,
        },
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Fjern godkendelsen, før tidsregistreringen flyttes til en anden lønperiode.',
      ),
    );
  });

  it('tillader rettelse af en APPROVED registrering inden for samme periode', async () => {
    (
      acquirePayrollPeriodMutationLocksForDates as jest.Mock
    ).mockResolvedValue([
      createLock(sourceStart, 'EXPORTED'),
      createLock(sourceStart, 'EXPORTED'),
    ]);
    const currentEntry = createEntry({
      status: 'APPROVED',
    });
    const tx = createTx(currentEntry);

    await expect(
      lockTimeEntryUpdatePayrollPeriods(
        tx as never,
        {
          initialEntry: currentEntry,
          nextClockIn: new Date(
            '2026-07-10T15:00:00.000Z',
          ),
        },
      ),
    ).resolves.toMatchObject({
      existingEntry: currentEntry,
    });
  });
});
