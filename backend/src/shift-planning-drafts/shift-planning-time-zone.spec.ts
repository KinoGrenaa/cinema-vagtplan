import {
  buildCopenhagenDateTimeFromMinute,
  getCopenhagenDateKey,
  getCopenhagenDayInstantRange,
  getCopenhagenMinuteOfDay,
  getCopenhagenMonthInstantRange,
} from './shift-planning-time-zone';

describe('shift planning Europe/Copenhagen time handling', () => {
  it('reads summer movie times as Danish local time', () => {
    const value = new Date('2026-07-27T15:00:00.000Z');

    expect(getCopenhagenDateKey(value)).toBe('2026-07-27');
    expect(getCopenhagenMinuteOfDay(value)).toBe(17 * 60);
  });

  it('reads winter movie times as Danish local time', () => {
    const value = new Date('2026-12-15T16:00:00.000Z');

    expect(getCopenhagenDateKey(value)).toBe('2026-12-15');
    expect(getCopenhagenMinuteOfDay(value)).toBe(17 * 60);
  });

  it('uses the Copenhagen date after UTC has not yet reached midnight', () => {
    const value = new Date('2026-07-26T22:30:00.000Z');

    expect(getCopenhagenDateKey(value)).toBe('2026-07-27');
    expect(getCopenhagenMinuteOfDay(value)).toBe(30);
  });

  it('builds summer shift times from local planned minutes', () => {
    const date = new Date('2026-07-27T00:00:00.000Z');

    expect(
      buildCopenhagenDateTimeFromMinute(date, 17 * 60).toISOString(),
    ).toBe('2026-07-27T15:00:00.000Z');
  });

  it('builds winter shift times from local planned minutes', () => {
    const date = new Date('2026-12-15T00:00:00.000Z');

    expect(
      buildCopenhagenDateTimeFromMinute(date, 17 * 60).toISOString(),
    ).toBe('2026-12-15T16:00:00.000Z');
  });

  it('builds after-midnight end times on the following local day', () => {
    const date = new Date('2026-07-27T00:00:00.000Z');

    expect(
      buildCopenhagenDateTimeFromMinute(date, 25 * 60 + 30).toISOString(),
    ).toBe('2026-07-27T23:30:00.000Z');
  });

  it('creates a 23-hour Copenhagen day when summer time begins', () => {
    const { start, end } = getCopenhagenDayInstantRange('2026-03-29');

    expect(end.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1000);
  });

  it('creates a 25-hour Copenhagen day when summer time ends', () => {
    const { start, end } = getCopenhagenDayInstantRange('2026-10-25');

    expect(end.getTime() - start.getTime()).toBe(25 * 60 * 60 * 1000);
  });

  it('uses Copenhagen month boundaries for movie queries', () => {
    const july = getCopenhagenMonthInstantRange(2026, 7);
    const december = getCopenhagenMonthInstantRange(2026, 12);

    expect(july.start.toISOString()).toBe('2026-06-30T22:00:00.000Z');
    expect(july.end.toISOString()).toBe('2026-07-31T22:00:00.000Z');
    expect(december.start.toISOString()).toBe('2026-11-30T23:00:00.000Z');
    expect(december.end.toISOString()).toBe('2026-12-31T23:00:00.000Z');
  });
});
