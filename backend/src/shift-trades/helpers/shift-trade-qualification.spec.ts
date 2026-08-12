import { ForbiddenException } from '@nestjs/common';

import { ensureShiftTradeUserQualified } from './shift-trade-qualification';

describe('shift trade qualification', () => {
  it('tillader kun medarbejdere, der er kvalificerede til jobfunktionen', async () => {
    const prisma = {
      userJobFunction: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 1 })
          .mockResolvedValueOnce(null),
      },
    };

    await expect(
      ensureShiftTradeUserQualified(
        prisma as never,
        {
          cinemaId: 7,
          userId: 9,
          jobFunctionId: 21,
        },
      ),
    ).resolves.toBeUndefined();

    await expect(
      ensureShiftTradeUserQualified(
        prisma as never,
        {
          cinemaId: 7,
          userId: 10,
          jobFunctionId: 21,
        },
      ),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
