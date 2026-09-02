import { normalizeCinemaSettingsBody } from './cinema-controller-input';

describe('cinema time-entry minute precision input', () => {
  it.each([1, 5, 15])(
    'accepterer registreringspræcision %i minutter',
    (timeEntryMinuteStep) => {
      expect(
        normalizeCinemaSettingsBody({
          timeEntryMinuteStep,
        }),
      ).toMatchObject({
        timeEntryMinuteStep,
      });
    },
  );

  it.each([0, 2, 10, 30, '15'])(
    'afviser ugyldig registreringspræcision %p',
    (timeEntryMinuteStep) => {
      expect(() =>
        normalizeCinemaSettingsBody({
          timeEntryMinuteStep,
        }),
      ).toThrow(
        'Registreringspræcision skal være 1, 5 eller 15 minutter',
      );
    },
  );
});
