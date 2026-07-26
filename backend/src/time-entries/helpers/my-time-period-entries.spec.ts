import {
  buildMyTimePeriodWhere,
  getMyTimeCopenhagenDateStart,
  resolveMyTimePeriod,
} from './my-time-period-entries';

describe(
  'my-time payroll-period reads',
  () => {
    it('bruger vagtens starttid for linkede registreringer og clockIn for manuelle', () => {
      const start =
        new Date(
          '2026-06-30T22:00:00.000Z',
        );
      const endExclusive =
        new Date(
          '2026-07-31T22:00:00.000Z',
        );

      expect(
        buildMyTimePeriodWhere(
          9,
          7,
          start,
          endExclusive,
        ),
      ).toEqual({
        userId: 9,
        cinemaId: 7,
        OR: [
          {
            shiftId: {
              not: null,
            },
            shift: {
              startTime: {
                gte: start,
                lt: endExclusive,
              },
            },
          },
          {
            shiftId: null,
            clockIn: {
              gte: start,
              lt: endExclusive,
            },
          },
        ],
      });
    });

    it('bevarer 23-timers døgnet ved overgang til sommertid', () => {
      const start =
        getMyTimeCopenhagenDateStart(
          '2026-03-29',
        );
      const end =
        getMyTimeCopenhagenDateStart(
          '2026-03-29',
          1,
        );

      expect(
        end.getTime() -
          start.getTime(),
      ).toBe(
        23 *
          60 *
          60 *
          1000,
      );
    });

    it('bevarer 25-timers døgnet ved overgang til vintertid', () => {
      const start =
        getMyTimeCopenhagenDateStart(
          '2026-10-25',
        );
      const end =
        getMyTimeCopenhagenDateStart(
          '2026-10-25',
          1,
        );

      expect(
        end.getTime() -
          start.getTime(),
      ).toBe(
        25 *
          60 *
          60 *
          1000,
      );
    });

    it('afviser vilkårligt lange perioder', () => {
      expect(() =>
        resolveMyTimePeriod({
          startDate:
            '2026-01-01',
          endDate:
            '2026-12-31',
        }),
      ).toThrow(
        'Perioden må højst være 62 dage',
      );
    });
  },
);
