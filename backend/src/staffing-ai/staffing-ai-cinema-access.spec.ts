import {
  ForbiddenException,
} from '@nestjs/common';
import {
  CinemaRole,
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
import {
  ensureStaffingRequestActorAccess,
  ensureStaffingRequestTargetUserExists,
} from '../staffing-requests/helpers/staffing-request-create-lookups';
import { createNotificationForStaffingRequest } from '../staffing-requests/helpers/staffing-request-create-notifications';

describe('staffing AI cinema access', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    staffingRequest: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bygger et filter med medlemskabets rolle uden User.cinemaId', () => {
    expect(
      getActiveCinemaUserWhere({
        cinemaId: 8,
        role: CinemaRole.EMPLOYEE,
        userId: 22,
      }),
    ).toEqual({
      id: 22,
      isActive: true,
      cinemaMemberships: {
        some: {
          cinemaId: 8,
          isActive: true,
          role: CinemaRole.EMPLOYEE,
        },
      },
    });
  });

  it('beregner svarrater fra den aktuelle biografs data', () => {
    expect(
      calculateCinemaRequestRates([
        {
          status:
            StaffingRequestStatus.ACCEPTED,
          type:
            StaffingRequestType.EMERGENCY,
        },
        {
          status:
            StaffingRequestStatus.REJECTED,
          type:
            StaffingRequestType.EMERGENCY,
        },
        {
          status:
            StaffingRequestStatus.ACCEPTED,
          type:
            StaffingRequestType.EXTRA_SHIFT,
        },
        {
          status:
            StaffingRequestStatus.PENDING,
          type:
            StaffingRequestType.EMERGENCY,
        },
      ]),
    ).toEqual({
      totalRequests: 3,
      acceptedRequests: 2,
      rejectedRequests: 1,
      acceptanceRate: 2 / 3,
      rejectionRate: 1 / 3,
      emergencyAcceptanceRate:
        1 / 2,
    });
  });

  it('vælger en aktiv ADMIN fra biografmedlemskabet som AI-aktør', async () => {
    prisma.user.findFirst
      .mockResolvedValueOnce({
        id: 17,
      });

    await expect(
      findAiRequestActorForCinema(
        prisma as unknown as PrismaService,
        8,
      ),
    ).resolves.toEqual({
      id: 17,
    });

    expect(
      prisma.user.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          cinemaMemberships: {
            some: {
              cinemaId: 8,
              isActive: true,
              role: CinemaRole.ADMIN,
            },
          },
        },
      }),
    );
  });

  it('falder tilbage til en aktiv MASTER når ingen ADMIN findes', async () => {
    prisma.user.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 1,
      });

    await expect(
      findAiRequestActorForCinema(
        prisma as unknown as PrismaService,
        8,
      ),
    ).resolves.toEqual({
      id: 1,
    });

    expect(
      prisma.user.findFirst,
    ).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          role: 'MASTER',
          isActive: true,
        },
      }),
    );
  });

  it('tillader en ADMIN via medlemskabets rolle', async () => {
    prisma.user.findUnique
      .mockResolvedValue({
        id: 17,
        role: 'EMPLOYEE',
        isActive: true,
        cinemaMemberships: [
          {
            role: CinemaRole.ADMIN,
          },
        ],
      });

    await expect(
      ensureAiRequestActorAccess({
        prisma:
          prisma as unknown as PrismaService,
        requestedByUserId: 17,
        cinemaId: 8,
      }),
    ).resolves.toBeUndefined();
  });

  it('afviser en bruger uden ADMIN-medlemskab', async () => {
    prisma.user.findUnique
      .mockResolvedValue({
        id: 17,
        role: 'ADMIN',
        isActive: true,
        cinemaMemberships: [
          {
            role:
              CinemaRole.EMPLOYEE,
          },
        ],
      });

    await expect(
      ensureAiRequestActorAccess({
        prisma:
          prisma as unknown as PrismaService,
        requestedByUserId: 17,
        cinemaId: 8,
      }),
    ).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('validerer almindelige bemandingsaktører og mål gennem aktive medlemskaber', async () => {
    prisma.user.findFirst
      .mockResolvedValue({
        id: 17,
      });

    await ensureStaffingRequestActorAccess({
      prisma:
        prisma as unknown as PrismaService,
      user: {
        sub: 17,
        email:
          'admin@example.com',
        role: 'ADMIN',
        cinemaId: 8,
      },
      cinemaId: 8,
    });
    await ensureStaffingRequestTargetUserExists({
      prisma:
        prisma as unknown as PrismaService,
      cinemaId: 8,
      targetUserId: 22,
    });

    expect(
      prisma.user.findFirst,
    ).toHaveBeenNthCalledWith(
      1,
      {
        where: {
          id: 17,
          isActive: true,
          cinemaMemberships: {
            some: {
              cinemaId: 8,
              isActive: true,
            },
          },
        },
        select: {
          id: true,
        },
      },
    );
    expect(
      prisma.user.findFirst,
    ).toHaveBeenNthCalledWith(
      2,
      {
        where: {
          id: 22,
          isActive: true,
          cinemaMemberships: {
            some: {
              cinemaId: 8,
              isActive: true,
            },
          },
        },
        select: {
          id: true,
        },
      },
    );
  });

  it('sender brede bemandingsnotifikationer kun til aktive medlemskaber', async () => {
    prisma.staffingRequest.findUnique
      .mockResolvedValue({
        id: 31,
        cinemaId: 8,
        targetUserId: null,
        message: null,
        targetUser: null,
        requestedByUser: {
          id: 17,
        },
      });
    prisma.user.findMany
      .mockResolvedValue([
        {
          id: 22,
        },
      ]);
    prisma.notification.createMany
      .mockResolvedValue({
        count: 1,
      });

    await createNotificationForStaffingRequest(
      prisma as unknown as PrismaService,
      31,
    );

    expect(
      prisma.user.findMany,
    ).toHaveBeenCalledWith({
      where: {
        isActive: true,
        cinemaMemberships: {
          some: {
            cinemaId: 8,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
      },
    });
  });
});
