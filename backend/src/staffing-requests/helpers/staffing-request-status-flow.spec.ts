import { BadRequestException } from '@nestjs/common';
import { StaffingRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { assertNoStaffingRequestAcceptConflicts } from './staffing-request-acceptance-conflicts';
import { createStaffingRequestAcceptedNotifications } from './staffing-request-accepted-notifications';
import { ensureStaffingRequestActorAccess } from './staffing-request-create-lookups';
import { findStaffingRequestForUser } from './staffing-request-read-flow';
import {
  acceptStaffingRequest,
  cancelStaffingRequest,
  rejectStaffingRequest,
} from './staffing-request-status-flow';

jest.mock('./staffing-request-acceptance-conflicts');
jest.mock('./staffing-request-accepted-notifications');
jest.mock('./staffing-request-create-lookups', () => ({
  ensureStaffingRequestActorAccess: jest.fn(),
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
  } as unknown as RealtimeGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    (findStaffingRequestForUser as jest.Mock).mockResolvedValue(request);
    (ensureStaffingRequestActorAccess as jest.Mock).mockResolvedValue(undefined);
    (assertNoStaffingRequestAcceptConflicts as jest.Mock).mockResolvedValue(
      undefined,
    );
    (createStaffingRequestAcceptedNotifications as jest.Mock).mockResolvedValue(
      undefined,
    );
  });

  it('accepts and assigns a request atomically', async () => {
    const tx = {
      staffingRequest: {
        updateMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 2 }),
        findUnique: jest.fn().mockResolvedValue(updatedRequest),
      },
      shift: {
        findFirst: jest.fn().mockResolvedValue({ id: 41, userId: null }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue(assignedShift),
      },
      user: { findMany: jest.fn() },
      notification: { createMany: jest.fn() },
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
    ).resolves.toBe(updatedRequest);

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
    expect(emit).toHaveBeenCalledWith('staffingRequestsUpdated', {
      cinemaId: 7,
    });
  });

  it('rejects a concurrent acceptance before assigning the shift', async () => {
    const tx = {
      staffingRequest: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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

    expect(createStaffingRequestAcceptedNotifications).not.toHaveBeenCalled();
    expect(realtimeGateway.notifyCinema).not.toHaveBeenCalled();
  });

  it('rejects when another request wins the shift assignment race', async () => {
    const tx = {
      staffingRequest: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      shift: {
        findFirst: jest.fn().mockResolvedValue({ id: 41, userId: null }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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
    ).rejects.toThrow('Vagten er allerede blevet taget');
  });

  it('uses a conditional transition when rejecting', async () => {
    (findStaffingRequestForUser as jest.Mock).mockResolvedValue({
      ...request,
      targetUserId: user.sub,
    });
    const prisma = {
      staffingRequest: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn(),
      },
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
    const prisma = {
      staffingRequest: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn(),
      },
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
