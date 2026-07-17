import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  ensureAiRequestActorAccess,
  findAiRequestActorForCinema,
  getActiveCinemaUserWhere,
} from './staffing-ai-cinema-access';

describe('staffing AI cinema access', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a filter that accepts home and active membership cinemas', () => {
    expect(
      getActiveCinemaUserWhere({
        cinemaId: 8,
        role: Role.EMPLOYEE,
        userId: 22,
      }),
    ).toEqual({
      id: 22,
      role: Role.EMPLOYEE,
      isActive: true,
      OR: [
        { cinemaId: 8 },
        {
          cinemaMemberships: {
            some: {
              cinemaId: 8,
              isActive: true,
            },
          },
        },
      ],
    });
  });

  it('selects an active secondary ADMIN as AI request actor', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: 17 });

    await expect(
      findAiRequestActorForCinema(
        prisma as unknown as PrismaService,
        8,
      ),
    ).resolves.toEqual({ id: 17 });

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: Role.ADMIN,
          isActive: true,
          OR: expect.any(Array),
        }),
      }),
    );
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(1);
  });

  it('falls back to an active MASTER when no ADMIN is available', async () => {
    prisma.user.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1 });

    await expect(
      findAiRequestActorForCinema(
        prisma as unknown as PrismaService,
        8,
      ),
    ).resolves.toEqual({ id: 1 });

    expect(prisma.user.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          role: Role.MASTER,
          isActive: true,
        },
      }),
    );
  });

  it('allows an ADMIN with an active secondary membership', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 17,
      role: Role.ADMIN,
      cinemaId: 2,
      isActive: true,
      cinemaMemberships: [{ id: 91 }],
    });

    await expect(
      ensureAiRequestActorAccess({
        prisma: prisma as unknown as PrismaService,
        requestedByUserId: 17,
        cinemaId: 8,
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects an ADMIN without access to the cinema', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 17,
      role: Role.ADMIN,
      cinemaId: 2,
      isActive: true,
      cinemaMemberships: [],
    });

    await expect(
      ensureAiRequestActorAccess({
        prisma: prisma as unknown as PrismaService,
        requestedByUserId: 17,
        cinemaId: 8,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
