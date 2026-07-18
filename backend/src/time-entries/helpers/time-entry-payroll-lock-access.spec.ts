import { BadRequestException } from '@nestjs/common';
import { ensureTimeEntryEditable } from './time-entry-access';

describe('time entry payroll lock access', () => {
  it.each(['ADMIN', 'MASTER', 'EMPLOYEE'])(
    'tillader %s at ændre en ulåst registrering',
    (role) => {
      expect(() =>
        ensureTimeEntryEditable(
          {
            payrollLocked: false,
          },
          {
            role,
          },
        ),
      ).not.toThrow();
    },
  );

  it.each(['ADMIN', 'MASTER', 'EMPLOYEE'])(
    'kræver genåbning af en LOCKED periode for %s',
    (role) => {
      expect(() =>
        ensureTimeEntryEditable(
          {
            payrollLocked: true,
            payrollPeriod: {
              status: 'LOCKED',
            },
          },
          {
            role,
          },
        ),
      ).toThrow(
        new BadRequestException(
          'Lønperioden er låst. Genåbn lønperioden, før tidsregistreringen ændres.',
        ),
      );
    },
  );

  it.each(['ADMIN', 'MASTER'])(
    'bevarer efterreguleringsflowet for %s i en EXPORTED periode',
    (role) => {
      expect(() =>
        ensureTimeEntryEditable(
          {
            payrollLocked: true,
            payrollPeriod: {
              status: 'EXPORTED',
            },
          },
          {
            role,
          },
        ),
      ).not.toThrow();
    },
  );

  it('afviser medarbejderændring i en EXPORTED periode', () => {
    expect(() =>
      ensureTimeEntryEditable(
        {
          payrollLocked: true,
          payrollPeriod: {
            status: 'EXPORTED',
          },
        },
        {
          role: 'EMPLOYEE',
        },
      ),
    ).toThrow(
      new BadRequestException(
        'Denne tidsregistrering er låst, fordi den allerede indgår i en låst eller eksporteret lønperiode.',
      ),
    );
  });

  it('afviser sikkert, når en låst registrering mangler periodestatus', () => {
    expect(() =>
      ensureTimeEntryEditable(
        {
          payrollLocked: true,
        },
        {
          role: 'ADMIN',
        },
      ),
    ).toThrow(BadRequestException);
  });
});
