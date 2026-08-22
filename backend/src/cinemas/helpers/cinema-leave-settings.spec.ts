import {
  normalizeCinemaSettingsBody,
} from './cinema-controller-input';

describe('cinema leave request settings', () => {
  it.each([0, 1, 2, 30])(
    'accepterer %s kalenderdages minimumsvarsel',
    (days) => {
      expect(
        normalizeCinemaSettingsBody({
          leaveRequestMinimumNoticeDays:
            days,
        }),
      ).toEqual(
        expect.objectContaining({
          leaveRequestMinimumNoticeDays:
            days,
        }),
      );
    },
  );

  it.each([-1, 3651, 1.5, '2'])(
    'afviser ugyldigt minimumsvarsel %p',
    (value) => {
      expect(() =>
        normalizeCinemaSettingsBody({
          leaveRequestMinimumNoticeDays:
            value,
        }),
      ).toThrow(
        'Minimum varsel for fravær skal være mellem 0 og 3650 hele kalenderdage',
      );
    },
  );
});
