import {
  assertNoVersionOverlap,
  findVersionAt,
  parsePayrollValidFrom,
  planVersionInsertion,
  resolveVersionStatus,
} from './payroll-version-intervals';

describe('payroll version intervals', () => {
  const date = (value: string) => new Date(`${value}T00:00:00.000Z`);


  it('fortolker en ren dato som lokal dagsstart i Europe/Copenhagen', () => {
    expect(parsePayrollValidFrom('2026-08-03').toISOString()).toBe(
      '2026-08-02T22:00:00.000Z',
    );
    expect(parsePayrollValidFrom('2026-01-15').toISOString()).toBe(
      '2026-01-14T23:00:00.000Z',
    );
  });

  it('inserts a version between two existing versions', () => {
    const plan = planVersionInsertion(
      [
        { id: 1, validFrom: date('2026-01-01'), validTo: date('2026-06-01') },
        { id: 2, validFrom: date('2026-06-01'), validTo: null },
      ],
      date('2026-04-01'),
    );
    expect(plan).toEqual({
      previousVersionId: 1,
      previousValidTo: date('2026-04-01'),
      newValidTo: date('2026-06-01'),
      nextVersionId: 2,
    });
  });

  it('rejects duplicate starts and overlapping intervals', () => {
    expect(() =>
      planVersionInsertion(
        [{ id: 1, validFrom: date('2026-01-01'), validTo: null }],
        date('2026-01-01'),
      ),
    ).toThrow('samme “Gælder fra”');
    expect(() =>
      assertNoVersionOverlap([
        { id: 1, validFrom: date('2026-01-01'), validTo: date('2026-07-01') },
        { id: 2, validFrom: date('2026-06-01'), validTo: null },
      ]),
    ).toThrow('overlapper');
  });

  it('resolves scheduled, active and superseded versions', () => {
    const now = date('2026-06-15');
    expect(resolveVersionStatus(date('2026-07-01'), null, now)).toBe('SCHEDULED');
    expect(resolveVersionStatus(date('2026-06-01'), null, now)).toBe('ACTIVE');
    expect(resolveVersionStatus(date('2026-01-01'), date('2026-06-01'), now)).toBe(
      'SUPERSEDED',
    );
  });

  it('uses half-open validity intervals', () => {
    const versions = [
      { id: 1, validFrom: date('2026-01-01'), validTo: date('2026-06-01') },
      { id: 2, validFrom: date('2026-06-01'), validTo: null },
    ];
    expect(findVersionAt(versions, date('2026-05-31'))?.id).toBe(1);
    expect(findVersionAt(versions, date('2026-06-01'))?.id).toBe(2);
  });
});
