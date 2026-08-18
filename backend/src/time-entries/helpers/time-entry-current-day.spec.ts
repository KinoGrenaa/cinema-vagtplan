import { BadRequestException } from '@nestjs/common';

import {
  ensureClockInShiftOnCopenhagenToday,
  ensureTimeEntryActionOnCopenhagenToday,
} from './time-entry-date-helpers';

describe('normal time registration on current Copenhagen day', () => {
  const summerNow =
    new Date(
      '2026-08-16T17:20:00.000Z',
    );

  it('tillader tidspunkt p\u00e5 samme Copenhagen-dato', () => {
    expect(() =>
      ensureTimeEntryActionOnCopenhagenToday(
        new Date(
          '2026-08-16T08:00:00.000Z',
        ),
        'Afvist',
        summerNow,
      ),
    ).not.toThrow();
  });

  it('fortolker Copenhagen-dato korrekt omkring UTC-midnat', () => {
    expect(() =>
      ensureTimeEntryActionOnCopenhagenToday(
        new Date(
          '2026-08-15T22:30:00.000Z',
        ),
        'Afvist',
        summerNow,
      ),
    ).not.toThrow();
  });

  it('afviser n\u00e6ste Copenhagen-dato', () => {
    expect(() =>
      ensureTimeEntryActionOnCopenhagenToday(
        new Date(
          '2026-08-16T22:30:00.000Z',
        ),
        'Kun dags dato',
        summerNow,
      ),
    ).toThrow(
      new BadRequestException(
        'Kun dags dato',
      ),
    );
  });

  it('afviser historisk Copenhagen-dato', () => {
    expect(() =>
      ensureTimeEntryActionOnCopenhagenToday(
        new Date(
          '2026-08-15T12:00:00.000Z',
        ),
        'Kun dags dato',
        summerNow,
      ),
    ).toThrow(
      new BadRequestException(
        'Kun dags dato',
      ),
    );
  });

  it('afviser Clock ind hvis ingen relevant vagt findes', () => {
    expect(() =>
      ensureClockInShiftOnCopenhagenToday(
        null,
        summerNow,
      ),
    ).toThrow(
      'Der blev ikke fundet en relevant vagt p\u00e5 dags dato',
    );
  });

  it('tillader Clock ind p\u00e5 dagens vagt', () => {
    expect(() =>
      ensureClockInShiftOnCopenhagenToday(
        {
          startTime:
            new Date(
              '2026-08-16T15:30:00.000Z',
            ),
        },
        summerNow,
      ),
    ).not.toThrow();
  });

  it('afviser historisk shiftId via vagtens startdato', () => {
    expect(() =>
      ensureClockInShiftOnCopenhagenToday(
        {
          startTime:
            new Date(
              '2026-08-15T15:30:00.000Z',
            ),
        },
        summerNow,
      ),
    ).toThrow(
      'Du kan kun registrere m\u00f8detid p\u00e5 vagter p\u00e5 dags dato',
    );
  });
});
