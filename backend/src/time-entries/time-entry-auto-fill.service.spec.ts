jest.mock(
  './helpers/time-entry-creation-payroll-access',
  () => ({
    ensureTimeEntryCreationPeriodWritable:
      jest.fn().mockResolvedValue(
        undefined,
      ),
  }),
);

jest.mock(
  './helpers/time-entry-revision-snapshots',
  () => ({
    createDetailedTimeEntryRevisionSnapshot:
      jest.fn(() => ({})),
  }),
);

jest.mock(
  './helpers/time-entry-revisions',
  () => ({
    createTimeEntryRevision:
      jest.fn().mockResolvedValue(
        undefined,
      ),
  }),
);

jest.mock(
  './helpers/time-entry-response',
  () => ({
    notifyTimeEntryUpdated:
      jest.fn(),
  }),
);

import { TimeEntryAutoFillService } from './time-entry-auto-fill.service';

type ProcessShift = (
  cinema: unknown,
  shift: unknown,
) => Promise<boolean>;

function getProcessShift(
  service:
    TimeEntryAutoFillService,
) {
  return (
    service as unknown as {
      processShift:
        ProcessShift;
    }
  ).processShift.bind(
    service,
  );
}

function createHarness() {
  const tx: any = {
    $queryRaw:
      jest.fn().mockResolvedValue(
        [
          {
            id: 1,
          },
        ],
      ),
    timeEntry: {
      findFirst:
        jest.fn(),
      create:
        jest.fn(),
      findUnique:
        jest.fn(),
      update:
        jest.fn(),
    },
  };

  const prisma: any = {
    cinema: {
      findMany:
        jest.fn(),
    },
    shift: {
      findMany:
        jest.fn(),
    },
    $transaction:
      jest.fn(
        async (
          callback:
            (value: any) =>
              Promise<unknown>,
        ) =>
          callback(
            tx,
          ),
      ),
  };

  const realtimeGateway:
    any = {};

  const auditLogsService:
    any = {
      create:
        jest.fn().mockResolvedValue(
          undefined,
        ),
    };

  const service =
    new TimeEntryAutoFillService(
      prisma,
      realtimeGateway,
      auditLogsService,
    );

  return {
    service,
    prisma,
    tx,
    auditLogsService,
  };
}

