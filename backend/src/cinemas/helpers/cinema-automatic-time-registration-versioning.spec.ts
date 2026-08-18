import { updateCinemaSettings } from './cinema-settings-flow';

function createHarness(
  cinemaOverrides:
    Record<string, unknown> = {},
) {
  const cinema = {
    id: 7,
    name: 'Kino Nord',
    logoUrl: null,
    automaticTimeRegistrationEnabled:
      true,
    automaticTimeRegistrationMethod:
      'FIXED_MINUTES',
    automaticTimeRegistrationMinutes:
      190,
    automaticTimeRegistrationActiveFrom:
      new Date(
        '2026-08-16T18:49:00.000Z',
      ),
    ...cinemaOverrides,
  };

  const transaction:
    any = {
    $executeRaw:
      jest
        .fn()
        .mockResolvedValue(
          1,
        ),
    cinema: {
      findUnique:
        jest
          .fn()
          .mockResolvedValue(
            cinema,
          ),
      findFirst:
        jest.fn(),
      update:
        jest
          .fn()
          .mockImplementation(
            async ({
              data,
            }: any) => ({
              ...cinema,
              ...data,
            }),
          ),
    },
    cinemaAutomaticTimeRegistrationVersion:
      {
        updateMany:
          jest
            .fn()
            .mockResolvedValue(
              {
                count: 1,
              },
            ),
        create:
          jest
            .fn()
            .mockImplementation(
              async ({
                data,
              }: any) =>
                data,
            ),
      },
  };

  const prisma:
    any = {
    $transaction:
      jest.fn(
        async (
          callback:
            (value: any) =>
              Promise<unknown>,
        ) =>
          callback(
            transaction,
          ),
      ),
  };

  return {
    cinema,
    transaction,
    prisma,
  };
}

describe(
  'automatic time registration configuration versions',
  () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it(
      'starts a new version when the method changes while automation stays enabled',
      async () => {
        jest.useFakeTimers();

        const effectiveAt =
          new Date(
            '2026-08-18T06:47:00.000Z',
          );

        jest.setSystemTime(
          effectiveAt,
        );

        const {
          transaction,
          prisma,
        } =
          createHarness();

        await updateCinemaSettings(
          prisma,
          7,
          {
            automaticTimeRegistrationMethod:
              'PLANNED_SHIFT',
          },
        );

        expect(
          transaction
            .cinemaAutomaticTimeRegistrationVersion
            .updateMany,
        ).toHaveBeenCalledWith({
          where: {
            cinemaId: 7,
            validTo:
              null,
          },
          data: {
            validTo:
              effectiveAt,
          },
        });

        expect(
          transaction
            .cinemaAutomaticTimeRegistrationVersion
            .create,
        ).toHaveBeenCalledWith({
          data: {
            cinemaId: 7,
            method:
              'PLANNED_SHIFT',
            minutes:
              190,
            validFrom:
              effectiveAt,
          },
        });

        expect(
          transaction.cinema.update,
        ).toHaveBeenCalledWith({
          where: {
            id: 7,
          },
          data: {
            automaticTimeRegistrationMethod:
              'PLANNED_SHIFT',
          },
        });
      },
    );

    it(
      'creates a new active period and version when automation is enabled',
      async () => {
        jest.useFakeTimers();

        const effectiveAt =
          new Date(
            '2026-08-18T06:50:00.000Z',
          );

        jest.setSystemTime(
          effectiveAt,
        );

        const {
          transaction,
          prisma,
        } =
          createHarness({
            automaticTimeRegistrationEnabled:
              false,
            automaticTimeRegistrationActiveFrom:
              null,
          });

        await updateCinemaSettings(
          prisma,
          7,
          {
            automaticTimeRegistrationEnabled:
              true,
          },
        );

        expect(
          transaction
            .cinemaAutomaticTimeRegistrationVersion
            .create,
        ).toHaveBeenCalledWith({
          data: {
            cinemaId: 7,
            method:
              'FIXED_MINUTES',
            minutes:
              190,
            validFrom:
              effectiveAt,
          },
        });

        expect(
          transaction.cinema.update,
        ).toHaveBeenCalledWith({
          where: {
            id: 7,
          },
          data: {
            automaticTimeRegistrationEnabled:
              true,
            automaticTimeRegistrationActiveFrom:
              effectiveAt,
          },
        });
      },
    );

    it(
      'closes the current version when automation is disabled',
      async () => {
        jest.useFakeTimers();

        const effectiveAt =
          new Date(
            '2026-08-18T06:55:00.000Z',
          );

        jest.setSystemTime(
          effectiveAt,
        );

        const {
          transaction,
          prisma,
        } =
          createHarness();

        await updateCinemaSettings(
          prisma,
          7,
          {
            automaticTimeRegistrationEnabled:
              false,
          },
        );

        expect(
          transaction
            .cinemaAutomaticTimeRegistrationVersion
            .updateMany,
        ).toHaveBeenCalledWith({
          where: {
            cinemaId: 7,
            validTo:
              null,
          },
          data: {
            validTo:
              effectiveAt,
          },
        });

        expect(
          transaction
            .cinemaAutomaticTimeRegistrationVersion
            .create,
        ).not.toHaveBeenCalled();

        expect(
          transaction.cinema.update,
        ).toHaveBeenCalledWith({
          where: {
            id: 7,
          },
          data: {
            automaticTimeRegistrationEnabled:
              false,
            automaticTimeRegistrationActiveFrom:
              null,
          },
        });
      },
    );

    it(
      'does not create versions when settings change while automation is disabled',
      async () => {
        const {
          transaction,
          prisma,
        } =
          createHarness({
            automaticTimeRegistrationEnabled:
              false,
            automaticTimeRegistrationActiveFrom:
              null,
          });

        await updateCinemaSettings(
          prisma,
          7,
          {
            automaticTimeRegistrationMethod:
              'PLANNED_SHIFT',
          },
        );

        expect(
          transaction
            .cinemaAutomaticTimeRegistrationVersion
            .updateMany,
        ).not.toHaveBeenCalled();

        expect(
          transaction
            .cinemaAutomaticTimeRegistrationVersion
            .create,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
