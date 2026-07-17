import { ForbiddenException } from '@nestjs/common';
import {
  Role,
  StaffingRequestStatus,
  StaffingRequestType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateCinemaRequestRates,
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

  it('calculates request rates from the current cinema data only', () => {
    expect(
      calculateCinemaRequestRates([
        {
          status: StaffingRequestStatus.ACCEPTED,
          type: StaffingRequestType.EMERGENCY,
        },
        {
          status: StaffingRequestStatus.REJECTED,
          type: StaffingRequestType.EMERGENCY,
        },
        {
          status: StaffingRequestStatus.ACCEPTED,
          type: StaffingRequestType.EXTRA_SHIFT,
        },
        {
          status: StaffingRequestStatus.PENDING,
          type: StaffingRequestType.EMERGENCY,
        },
      ]),
    ).toEqual({
      totalRequests: 3,
      acceptedRequests: 2,
      rejectedRequests: 1,
      acceptanceRate: 2 / 3,
      rejectionRate: 1 / 3,
      emergencyAcceptanceRate: 1 / 2,
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
