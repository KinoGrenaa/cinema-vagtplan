import {
  buildTemporaryMovieShowingSeedPlan,
  copenhagenLocalDateTimeToUtc,
} from './temporary-movie-showing-seed';

describe('temporary movie showing seed', () => {
  it('scoper både sletning og nye rækker til den valgte biograf', () => {
    const plan = buildTemporaryMovieShowingSeedPlan({
      cinemaId: 1,
      startDate: '2026-07-27',
      dayCount: 2,
    });

    expect(plan.deleteWhere).toEqual({
      cinemaId: 1,
      startTime: {
        lt: new Date('2026-07-28T22:00:00.000Z'),
      },
      endTime: {
        gt: new Date('2026-07-26T22:00:00.000Z'),
      },
    });
    expect(plan.createData.length).toBeGreaterThan(0);
    expect(
      plan.createData.every((showing) => showing.cinemaId === 1),
    ).toBe(true);
  });

  it('kan bygge et separat datasæt til en anden biograf uden sammenblanding', () => {
    const firstCinemaPlan = buildTemporaryMovieShowingSeedPlan({
      cinemaId: 1,
      startDate: '2026-07-27',
      dayCount: 1,
    });
    const secondCinemaPlan = buildTemporaryMovieShowingSeedPlan({
      cinemaId: 2,
      startDate: '2026-07-27',
      dayCount: 1,
    });

    expect(firstCinemaPlan.deleteWhere.cinemaId).toBe(1);
    expect(secondCinemaPlan.deleteWhere.cinemaId).toBe(2);
    expect(
      firstCinemaPlan.createData.every(
        (showing) => showing.cinemaId === 1,
      ),
    ).toBe(true);
    expect(
      secondCinemaPlan.createData.every(
        (showing) => showing.cinemaId === 2,
      ),
    ).toBe(true);
  });

  it('beregner danske lokale filmtider korrekt hen over sommertid', () => {
    expect(
      copenhagenLocalDateTimeToUtc(
        '2026-03-29',
        17 * 60,
      ).toISOString(),
    ).toBe('2026-03-29T15:00:00.000Z');
    expect(
      copenhagenLocalDateTimeToUtc(
        '2026-10-25',
        17 * 60,
      ).toISOString(),
    ).toBe('2026-10-25T16:00:00.000Z');
  });

  it.each([
    {
      cinemaId: 0,
      startDate: '2026-07-27',
      dayCount: 1,
    },
    {
      cinemaId: 1,
      startDate: '2026-02-30',
      dayCount: 1,
    },
    {
      cinemaId: 1,
      startDate: '2026-07-27',
      dayCount: 0,
    },
    {
      cinemaId: 1,
      startDate: '2026-07-27',
      dayCount: 367,
    },
  ])('afviser ugyldige seed-indstillinger: %j', (options) => {
    expect(() =>
      buildTemporaryMovieShowingSeedPlan(options),
    ).toThrow();
  });
});
