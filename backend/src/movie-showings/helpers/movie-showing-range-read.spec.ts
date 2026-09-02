import {
  findMovieShowingsForRange,
  getMovieShowingRange,
} from './movie-showing-range-read';

describe('movie showing range read', () => {
  it('henter en inklusiv 10-dages periode', async () => {
    const prisma = {
      movieShowing: {
        findMany: jest
          .fn()
          .mockResolvedValue([]),
      },
    };
    const range =
      getMovieShowingRange(
        '2026-08-31',
        '2026-09-09',
      );

    expect(range.days).toBe(10);

    await findMovieShowingsForRange(
      prisma as never,
      7,
      '2026-08-31',
      '2026-09-09',
    );

    expect(
      prisma.movieShowing.findMany,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        startTime: {
          gte: range.start,
          lt: range.endExclusive,
        },
      },
      orderBy: [
        {
          startTime: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
  });

  it('bevarer lokale døgn over vintertidsskift', () => {
    const range =
      getMovieShowingRange(
        '2026-10-20',
        '2026-10-29',
      );

    expect(range.days).toBe(10);
    expect(
      range.endExclusive.getTime() -
        range.start.getTime(),
    ).toBe(
      241 * 60 * 60 * 1000,
    );
  });

  it('afviser omvendte og for lange perioder', () => {
    expect(() =>
      getMovieShowingRange(
        '2026-09-10',
        '2026-09-09',
      ),
    ).toThrow();

    expect(() =>
      getMovieShowingRange(
        '2026-08-01',
        '2026-08-31',
      ),
    ).toThrow();
  });
});
