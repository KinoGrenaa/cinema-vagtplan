import { BadRequestException } from '@nestjs/common';
import { upsertMonthPlanDay } from './month-plan-update-flow';

const admin = {
  id: 2,
  role: 'ADMIN' as const,
  cinemaId: 7,
};

function createTransactionalPrisma(
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

describe('month plan update flow', () => {
  it('validates template and upserts inside the cinema lock', async () => {
    const result = {
      id: 10,
      cinemaId: 7,
    };
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      scheduleTemplate: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 4,
          }),
      },
      monthPlanDay: {
        findUnique: jest
          .fn()
          .mockResolvedValue(null),
        upsert: jest
          .fn()
          .mockResolvedValue(result),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      upsertMonthPlanDay(
        prisma as never,
        admin,
        '2026-07-21',
        {
          scheduleTemplateId: '4',
          note: ' Sommerplan ',
          movieProgramFirstStart:
            '2026-07-21T16:00:00Z',
          movieProgramLastEnd:
            '2026-07-21T22:00:00Z',
          movieShowingCount: '5',
        },
      ),
    ).resolves.toEqual(result);

    expect(
      transaction.scheduleTemplate.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 4,
        cinemaId: 7,
        isActive: true,
        archivedAt: null,
      },
      select: {
        id: true,
      },
    });
    expect(
      transaction.monthPlanDay.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          cinemaId_date: {
            cinemaId: 7,
            date: new Date(
              '2026-07-21T00:00:00.000Z',
            ),
          },
        },
        create: expect.objectContaining({
          cinemaId: 7,
          note: 'Sommerplan',
          scheduleTemplateId: 4,
          movieShowingCount: 5,
        }),
        update: expect.objectContaining({
          note: 'Sommerplan',
          scheduleTemplateId: 4,
          movieShowingCount: 5,
        }),
      }),
    );
  });

  it('rejects an inactive or cross-cinema template before upsert', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      scheduleTemplate: {
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
      },
      monthPlanDay: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      upsertMonthPlanDay(
        prisma as never,
        admin,
        '2026-07-21',
        {
          scheduleTemplateId: 4,
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      transaction.monthPlanDay.findUnique,
    ).not.toHaveBeenCalled();
    expect(
      transaction.monthPlanDay.upsert,
    ).not.toHaveBeenCalled();
  });

  it('validates the effective range for a partial update', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      scheduleTemplate: {
        findFirst: jest.fn(),
      },
      monthPlanDay: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            movieProgramFirstStart: new Date(
              '2026-07-21T18:00:00Z',
            ),
            movieProgramLastEnd: new Date(
              '2026-07-21T22:00:00Z',
            ),
          }),
        upsert: jest.fn(),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      upsertMonthPlanDay(
        prisma as never,
        admin,
        '2026-07-21',
        {
          movieProgramLastEnd:
            '2026-07-21T17:00:00Z',
        },
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Filmprogram slut skal være efter filmprogram start.',
      ),
    );

    expect(
      transaction.monthPlanDay.upsert,
    ).not.toHaveBeenCalled();
  });
});
