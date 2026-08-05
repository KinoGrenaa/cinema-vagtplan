import {
  buildPostgresIntegerArraySql,
  getSourceMovieShowingIds,
} from './shift-planning-source-movie-showing-ids';

describe('shift-planning-source-movie-showing-ids', () => {
  it('læser, validerer og deduplikerer filmvisnings-id’er fra metadata', () => {
    expect(
      getSourceMovieShowingIds({
        sourceMovieShowingIds: [3, '7', 3, 0, -1, 'ikke-et-id'],
      }),
    ).toEqual([3, 7]);
  });

  it('bygger et typet PostgreSQL integer-array', () => {
    const sql = buildPostgresIntegerArraySql([3, 7]);

    expect(sql.sql).toContain('ARRAY[');
    expect(sql.sql).toContain('integer[]');
    expect(sql.values).toEqual([3, 7]);
  });

  it('bygger et typet tomt PostgreSQL integer-array', () => {
    const sql = buildPostgresIntegerArraySql([]);

    expect(sql.sql).toBe('ARRAY[]::integer[]');
    expect(sql.values).toEqual([]);
  });
});
