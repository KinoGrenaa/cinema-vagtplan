import { BadRequestException } from '@nestjs/common';
import {
  ensurePayrollPeriodCanBeUnlocked,
  ensurePayrollTimeEntryCanBeUnlocked,
  getRequiredPayrollUnlockNote,
} from './payroll-period-unlock-validation';

describe('payroll unlock validation', () => {
  it.each([undefined, '', '   '])(
    'kræver intern note ved genåbning',
    (note) => {
      expect(() => getRequiredPayrollUnlockNote(note)).toThrow(
        new BadRequestException(
          'Intern note er påkrævet ved genåbning.',
        ),
      );
    },
  );

  it('trimmer og returnerer den interne note', () => {
    expect(
      getRequiredPayrollUnlockNote('  Rettelse efter kontrol  '),
    ).toBe('Rettelse efter kontrol');
  });

  it('tillader genåbning af en låst lønperiode', () => {
    expect(() =>
      ensurePayrollPeriodCanBeUnlocked('LOCKED'),
    ).not.toThrow();
  });

  it('afviser genåbning af en eksporteret lønperiode', () => {
    expect(() =>
      ensurePayrollPeriodCanBeUnlocked('EXPORTED'),
    ).toThrow(
      new BadRequestException(
        'En eksporteret lønperiode kan ikke genåbnes. Rettelser håndteres som efterregulering.',
      ),
    );
  });

  it.each(['OPEN', 'UNLOCKED'])(
    'afviser genåbning af status %s',
    (status) => {
      expect(() =>
        ensurePayrollPeriodCanBeUnlocked(status),
      ).toThrow(
        new BadRequestException(
          'Kun en låst lønperiode kan genåbnes.',
        ),
      );
    },
  );

  it('tillader genåbning af en låst tidsregistrering', () => {
    expect(() =>
      ensurePayrollTimeEntryCanBeUnlocked(true),
    ).not.toThrow();
  });

  it('afviser genåbning af en tidsregistrering, der ikke er låst', () => {
    expect(() =>
      ensurePayrollTimeEntryCanBeUnlocked(false),
    ).toThrow(
      new BadRequestException(
        'Tidsregistreringen er ikke låst og kan derfor ikke genåbnes.',
      ),
    );
  });
});
