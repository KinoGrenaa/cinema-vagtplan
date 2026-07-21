import { createShiftFlow } from './shift-create-flow';

describe('createShiftFlow', () => {
  it('låser medarbejderen før konfliktkontrol og oprettelse', async () => {
    const shift = {
      id: 12,
      startTime: new Date(
        '2026-08-10T08:00:00.000Z',
      ),
      endTime: new Date(
        '2026-08-10T12:00:00.000Z',
      ),
      note: 'Kasse',
      cinemaId: 2,
      userId: 7,
      workTypeId: 3,
      workType: {
        name: 'Kasse',
      },
      user: {
        firstName: 'Anna',
        lastName: 'Andersen',
      },
    };
    const tx = {
      $queryRaw: jest.fn(),
      workType: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 3 }),
      },
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 7 }),
      },
      cinema: {
        findUnique: jest.fn(),
      },
      shift: {
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
        create: jest
          .fn()
          .mockResolvedValue(shift),
      },
      leaveRequest: {
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (
          callback: (client: any) => unknown,
        ) => callback(tx),
      ),
    };
    const realtimeGateway = {
      notifyCinema: jest.fn(),
    };
    const pushService = {
      sendToUserInCinema: jest
        .fn()
        .mockResolvedValue({ sent: 1 }),
    };
    const auditLogsService = {
      create: jest
        .fn()
        .mockResolvedValue({ id: 1 }),
    };

    await expect(
      createShiftFlow({
        prisma: prisma as never,
        realtimeGateway:
          realtimeGateway as never,
        pushService: pushService as never,
        auditLogsService:
          auditLogsService as never,
        formatShiftTime: () =>
          '10.08.2026 kl. 10.00-14.00',
        user: {
          sub: 4,
          email: 'admin@example.com',
          role: 'ADMIN',
          cinemaId: 2,
        },
        data: {
          startTime:
            '2026-08-10T08:00:00.000Z',
          endTime:
            '2026-08-10T12:00:00.000Z',
          note: '  Kasse  ',
          cinemaId: 2,
          userId: 7,
          workTypeId: 3,
        },
      }),
    ).resolves.toBe(shift);

    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(
      tx.shift.findFirst,
    ).toHaveBeenCalled();
    expect(tx.shift.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          note: 'Kasse',
          userId: 7,
          cinemaId: 2,
        }),
      }),
    );
    expect(
      pushService.sendToUserInCinema,
    ).toHaveBeenCalledWith(
      7,
      2,
      expect.any(Object),
    );
  });
});
