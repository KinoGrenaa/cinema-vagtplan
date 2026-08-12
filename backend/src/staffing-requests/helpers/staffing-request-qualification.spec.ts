import { ForbiddenException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ensureStaffingRequestUserQualified } from './staffing-request-create-lookups';

describe('staffing request qualification', () => {
  it('godkender en medarbejder med den konkrete jobfunktion', async () => {
    const prisma = {
      userJobFunction: {
        findFirst: jest.fn().mockResolvedValue({
          id: 81,
        }),
      },
    } as unknown as PrismaService;

    await expect(
      ensureStaffingRequestUserQualified({
        prisma,
        cinemaId: 7,
        userId: 21,
        jobFunctionId: 51,
      }),
    ).resolves.toBeUndefined();

    expect(
      prisma.userJobFunction.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        userId: 21,
        jobFunctionId: 51,
      },
      select: {
        id: true,
      },
    });
  });

  it('afviser en medarbejder uden den konkrete jobfunktion', async () => {
    const prisma = {
      userJobFunction: {
        findFirst: jest.fn().mockResolvedValue(
          null,
        ),
      },
    } as unknown as PrismaService;

    await expect(
      ensureStaffingRequestUserQualified({
        prisma,
        cinemaId: 7,
        userId: 22,
        jobFunctionId: 51,
      }),
    ).rejects.toThrow(
      ForbiddenException,
    );
  });
});
