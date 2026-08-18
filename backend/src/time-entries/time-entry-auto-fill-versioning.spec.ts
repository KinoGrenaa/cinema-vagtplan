import { TimeEntryAutoFillService } from './time-entry-auto-fill.service';

function createHarness() {
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
      jest.fn(),
  };

  const realtimeGateway:
    any = {};

  const auditLogsService:
    any = {
      create:
        jest.fn(),
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
  };
}

describe(
  'TimeEntryAutoFillService versioned configuration',
  () => {
    it(
      'uses the method that was valid when each shift ended',
      async () => {
        const {
          service,
          prisma,
        } =
          createHarness();

        const changeTime =
          new Date(
            '2026-08-18T06:47:00.000Z',
          );

        prisma.cinema.findMany.mockResolvedValue(
          [
            {
              id: 1,
              automaticTimeRegistrationActiveFrom:
                new Date(
                  '2026-08-16T18:49:00.000Z',
                ),
              automaticTimeRegistrationVersions:
                [
                  {
                    method:
                      'PLANNED_SHIFT',
                    minutes:
                      190,
                    validFrom:
                      changeTime,
                    validTo:
                      null,
                  },
                  {
                    method:
                      'FIXED_MINUTES',
                    minutes:
                      190,
                    validFrom:
                      new Date(
                        '2026-08-16T18:49:00.000Z',
                      ),
                    validTo:
                      changeTime,
                  },
                ],
            },
          ],
        );

        const oldShift = {
          id: 51,
          endTime:
            new Date(
              '2026-08-18T06:46:59.000Z',
            ),
        };

        const newShift = {
          id: 52,
          endTime:
            changeTime,
        };

        prisma.shift.findMany.mockResolvedValue(
          [
            oldShift,
            newShift,
          ],
        );

        const processShift =
          jest
            .spyOn(
              service as any,
              'processShift',
            )
            .mockResolvedValue(
              true,
            );

        await expect(
          service.processMissingTimeEntries(
            {
              referenceDate:
                new Date(
                  '2026-08-19T08:00:00.000Z',
                ),
            },
          ),
        ).resolves.toBe(
          2,
        );

        expect(
          processShift,
        ).toHaveBeenNthCalledWith(
          1,
          {
            id: 1,
            automaticTimeRegistrationMethod:
              'FIXED_MINUTES',
            automaticTimeRegistrationMinutes:
              190,
          },
          oldShift,
        );

        expect(
          processShift,
        ).toHaveBeenNthCalledWith(
          2,
          {
            id: 1,
            automaticTimeRegistrationMethod:
              'PLANNED_SHIFT',
            automaticTimeRegistrationMinutes:
              190,
          },
          newShift,
        );
      },
    );

    it(
      'does not use a current method as fallback when no historical version matches',
      async () => {
        const {
          service,
          prisma,
        } =
          createHarness();

        prisma.cinema.findMany.mockResolvedValue(
          [
            {
              id: 1,
              automaticTimeRegistrationActiveFrom:
                new Date(
                  '2026-08-16T18:49:00.000Z',
                ),
              automaticTimeRegistrationVersions:
                [
                  {
                    method:
                      'PLANNED_SHIFT',
                    minutes:
                      0,
                    validFrom:
                      new Date(
                        '2026-08-18T06:47:00.000Z',
                      ),
                    validTo:
                      null,
                  },
                ],
            },
          ],
        );

        prisma.shift.findMany.mockResolvedValue(
          [
            {
              id: 53,
              endTime:
                new Date(
                  '2026-08-17T20:00:00.000Z',
                ),
            },
          ],
        );

        const processShift =
          jest.spyOn(
            service as any,
            'processShift',
          );

        await expect(
          service.processMissingTimeEntries(
            {
              referenceDate:
                new Date(
                  '2026-08-19T08:00:00.000Z',
                ),
            },
          ),
        ).resolves.toBe(
          0,
        );

        expect(
          processShift,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
