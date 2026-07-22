import { BadRequestException } from '@nestjs/common';
import {
  normalizeAuditEntityType,
  parseAuditEntityId,
  parseOptionalAuditCinemaId,
} from './audit-log-controller-input';

describe('audit log controller input', () => {
  it.each([
    ['7', 7],
    [8, 8],
  ])(
    'parser gyldigt entitets-ID %p',
    (value, expected) => {
      expect(
        parseAuditEntityId(value),
      ).toBe(expected);
    },
  );

  it.each([
    undefined,
    null,
    '',
    '0',
    '-1',
    '1.5',
    '1e2',
    '+7',
    ' 7',
    '7 ',
    '9007199254740992',
    'ukendt',
  ])(
    'afviser ugyldigt entitets-ID %p',
    (value) => {
      expect(() =>
        parseAuditEntityId(value),
      ).toThrow(BadRequestException);
    },
  );

  it('tillader helt udeladt biograf-ID', () => {
    expect(
      parseOptionalAuditCinemaId(
        undefined,
      ),
    ).toBeUndefined();
  });

  it.each([
    '',
    '0',
    '-1',
    '1.5',
    '1e2',
    '+2',
    ' 2',
    '2 ',
    '9007199254740992',
    'ukendt',
  ])(
    'afviser ugyldigt valgfrit biograf-ID %p',
    (value) => {
      expect(() =>
        parseOptionalAuditCinemaId(value),
      ).toThrow(BadRequestException);
    },
  );

  it.each([
    'User',
    'TimeEntry',
    'Payroll.Period',
    'shift-trade',
    'user_membership',
    'SystemError:Log',
  ])(
    'accepterer gyldig entitetstype %p',
    (value) => {
      expect(
        normalizeAuditEntityType(value),
      ).toBe(value);
    },
  );

  it.each([
    undefined,
    null,
    '',
    ' ',
    ' User',
    'User ',
    'User/Entry',
    'User Entry',
    '7User',
    'User\nEntry',
    'x'.repeat(101),
  ])(
    'afviser ugyldig entitetstype %p',
    (value) => {
      expect(() =>
        normalizeAuditEntityType(value),
      ).toThrow(BadRequestException);
    },
  );
});
