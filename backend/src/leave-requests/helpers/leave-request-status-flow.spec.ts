import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { updateLeaveRequestStatusFlow } from './leave-request-status-flow';

const futureStart = new Date(
  '2099-08-10T08:00:00.000Z',
);
const futureEnd = new Date(
  '2099-08-10T12:00:00.000Z',
);

function createExisting(overrides = {}) {
  return {
    id: 12,
    userId: 7,
    cinemaId: 2,
    startDate: futureStart,
    endDate: futureEnd,
    status: 'PENDING',
    ...overrides,
  };
}

function createActor() {
  return {
    sub: 7,
    role: 'EMPLOYEE' as const,
    cinemaId: 2,
  };
}

function createPrisma(params?: {
  existing?: any;
  updateCount?: number;
}) {
  const existing =
    params?.existing ?? createExisting();
  const updated = {
    ...existing,
    status: 'CANCELLED',
    user: {
      firstName: 'Anna',
      lastName: 'Andersen',
      email: 'anna@example.com',
    },
  };
  const tx = {
    $executeRaw: jest.fn(),
    leaveRequest: {
      findFirst: jest
        .fn()
        .mockResolvedValue(existing),
      updateMany: jest.fn().mockResolvedValue({
        count: params?.updateCount ?? 1,
      }),
      findUnique: jest
        .fn()
        .mockResolvedValue(updated),
    },
    shift: {
      findFirst: jest.fn(),
    },
  };

  return {
    prisma: {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 7 }),
        findUnique: jest.fn().mockResolvedValue({
          firstName: 'Anna',
          lastName: 'Andersen',
          email: 'anna@example.com',
        }),
        findMany: jest
          .fn()
          .mockResolvedValue([]),
      },
      $transaction: jest.fn(
        async (
          callback: (client: any) => unknown,
        ) => callback(tx),
      ),
    },
    tx,
    updated,
  };
}

function createDeps(prisma: any) {
  return {
    prisma,
    absenceImpactEngineService: {
      analyzeLeaveImpact: jest.fn(),
    },
    realtimeGateway: {
      notifyCinema: jest.fn(),
    },
    notificationsService: {
      create: jest.fn(),
    },
  };
}

describe('updateLeaveRequestStatusFlow', () => {
  it('lader ejeren annullere en afventende ansøgning', async () => {
    const { prisma, tx, updated } =
      createPrisma();

    await expect(
      updateLeaveRequestStatusFlow({
        ...createDeps(prisma),
        user: createActor(),
        id: 12,
        status: 'CANCELLED',
      }),
    ).resolves.toEqual({
      leaveRequest: updated,
      absenceImpact: null,
    });

    expect(
      tx.leaveRequest.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        id: 12,
        cinemaId: 2,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
        cancelledAt:
          expect.any(Date),
        cancelledByUserId: 7,
        cancellationNote: null,
      },
    });
  });

  it('forhindrer medarbejderen i at godkende', async () => {
    const { prisma } = createPrisma();

    await expect(
      updateLeaveRequestStatusFlow({
        ...createDeps(prisma),
        user: createActor(),
        id: 12,
        status: 'APPROVED',
      }),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('afviser gentagen godkendelse', async () => {
    const { prisma } = createPrisma({
      existing: createExisting({
        status: 'APPROVED',
      }),
    });

    await expect(
      updateLeaveRequestStatusFlow({
        ...createDeps(prisma),
        user: {
          sub: 3,
          role: 'ADMIN',
          cinemaId: 2,
        },
        id: 12,
        status: 'APPROVED',
      }),
    ).rejects.toThrow(
      'Kun afventende fraværsansøgninger',
    );
  });

  it('opdager samtidig statusændring', async () => {
    const { prisma } = createPrisma({
      updateCount: 0,
    });

    await expect(
      updateLeaveRequestStatusFlow({
        ...createDeps(prisma),
        user: createActor(),
        id: 12,
        status: 'CANCELLED',
      }),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
