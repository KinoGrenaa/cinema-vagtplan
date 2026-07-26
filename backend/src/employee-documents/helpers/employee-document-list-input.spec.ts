import { BadRequestException } from '@nestjs/common';
import {
  normalizeEmployeeDocumentSearch,
  parseEmployeeDocumentListPage,
  parseEmployeeDocumentListSort,
  parseEmployeeDocumentListType,
} from './employee-document-list-input';

describe('employee document list input', () => {
  it('bruger sikre standardværdier', () => {
    expect(parseEmployeeDocumentListPage(undefined)).toBe(1);
    expect(normalizeEmployeeDocumentSearch(undefined)).toBe('');
    expect(parseEmployeeDocumentListType(undefined)).toBe('ALL');
    expect(parseEmployeeDocumentListSort(undefined)).toBe('NEWEST');
  });

  it('normaliserer gyldige værdier', () => {
    expect(parseEmployeeDocumentListPage('3')).toBe(3);
    expect(normalizeEmployeeDocumentSearch('  kontrakt  ')).toBe(
      'kontrakt',
    );
    expect(parseEmployeeDocumentListType('PDF')).toBe('PDF');
    expect(parseEmployeeDocumentListSort('TITLE')).toBe('TITLE');
  });

  it.each([
    () => parseEmployeeDocumentListPage('0'),
    () => parseEmployeeDocumentListPage('1.5'),
    () => parseEmployeeDocumentListType('UNKNOWN'),
    () => parseEmployeeDocumentListSort('RANDOM'),
    () => normalizeEmployeeDocumentSearch('x'.repeat(201)),
  ])('afviser ugyldige værdier', (parseValue) => {
    expect(parseValue).toThrow(BadRequestException);
  });
});
