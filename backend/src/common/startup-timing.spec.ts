import {
  elapsedMilliseconds,
  formatStartupDuration,
} from './startup-timing';

describe('startup timing', () => {
  it('beregner positiv forløbet tid', () => {
    expect(elapsedMilliseconds(100, 375)).toBe(275);
  });

  it('returnerer aldrig negativ tid', () => {
    expect(elapsedMilliseconds(500, 100)).toBe(0);
  });

  it('formaterer millisekunder læsbart', () => {
    expect(formatStartupDuration(428)).toBe('428 ms');
  });

  it('formaterer sekunder med dansk decimaltegn', () => {
    expect(formatStartupDuration(12_340)).toBe('12,3 s');
  });

  it('afviser ugyldige varigheder', () => {
    expect(formatStartupDuration(Number.NaN)).toBe('ukendt tid');
  });
});
