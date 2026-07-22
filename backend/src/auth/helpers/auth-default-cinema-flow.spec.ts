import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { updateAuthDefaultCinemaFlow } from './auth-default-cinema-flow';

function createPrisma(
  transaction: Record<string, unknown>,
) {
  return {
    $transaction: jest.fn(
      async (
        callback: (value: any) => unknown,
      ) => callback(transaction),
    ),
  };
}

describe('auth default cinema flow', () => {
  it('validates membership and updates inside the user lock', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 7,
            role: 'EMPLOYEE',
            cinemaId: 2,
            isActive: true,
          }),
        update: jest
          .fn()
          .mockResolvedValue({
            id: 7,
          }),
      },
      userCinemaMembership: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 11,
          }),
      },
      cinema: {
        findUnique: jest.fn(),
      },
    };

    await expect(
      updateAuthDefaultCinemaFlow(
        createPrisma(
          transaction,
        ) as never,
        7,
        3,
      ),
    ).resolves.toEqual({
      userId: 7,
      defaultCinemaId: 3,
    });

    expect(
      transaction.$executeRaw,
    ).toHaveBeenCalledTimes(1);
    expect(
      transaction.userCinemaMembership.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        userId: 7,
        cinemaId: 3,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
    expect(
      transaction.user.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 7,
      },
      data: {
        defaultCinemaId: 3,
      },
    });
  });

  it('rejects a removed membership before update', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 7,
            role: 'ADMIN',
            cinemaId: 2,
            isActive: true,
          }),
        update: jest.fn(),
      },
      userCinemaMembership: {
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
      },
      cinema: {
        findUnique: jest.fn(),
      },
    };

    await expect(
      updateAuthDefaultCinemaFlow(
        createPrisma(
          transaction,
        ) as never,
        7,
        3,
      ),
    ).rejects.toThrow(
      ForbiddenException,
    );

    expect(
      transaction.user.update,
    ).not.toHaveBeenCalled();
  });

  it('rejects null default for non-master users', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 7,
            role: 'EMPLOYEE',
            cinemaId: 2,
            isActive: true,
          }),
        update: jest.fn(),
      },
      userCinemaMembership: {
        findFirst: jest.fn(),
      },
      cinema: {
        findUnique: jest.fn(),
      },
    };

    await expect(
      updateAuthDefaultCinemaFlow(
        createPrisma(
          transaction,
        ) as never,
        7,
        null,
      ),
    ).rejects.toThrow(
      BadRequestException,
    );

    expect(
      transaction.userCinemaMembership.findFirst,
    ).not.toHaveBeenCalled();
    expect(
      transaction.user.update,
    ).not.toHaveBeenCalled();
  });

  it('allows master to clear the default cinema', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 1,
            role: 'MASTER',
            cinemaId: null,
            isActive: true,
          }),
        update: jest
          .fn()
          .mockResolvedValue({
            id: 1,
          }),
      },
      userCinemaMembership: {
        findFirst: jest.fn(),
      },
      cinema: {
        findUnique: jest.fn(),
      },
    };

    await expect(
      updateAuthDefaultCinemaFlow(
        createPrisma(
          transaction,
        ) as never,
        1,
        null,
      ),
    ).resolves.toEqual({
      userId: 1,
      defaultCinemaId: null,
    });

    expect(
      transaction.cinema.findUnique,
    ).not.toHaveBeenCalled();
  });

  it('rejects a deactivated user inside the lock', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 7,
            role: 'EMPLOYEE',
            cinemaId: 2,
            isActive: false,
          }),
        update: jest.fn(),
      },
      userCinemaMembership: {
        findFirst: jest.fn(),
      },
      cinema: {
        findUnique: jest.fn(),
      },
    };

    await expect(
      updateAuthDefaultCinemaFlow(
        createPrisma(
          transaction,
        ) as never,
        7,
        2,
      ),
    ).rejects.toThrow(
      UnauthorizedException,
    );

    expect(
      transaction.user.update,
    ).not.toHaveBeenCalled();
  });
});
