import { BadRequestException } from '@nestjs/common';
import { ShiftPlanningWishesService } from './shift-planning-wishes.service';

function createPrismaMock(options?: {
  qualified?: boolean;
  roundStatus?: 'OPEN' | 'CLOSED';
  activeWish?: boolean;
  activeUser?: boolean;
  activeMembership?: boolean;
}) {
  const qualified = options?.qualified ?? true;
  const roundStatus = options?.roundStatus ?? 'OPEN';
  const activeWish = options?.activeWish ?? true;
  const activeUser = options?.activeUser ?? true;
  const activeMembership = options?.activeMembership ?? true;

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
      update: jest.fn().mockResolvedValue({
        id: 55,
        userId: 9,
        wishEnabled: false,
      }),
    },
    shiftPlanningWishRound: {
      findUnique: jest.fn().mockResolvedValue({
        status: roundStatus,
        closesAt: null,
      }),
    },
    user: {
      findFirst: jest
        .fn()
        .mockResolvedValue(activeUser ? { id: 9 } : null),
    },
    userCinemaMembership: {
      findFirst: jest
        .fn()
        .mockResolvedValue(activeMembership ? { id: 12 } : null),
    },
    userJobFunction: {
      findFirst: jest
        .fn()
        .mockResolvedValue(qualified ? { id: 20 } : null),
    },
    shiftPlanningDraftWish: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          activeWish
            ? {
                id: 100,
                cinemaId: 1,
                draftItemId: 55,
                userId: 9,
                withdrawnAt: null,
              }
            : null,
        ),
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

  it('fordeler en lukket ønsket vagt til en aktiv og kvalificeret ønsker', async () => {
    const { prisma, tx } = createPrismaMock({ roundStatus: 'CLOSED' });
    const service = new ShiftPlanningWishesService(prisma as never);

    const result = await service.assignWish(
      { sub: 2, role: 'ADMIN', cinemaId: 1 },
      7,
      55,
      undefined,
      { userId: 9 },
    );

    expect(result).toEqual({
      draftId: 7,
      draftItemId: 55,
      userId: 9,
      assigned: true,
    });

    expect(tx.shiftPlanningDraftWish.findFirst).toHaveBeenCalledWith({
      where: {
        cinemaId: 1,
        draftItemId: 55,
        userId: 9,
        withdrawnAt: null,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    expect(tx.userJobFunction.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 9,
        cinemaId: 1,
        jobFunctionId: 3,
      },
      select: { id: true },
    });

    expect(tx.shiftPlanningDraftItem.update).toHaveBeenCalledWith({
      where: { id: 55 },
      data: {
        userId: 9,
        wishEnabled: false,
      },
    });
  });

  it('afviser Fordel mens ønskerunden stadig er åben', async () => {
    const { prisma, tx } = createPrismaMock({ roundStatus: 'OPEN' });
    const service = new ShiftPlanningWishesService(prisma as never);

    await expect(
      service.assignWish(
        { sub: 2, role: 'ADMIN', cinemaId: 1 },
        7,
        55,
        undefined,
        { userId: 9 },
      ),
    ).rejects.toThrow(
      new BadRequestException('Luk ønskerunden, før vagterne fordeles.'),
    );

    expect(tx.shiftPlanningDraftItem.update).not.toHaveBeenCalled();
  });

  it('afviser Fordel når medarbejderen ikke har et aktivt ønske på vagten', async () => {
    const { prisma, tx } = createPrismaMock({
      roundStatus: 'CLOSED',
      activeWish: false,
    });
    const service = new ShiftPlanningWishesService(prisma as never);

    await expect(
      service.assignWish(
        { sub: 2, role: 'ADMIN', cinemaId: 1 },
        7,
        55,
        undefined,
        { userId: 9 },
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Medarbejderen har ikke et aktivt ønske på denne vagt.',
      ),
    );

    expect(tx.shiftPlanningDraftItem.update).not.toHaveBeenCalled();
  });

  it('genkontrollerer kvalifikation ved Fordel', async () => {
    const { prisma, tx } = createPrismaMock({
      roundStatus: 'CLOSED',
      qualified: false,
    });
    const service = new ShiftPlanningWishesService(prisma as never);

    await expect(
      service.assignWish(
        { sub: 2, role: 'ADMIN', cinemaId: 1 },
        7,
        55,
        undefined,
        { userId: 9 },
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Medarbejderen er ikke længere kvalificeret til denne jobfunktion.',
      ),
    );

    expect(tx.shiftPlanningDraftItem.update).not.toHaveBeenCalled();
  });

  it('genkontrollerer aktivt medlemskab ved Fordel', async () => {
    const { prisma, tx } = createPrismaMock({
      roundStatus: 'CLOSED',
      activeMembership: false,
    });
    const service = new ShiftPlanningWishesService(prisma as never);

    await expect(
      service.assignWish(
        { sub: 2, role: 'ADMIN', cinemaId: 1 },
        7,
        55,
        undefined,
        { userId: 9 },
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Medarbejderen er ikke længere aktiv i denne biograf.',
      ),
    );

    expect(tx.shiftPlanningDraftItem.update).not.toHaveBeenCalled();
  });
});
