import { BadRequestException } from '@nestjs/common';
import {
  normalizeUserListSearch,
  parseUserListIncludeInactive,
  parseUserListPage,
  parseUserListSort,
} from './user-list-input';

describe('user list input', () => {
  it('bruger sikre standardværdier', () => {
    expect(parseUserListPage(undefined)).toBe(1);
    expect(normalizeUserListSearch(undefined)).toBe('');
    expect(
      parseUserListIncludeInactive(undefined),
    ).toBe(false);
    expect(parseUserListSort(undefined)).toBe('NAME');
  });

  it('normaliserer gyldige værdier', () => {
    expect(parseUserListPage('3')).toBe(3);
    expect(
      normalizeUserListSearch('  Anna Jensen  '),
    ).toBe('Anna Jensen');
    expect(
      parseUserListIncludeInactive('true'),
    ).toBe(true);
    expect(parseUserListSort('NEWEST')).toBe(
      'NEWEST',
    );
  });

  it.each([
    () => parseUserListPage('0'),
    () => parseUserListPage('1.5'),
    () => parseUserListIncludeInactive('ja'),
    () => parseUserListSort('RANDOM'),
    () => normalizeUserListSearch('x'.repeat(201)),
  ])('afviser ugyldige værdier', (parseValue) => {
    expect(parseValue).toThrow(
      BadRequestException,
    );
  });
});
