import { BadRequestException } from '@nestjs/common';
import { ShiftPlanningWishesService } from './shift-planning-wishes.service';

function createPrismaMock(options?: { qualified?: boolean }) {
  const qualified = options?.qualified ?? true;

  const tx = {
    shiftPlanningDraftItem: {
      findFirst: jest.fn().mockResolvedValue({
        id: 55,
        draftId: 7,
        cinemaId: 1,
        userId: null,
        jobFunctionId: 3,
        wishEnabled: true,
        date: new Date('2099-01-01T00:00:00.000Z'),
        plannedStartMinute: 10 * 60,
        draft: { status: 'DRAFT' },
      }),
    },
    shiftPlanningWishRound: {
      findUnique: jest.fn().mockResolvedValue({
        status: 'OPEN',
        closesAt: null,
      }),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: 9 }),
    },
    userCinemaMembership: {
      findFirst: jest.fn().mockResolvedValue({ id: 12 }),
    },
    userJobFunction: {
      findFirst: jest
        .fn()
        .mockResolvedValue(qualified ? { id: 20 } : null),
    },
    shiftPlanningDraftWish: {
      upsert: jest.fn().mockResolvedValue({
        id: 100,
        cinemaId: 1,
        draftItemId: 55,
        userId: 9,
        withdrawnAt: null,
      }),
    },
  };

  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  return { prisma, tx };
}

describe('ShiftPlanningWishesService', () => {
  it('opretter et ønske for en aktiv og kvalificeret medarbejder', async () => {
    const { prisma, tx } = createPrismaMock();
    const service = new ShiftPlanningWishesService(prisma as never);

    const result = await service.createWish(
      { sub: 9, role: 'EMPLOYEE', cinemaId: 1 },
      55,
    );

    expect(result).toMatchObject({
      draftItemId: 55,
      userId: 9,
      wished: true,
    });
    expect(tx.userJobFunction.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 9,
        cinemaId: 1,
        jobFunctionId: 3,
      },
      select: { id: true },
    });
    expect(tx.shiftPlanningDraftWish.upsert).toHaveBeenCalled();
  });

  it('afviser ønsket i backend når medarbejderen ikke er kvalificeret', async () => {
    const { prisma, tx } = createPrismaMock({ qualified: false });
    const service = new ShiftPlanningWishesService(prisma as never);

    await expect(
      service.createWish(
        { sub: 9, role: 'EMPLOYEE', cinemaId: 1 },
        55,
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Du er ikke kvalificeret til denne jobfunktion.',
      ),
    );

    expect(tx.shiftPlanningDraftWish.upsert).not.toHaveBeenCalled();
  });

  it('afviser ønsker på en vagt der ikke er åbnet for ønsker', async () => {
    const { prisma, tx } = createPrismaMock();
    tx.shiftPlanningDraftItem.findFirst.mockResolvedValue({
      id: 55,
      draftId: 7,
      cinemaId: 1,
      userId: null,
      jobFunctionId: 3,
      wishEnabled: false,
      date: new Date('2099-01-01T00:00:00.000Z'),
      plannedStartMinute: 10 * 60,
      draft: { status: 'DRAFT' },
    });
    const service = new ShiftPlanningWishesService(prisma as never);

    await expect(
      service.createWish(
        { sub: 9, role: 'EMPLOYEE', cinemaId: 1 },
        55,
      ),
    ).rejects.toThrow(
      new BadRequestException('Vagten er ikke åben for ønsker.'),
    );

    expect(tx.shiftPlanningDraftWish.upsert).not.toHaveBeenCalled();
  });

  it('afviser ønsker når ønskerunden er lukket', async () => {
    const { prisma, tx } = createPrismaMock();
    tx.shiftPlanningWishRound.findUnique.mockResolvedValue({
      status: 'CLOSED',
      closesAt: null,
    });
    const service = new ShiftPlanningWishesService(prisma as never);

    await expect(
      service.createWish(
        { sub: 9, role: 'EMPLOYEE', cinemaId: 1 },
        55,
      ),
    ).rejects.toThrow(new BadRequestException('Ønskerunden er ikke åben.'));

    expect(tx.shiftPlanningDraftWish.upsert).not.toHaveBeenCalled();
  });

  it('afviser ønsker på en vagt der allerede er startet', async () => {
    const { prisma, tx } = createPrismaMock();

    tx.shiftPlanningDraftItem.findFirst.mockResolvedValue({
      id: 55,
      draftId: 7,
      cinemaId: 1,
      userId: null,
      jobFunctionId: 3,
      wishEnabled: true,
      date: new Date('2000-01-01T00:00:00.000Z'),
      plannedStartMinute: 10 * 60,
      draft: { status: 'DRAFT' },
    });

    const service = new ShiftPlanningWishesService(prisma as never);

    await expect(
      service.createWish(
        { sub: 9, role: 'EMPLOYEE', cinemaId: 1 },
        55,
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Vagten er allerede startet eller ligger i fortiden.',
      ),
    );

    expect(tx.shiftPlanningDraftWish.upsert).not.toHaveBeenCalled();
  });
});
