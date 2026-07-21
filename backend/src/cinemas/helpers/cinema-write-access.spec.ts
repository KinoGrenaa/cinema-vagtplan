import { BadRequestException } from '@nestjs/common';
import {
  ensureCinemaNameAvailable,
  normalizeCinemaLogoUrl,
  normalizeCinemaName,
  withCinemaWriteLock,
} from './cinema-write-access';

describe('cinema write access', () => {
  it('normalizes a valid cinema name', () => {
    expect(
      normalizeCinemaName(' Kino Nord '),
    ).toBe('Kino Nord');
  });

  it.each([
    undefined,
    null,
    '',
    ' ',
    12,
    'Kino\nNord',
    'x'.repeat(201),
  ])('rejects invalid cinema name %p', (value) => {
    expect(() =>
      normalizeCinemaName(value),
    ).toThrow(BadRequestException);
  });

  it.each([
    '/uploads/cinema-logos/123-456.jpg',
    '/uploads/cinema-logos/logo_1.png',
    '/uploads/cinema-logos/kino.webp',
  ])('accepts managed logo URL %p', (value) => {
    expect(
      normalizeCinemaLogoUrl(value),
    ).toBe(value);
  });

  it('allows clearing a logo', () => {
    expect(
      normalizeCinemaLogoUrl(null),
    ).toBeNull();
  });

  it.each([
    '',
    'https://example.com/logo.png',
    '/uploads/profile-images/logo.png',
    '/uploads/cinema-logos/../logo.png',
    '/uploads/cinema-logos/logo.svg',
  ])('rejects invalid logo URL %p', (value) => {
    expect(() =>
      normalizeCinemaLogoUrl(value),
    ).toThrow(BadRequestException);
  });

  it('rejects a duplicate cinema name', async () => {
    const prisma = {
      cinema: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 4,
          }),
      },
    };

    await expect(
      ensureCinemaNameAvailable(
        prisma as never,
        'Kino Nord',
      ),
    ).rejects.toThrow(
      BadRequestException,
    );
  });

  it('serializes writes with an advisory lock', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
    };
    const prisma = {
      $transaction: jest.fn(
        async (
          callback: (value: any) => unknown,
        ) => callback(transaction),
      ),
    };
    const action = jest
      .fn()
      .mockResolvedValue('ok');

    await expect(
      withCinemaWriteLock(
        prisma as never,
        action,
      ),
    ).resolves.toBe('ok');

    expect(
      transaction.$executeRaw,
    ).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith(
      transaction,
    );
  });
});
