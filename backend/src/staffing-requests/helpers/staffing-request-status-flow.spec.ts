import { BadRequestException } from '@nestjs/common';
import { StaffingRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { assertNoStaffingRequestAcceptConflicts } from './staffing-request-acceptance-conflicts';
import { createStaffingRequestAcceptedNotifications } from './staffing-request-accepted-notifications';
import { resolveStaffingRequestNotifications } from './staffing-request-notification-resolution';
import {
  ensureStaffingRequestActorAccess,
  ensureStaffingRequestUserQualified,
} from './staffing-request-create-lookups';
import { findStaffingRequestForUser } from './staffing-request-read-flow';
import {
  acceptStaffingRequest,
  cancelStaffingRequest,
  rejectStaffingRequest,
} from './staffing-request-status-flow';

jest.mock('./staffing-request-acceptance-conflicts');
jest.mock('./staffing-request-accepted-notifications');
jest.mock('./staffing-request-notification-resolution');
jest.mock('./staffing-request-create-lookups', () => ({
  ensureStaffingRequestActorAccess: jest.fn(),
  ensureStaffingRequestUserQualified: jest.fn(),
}));
jest.mock('./staffing-request-read-flow', () => ({
  findStaffingRequestForUser: jest.fn(),
}));

describe('staffing request status flow', () => {
  const user = {
    sub: 21,
    email: 'employee@example.com',
    role: 'EMPLOYEE' as const,
    cinemaId: 7,
  };
  const admin = {
    sub: 2,
    email: 'admin@example.com',
    role: 'ADMIN' as const,
    cinemaId: 7,
  };
  const request = {
    id: 31,
    cinemaId: 7,
    shiftId: 41,
    targetUserId: null,
    jobFunctionId: 51,
    status: StaffingRequestStatus.PENDING,
    requestStartTime: new Date('2026-07-22T14:00:00.000Z'),
    requestEndTime: new Date('2026-07-22T20:00:00.000Z'),
  };
  const updatedRequest = {
    ...request,
    status: StaffingRequestStatus.ACCEPTED,
  };
  const assignedShift = {
    id: 41,
    cinemaId: 7,
    userId: 21,
  };

  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));
  const realtimeGateway = {
    server: { to },
    notifyCinema: jest.fn(),
    notifyUser: jest.fn(),
  } as unknown as RealtimeGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    (findStaffingRequestForUser as jest.Mock).mockResolvedValue(request);
    (ensureStaffingRequestActorAccess as jest.Mock).mockResolvedValue(undefined);
    (ensureStaffingRequestUserQualified as jest.Mock).mockResolvedValue(
      undefined,
    );
    (assertNoStaffingRequestAcceptConflicts as jest.Mock).mockResolvedValue(
      undefined,
    );
    (createStaffingRequestAcceptedNotifications as jest.Mock).mockResolvedValue(
      undefined,
    );
    (resolveStaffingRequestNotifications as jest.Mock).mockResolvedValue([
      11,
      22,
    ]);
  });

  function createSuccessTx() {
    return {
      $executeRaw: jest.fn().mockResolvedValue(1),
      staffingRequest: {
        findFirst: jest.fn().mockResolvedValue(request),
        updateMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([
          { id: 32 },
          { id: 33 },
        ]),
        findUnique: jest.fn().mockResolvedValue(updatedRequest),
      },
      shift: {
        findFirst: jest.fn().mockResolvedValue({
          id: 41,
          userId: null,
          startTime: new Date('2026-07-22T14:00:00.000Z'),
          endTime: new Date('2026-07-22T20:00:00.000Z'),
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue(assignedShift),
      },
    };
  }

  it('accepts and assigns a request atomically', async () => {
    const tx = createSuccessTx();
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as PrismaService;

    await expect(
      acceptStaffingRequest({
        prisma,
        realtimeGateway,
        user,
        id: 31,
        selectedCinemaId: 7,
      }),
    ).resolves.toBe(updatedRequest);

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(
      ensureStaffingRequestUserQualified,
    ).toHaveBeenCalledWith({
      prisma: tx,
      cinemaId: 7,
      userId: 21,
      jobFunctionId: 51,
    });
    expect(tx.staffingRequest.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 31,
        cinemaId: 7,
        status: StaffingRequestStatus.PENDING,
      },
      data: {
        status: StaffingRequestStatus.ACCEPTED,
        acceptedAt: expect.any(Date),
      },
    });
    expect(tx.shift.updateMany).toHaveBeenCalledWith({
      where: {
        id: 41,
        cinemaId: 7,
        userId: null,
      },
      data: { userId: 21 },
    });
    expect(
      resolveStaffingRequestNotifications,
    ).toHaveBeenCalledWith(tx, 7, [31, 32, 33]);
    expect(createStaffingRequestAcceptedNotifications).toHaveBeenCalledWith(
      tx,
      7,
      31,
      'employee@example.com',
    );
    expect(realtimeGateway.notifyCinema).toHaveBeenCalledWith(
      7,
      'shiftsUpdated',
      assignedShift,
    );
    expect(realtimeGateway.notifyUser).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith('staffingRequestsUpdated', {
      cinemaId: 7,
    });
  });

  it('afviser en medarbejder, der ikke er kvalificeret, inde i den låste transaktion', async () => {
    (ensureStaffingRequestUserQualified as jest.Mock).mockRejectedValue(
      new Error('Medarbejderen er ikke kvalificeret til denne jobfunktion'),
    );
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      staffingRequest: {
        findFirst: jest.fn().mockResolvedValue(request),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as PrismaService;

    await expect(
      acceptStaffingRequest({
        prisma,
        realtimeGateway,
        user,
        id: 31,
        selectedCinemaId: 7,
      }),
    ).rejects.toThrow(
      'Medarbejderen er ikke kvalificeret til denne jobfunktion',
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(assertNoStaffingRequestAcceptConflicts).not.toHaveBeenCalled();
  });

  it('afviser en forespørgsel, hvis den koblede vagt er slettet', async () => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      staffingRequest: {
        findFirst: jest.fn().mockResolvedValue(request),
      },
      shift: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as PrismaService;

    await expect(
      acceptStaffingRequest({
        prisma,
        realtimeGateway,
        user,
        id: 31,
        selectedCinemaId: 7,
      }),
    ).rejects.toThrow(
      'Bemandingsforespørgslen er ikke længere aktuel, fordi vagten er slettet',
    );
  });

  it('afviser en forespørgsel, hvis vagten er blevet manuelt tildelt', async () => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      staffingRequest: {
        findFirst: jest.fn().mockResolvedValue(request),
        updateMany: jest.fn(),
      },
      shift: {
        findFirst: jest.fn().mockResolvedValue({
          id: 41,
          userId: 99,
          startTime: new Date('2026-07-22T14:00:00.000Z'),
          endTime: new Date('2026-07-22T20:00:00.000Z'),
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as PrismaService;

    await expect(
      acceptStaffingRequest({
        prisma,
        realtimeGateway,
        user,
        id: 31,
        selectedCinemaId: 7,
      }),
    ).rejects.toThrow(
      'Bemandingsforespørgslen er ikke længere aktuel, fordi vagten allerede er tildelt',
    );

    expect(tx.staffingRequest.updateMany).not.toHaveBeenCalled();
    expect(assertNoStaffingRequestAcceptConflicts).not.toHaveBeenCalled();
  });

  it('afviser en forespørgsel, der blev afsluttet mens accepten ventede på låsen', async () => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      staffingRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as PrismaService;

    await expect(
      acceptStaffingRequest({
        prisma,
        realtimeGateway,
        user,
        id: 31,
        selectedCinemaId: 7,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('uses a conditional transition when rejecting', async () => {
    (findStaffingRequestForUser as jest.Mock).mockResolvedValue({
      ...request,
      targetUserId: user.sub,
    });
    const tx = {
      staffingRequest: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as PrismaService;

    await expect(
      rejectStaffingRequest({
        prisma,
        realtimeGateway,
        user,
        id: 31,
        selectedCinemaId: 7,
      }),
    ).rejects.toThrow('ikke længere åben');
  });

  it('uses a conditional transition when cancelling', async () => {
    const tx = {
      staffingRequest: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as PrismaService;

    await expect(
      cancelStaffingRequest({
        prisma,
        realtimeGateway,
        user: admin,
        id: 31,
        selectedCinemaId: 7,
      }),
    ).rejects.toThrow('Kun åbne forespørgsler kan annulleres');
  });
});