describe(
  'TimeEntryAutoFillService',
  () => {
    it(
      'creates a missing entry from planned start plus fixed minutes',
      async () => {
        const harness =
          createHarness();

        const processShift =
          getProcessShift(
            harness.service,
          );

        const shiftStart =
          new Date(
            '2026-08-16T15:00:00.000Z',
          );

        const shiftEnd =
          new Date(
            '2026-08-16T18:00:00.000Z',
          );

        const expectedOut =
          new Date(
            '2026-08-16T18:10:00.000Z',
          );

        const cinema = {
          id: 1,
          automaticTimeRegistrationMethod:
            'FIXED_MINUTES',
          automaticTimeRegistrationMinutes:
            190,
        };

        const shift = {
          id: 44,
          userId: 7,
          startTime:
            shiftStart,
          endTime:
            shiftEnd,
          jobFunction: {
            defaultPayrollExportCodeId:
              9,
          },
          timeEntries: [],
        };

        harness.tx.timeEntry.findFirst.mockResolvedValue(
          null,
        );

        harness.tx.timeEntry.create.mockImplementation(
          async ({
            data,
          }: any) => ({
            id: 88,
            ...data,
          }),
        );

        await expect(
          processShift(
            cinema,
            shift,
          ),
        ).resolves.toBe(
          true,
        );

        const createData =
          harness.tx.timeEntry.create.mock.calls[0][0].data;

        expect(
          createData.clockIn,
        ).toEqual(
          shiftStart,
        );

        expect(
          createData.clockOut,
        ).toEqual(
          expectedOut,
        );

        expect(
          createData.status,
        ).toBe(
          'PENDING',
        );

        expect(
          createData.automaticClockIn,
        ).toBe(
          true,
        );

        expect(
          createData.automaticClockOut,
        ).toBe(
          true,
        );
      },
    );

    it(
      'keeps actual clock-in and adds fixed minutes when clock-out is missing',
      async () => {
        const harness =
          createHarness();

        const processShift =
          getProcessShift(
            harness.service,
          );

        const actualClockIn =
          new Date(
            '2026-08-16T15:12:00.000Z',
          );

        const expectedOut =
          new Date(
            '2026-08-16T18:22:00.000Z',
          );

        const existing = {
          id: 91,
          userId: 7,
          cinemaId: 1,
          shiftId: 44,
          clockIn:
            actualClockIn,
          clockOut: null,
          status:
            'PENDING',
          automaticClockIn:
            false,
          automaticClockOut:
            false,
        };

        const cinema = {
          id: 1,
          automaticTimeRegistrationMethod:
            'FIXED_MINUTES',
          automaticTimeRegistrationMinutes:
            190,
        };

        const shift = {
          id: 44,
          userId: 7,
          startTime:
            new Date(
              '2026-08-16T15:00:00.000Z',
            ),
          endTime:
            new Date(
              '2026-08-16T18:00:00.000Z',
            ),
          timeEntries: [
            existing,
          ],
        };

        harness.tx.timeEntry.findUnique.mockResolvedValue(
          existing,
        );

        harness.tx.timeEntry.update.mockImplementation(
          async ({
            data,
          }: any) => ({
            ...existing,
            ...data,
          }),
        );

        await expect(
          processShift(
            cinema,
            shift,
          ),
        ).resolves.toBe(
          true,
        );

        const updateData =
          harness.tx.timeEntry.update.mock.calls[0][0].data;

        expect(
          updateData.clockOut,
        ).toEqual(
          expectedOut,
        );

        expect(
          updateData.automaticClockOut,
        ).toBe(
          true,
        );

        expect(
          existing.clockIn,
        ).toEqual(
          actualClockIn,
        );
      },
    );

    it(
      'uses planned end when planned-shift method completes an open entry',
      async () => {
        const harness =
          createHarness();

        const processShift =
          getProcessShift(
            harness.service,
          );

        const plannedEnd =
          new Date(
            '2026-08-16T18:00:00.000Z',
          );

        const existing = {
          id: 92,
          userId: 7,
          cinemaId: 1,
          shiftId: 45,
          clockIn:
            new Date(
              '2026-08-16T15:37:00.000Z',
            ),
          clockOut: null,
          status:
            'PENDING',
        };

        const shift = {
          id: 45,
          userId: 7,
          startTime:
            new Date(
              '2026-08-16T15:30:00.000Z',
            ),
          endTime:
            plannedEnd,
          timeEntries: [
            existing,
          ],
        };

        harness.tx.timeEntry.findUnique.mockResolvedValue(
          existing,
        );

        harness.tx.timeEntry.update.mockImplementation(
          async ({
            data,
          }: any) => ({
            ...existing,
            ...data,
          }),
        );

        await expect(
          processShift(
            {
              id: 1,
              automaticTimeRegistrationMethod:
                'PLANNED_SHIFT',
              automaticTimeRegistrationMinutes:
                190,
            },
            shift,
          ),
        ).resolves.toBe(
          true,
        );

        expect(
          harness.tx.timeEntry.update.mock.calls[0][0].data.clockOut,
        ).toEqual(
          plannedEnd,
        );
      },
    );

    it(
      'does nothing when the registration is already complete',
      async () => {
        const harness =
          createHarness();

        const processShift =
          getProcessShift(
            harness.service,
          );

        const result =
          await processShift(
            {
              id: 1,
              automaticTimeRegistrationMethod:
                'FIXED_MINUTES',
              automaticTimeRegistrationMinutes:
                190,
            },
            {
              id: 46,
              userId: 7,
              startTime:
                new Date(
                  '2026-08-16T15:00:00.000Z',
                ),
              endTime:
                new Date(
                  '2026-08-16T18:00:00.000Z',
                ),
              timeEntries: [
                {
                  id: 93,
                  clockIn:
                    new Date(
                      '2026-08-16T15:00:00.000Z',
                    ),
                  clockOut:
                    new Date(
                      '2026-08-16T18:00:00.000Z',
                    ),
                  status:
                    'PENDING',
                },
              ],
            },
          );

        expect(
          result,
        ).toBe(
          false,
        );

        expect(
          harness.prisma.$transaction,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'is idempotent when another entry already exists for the shift',
      async () => {
        const harness =
          createHarness();

        const processShift =
          getProcessShift(
            harness.service,
          );

        harness.tx.timeEntry.findFirst.mockResolvedValue(
          {
            id: 999,
          },
        );

        const result =
          await processShift(
            {
              id: 1,
              automaticTimeRegistrationMethod:
                'FIXED_MINUTES',
              automaticTimeRegistrationMinutes:
                190,
            },
            {
              id: 47,
              userId: 7,
              startTime:
                new Date(
                  '2026-08-16T15:00:00.000Z',
                ),
              endTime:
                new Date(
                  '2026-08-16T18:00:00.000Z',
                ),
              jobFunction: null,
              timeEntries: [],
            },
          );

        expect(
          result,
        ).toBe(
          false,
        );

        expect(
          harness.tx.timeEntry.create,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'waits until the first Copenhagen midnight after an overnight shift has ended',
      async () => {
        const harness =
          createHarness();

        const activeFrom =
          new Date(
            '2026-08-16T18:49:00.000Z',
          );

        harness.prisma.cinema.findMany.mockResolvedValue(
          [
            {
              id: 1,
              automaticTimeRegistrationMethod:
                'FIXED_MINUTES',
              automaticTimeRegistrationMinutes:
                190,
              automaticTimeRegistrationActiveFrom:
                activeFrom,
            },
          ],
        );

        harness.prisma.shift.findMany.mockResolvedValue(
          [],
        );

        await harness.service.processMissingTimeEntries(
          {
            referenceDate:
              new Date(
                '2026-08-16T22:15:00.000Z',
              ),
          },
        );

        await harness.service.processMissingTimeEntries(
          {
            referenceDate:
              new Date(
                '2026-08-17T22:15:00.000Z',
              ),
          },
        );

        const firstCutoff =
          harness.prisma.shift.findMany.mock.calls[0][0].where.endTime.lt;

        const secondCutoff =
          harness.prisma.shift.findMany.mock.calls[1][0].where.endTime.lt;

        expect(
          firstCutoff.toISOString(),
        ).toBe(
          '2026-08-16T22:00:00.000Z',
        );

        expect(
          secondCutoff.toISOString(),
        ).toBe(
          '2026-08-17T22:00:00.000Z',
        );

        const overnightEnd =
          new Date(
            '2026-08-17T00:00:00.000Z',
          );

        expect(
          overnightEnd.getTime() <
            firstCutoff.getTime(),
        ).toBe(
          false,
        );

        expect(
          overnightEnd.getTime() <
            secondCutoff.getTime(),
        ).toBe(
          true,
        );

        expect(
          harness.prisma.shift.findMany.mock.calls[0][0].where.endTime.gt,
        ).toEqual(
          activeFrom,
        );
      },
    );
  },
);
