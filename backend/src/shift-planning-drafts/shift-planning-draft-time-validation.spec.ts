import { validateDraftShiftMinutes } from './shift-planning-draft-time-validation';

describe('shift-planning-draft-time-validation', () => {
  it('godkender en almindelig vagt samme dag', () => {
    expect(validateDraftShiftMinutes(16 * 60, 21 * 60 + 35)).toEqual({
      normalizedEndMinute: 21 * 60 + 35,
      message: null,
    });
  });

  it('normaliserer en gyldig vagt over midnat', () => {
    expect(validateDraftShiftMinutes(22 * 60, 90)).toEqual({
      normalizedEndMinute: 24 * 60 + 90,
      message: null,
    });
  });

  it('afviser den dokumenterede flerdagesværdi', () => {
    const result = validateDraftShiftMinutes(665, 34415);

    expect(result.normalizedEndMinute).toBeNull();
    expect(result.message).toContain('24 timer eller mere');
  });

  it('afviser ikke-heltal', () => {
    expect(validateDraftShiftMinutes(960.5, 1200).message).toContain('ugyldigt');
  });
});
