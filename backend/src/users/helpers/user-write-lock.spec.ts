import { BadRequestException } from '@nestjs/common';
import { withUserWriteLock } from './user-write-lock';

describe('user write lock', () => {
  it('serializes a user write in a transaction', async () => {
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
      withUserWriteLock(
        prisma as never,
        '7',
        action,
      ),
    ).resolves.toBe('ok');

    expect(
      transaction.$executeRaw,
    ).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith(
      transaction,
      7,
    );
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
          $transaction: jest.fn(),
        } as never,
        value,
        jest.fn(),
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
