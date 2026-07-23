import { BadRequestException } from '@nestjs/common';

import {
  lockUserWrite,
  withUserDirectoryWriteLock,
  withUserWriteLock,
} from './user-write-lock';

function getRawSqlText(mock: jest.Mock, callIndex = 0) {
  const [strings] = mock.mock.calls[callIndex] as [
    TemplateStringsArray,
    ...unknown[],
  ];

  return Array.from(strings).join('?');
}

function expectIntegerAdvisoryLock(mock: jest.Mock) {
  const sql = getRawSqlText(mock);

  expect(sql).toContain('pg_advisory_xact_lock');
  expect(sql.match(/::integer/g)).toHaveLength(2);
}

describe('user write lock', () => {
  it('serializes a user write in a transaction', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (value: any) => unknown) => callback(transaction),
      ),
    };
    const action = jest.fn().mockResolvedValue('ok');

    await expect(
      withUserWriteLock(prisma as never, '7', action),
    ).resolves.toBe('ok');

    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expectIntegerAdvisoryLock(transaction.$executeRaw);
    expect(action).toHaveBeenCalledWith(transaction, 7);
  });

  it('serializes a directory write in a transaction', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (value: any) => unknown) => callback(transaction),
      ),
    };
    const action = jest.fn().mockResolvedValue('ok');

    await expect(
      withUserDirectoryWriteLock(prisma as never, action),
    ).resolves.toBe('ok');

    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expectIntegerAdvisoryLock(transaction.$executeRaw);
    expect(action).toHaveBeenCalledWith(transaction);
  });

  it('can take a per-user lock inside a directory transaction', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
    };

    await expect(
      lockUserWrite(transaction as never, '9'),
    ).resolves.toBe(9);

    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expectIntegerAdvisoryLock(transaction.$executeRaw);
  });

  it.each([
    undefined,
    null,
    '',
    '0',
    '-1',
    '1.5',
    '1e2',
    '9007199254740992',
  ])('rejects invalid user ID %p', async (value) => {
    await expect(
      withUserWriteLock(
        {
          $transaction: jest.fn(
            async (callback: (value: any) => unknown) =>
              callback({
                $executeRaw: jest.fn(),
              }),
          ),
        } as never,
        value,
        jest.fn(),
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
