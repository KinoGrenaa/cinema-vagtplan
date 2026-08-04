import {
  assertCanDeleteScheduledPayRuleVersion,
  resolveVersionForDeactivation,
} from './pay-rule-version-lifecycle';

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe('pay-rule-version lifecycle', () => {
  it('tillader sletning af en ubrugt fremtidig version', () => {
    expect(() =>
      assertCanDeleteScheduledPayRuleVersion({
        validFrom: date('2026-09-01'),
        calculationLineCount: 0,
        adjustmentCount: 0,
        now: date('2026-08-01'),
      }),
    ).not.toThrow();
  });

  it('afviser sletning af en version, der er trådt i kraft', () => {
    expect(() =>
      assertCanDeleteScheduledPayRuleVersion({
        validFrom: date('2026-08-01'),
        calculationLineCount: 0,
        adjustmentCount: 0,
        now: date('2026-08-02'),
      }),
    ).toThrow('Kun en planlagt regelversion');
  });

  it('afviser sletning af en version, der er brugt i lønberegning', () => {
    expect(() =>
      assertCanDeleteScheduledPayRuleVersion({
        validFrom: date('2026-09-01'),
        calculationLineCount: 1,
        adjustmentCount: 0,
        now: date('2026-08-01'),
      }),
    ).toThrow('allerede er anvendt');
  });

  it('finder den version, som skal afsluttes ved deaktivering', () => {
    const version = resolveVersionForDeactivation(
      [
        {
          id: 1,
          validFrom: date('2026-07-01'),
          validTo: null,
          isEnabled: true,
        },
      ],
      date('2026-08-15'),
    );
    expect(version.id).toBe(1);
  });

  it('afviser deaktivering før en senere planlagt version', () => {
    expect(() =>
      resolveVersionForDeactivation(
        [
          {
            id: 1,
            validFrom: date('2026-07-01'),
            validTo: date('2026-09-01'),
            isEnabled: true,
          },
          {
            id: 2,
            validFrom: date('2026-09-01'),
            validTo: null,
            isEnabled: true,
          },
        ],
        date('2026-08-15'),
      ),
    ).toThrow('senere planlagt version');
  });

  it('afviser deaktivering af en allerede deaktiveret regel', () => {
    expect(() =>
      resolveVersionForDeactivation(
        [
          {
            id: 1,
            validFrom: date('2026-07-01'),
            validTo: null,
            isEnabled: false,
          },
        ],
        date('2026-08-15'),
      ),
    ).toThrow('allerede deaktiveret');
  });
});
