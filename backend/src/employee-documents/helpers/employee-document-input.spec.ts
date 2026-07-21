import { BadRequestException } from '@nestjs/common';
import {
  normalizeEmployeeDocumentTitle,
  parseEmployeeDocumentId,
  parseEmployeeDocumentUserId,
  parseOptionalEmployeeDocumentCinemaId,
} from './employee-document-input';

describe('employee document input', () => {
  it('parses valid IDs', () => {
    expect(parseEmployeeDocumentId('12')).toBe(12);
    expect(parseEmployeeDocumentUserId(7)).toBe(7);
    expect(parseOptionalEmployeeDocumentCinemaId('4')).toBe(4);
    expect(
      parseOptionalEmployeeDocumentCinemaId(undefined),
    ).toBeUndefined();
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid document ID %p', (value) => {
    expect(() => parseEmployeeDocumentId(value)).toThrow(
      BadRequestException,
    );
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid user ID %p', (value) => {
    expect(() => parseEmployeeDocumentUserId(value)).toThrow(
      BadRequestException,
    );
  });

  it.each([
    null,
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid cinema ID %p', (value) => {
    expect(() =>
      parseOptionalEmployeeDocumentCinemaId(value),
    ).toThrow(BadRequestException);
  });

  it('normalizes a valid title', () => {
    expect(normalizeEmployeeDocumentTitle('  Kontrakt  ')).toBe(
      'Kontrakt',
    );
  });

  it.each([
    undefined,
    null,
    '',
    '   ',
    12,
    'Linje\nSkift',
    'Ugyldig\u0000titel',
    'x'.repeat(201),
  ])('rejects invalid title %p', (value) => {
    expect(() => normalizeEmployeeDocumentTitle(value)).toThrow(
      BadRequestException,
    );
  });
});
