import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildCopenhagenDateTimeFromMinute } from './shift-planning-time-zone';

type AuthUser = {
  sub?: number;
  id?: number;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId?: number | null;
};

type OpenWishRoundBody = {
  closesAt?: unknown;
  enableAllUnassigned?: unknown;
};

type WishEnabledBody = {
  enabled?: unknown;
};

function getActorUserId(user: AuthUser) {
  const userId = Number(user.sub ?? user.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new ForbiddenException('Ingen gyldig bruger er logget ind.');
  }
  return userId;
}

function ensureAdminAccess(user: AuthUser) {
  if (user.role === 'MASTER' || user.role === 'ADMIN') {
    return;
  }
  throw new ForbiddenException('Ingen adgang.');
}

function resolveAdminCinemaId(
  user: AuthUser,
  selectedCinemaId?: number | string | null,
) {
  ensureAdminAccess(user);

  if (user.role === 'MASTER') {
    const cinemaId = Number(selectedCinemaId);
    if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
      throw new BadRequestException(
        'Vælg en biograf, før du arbejder med vagtønsker.',
      );
    }
    return cinemaId;
  }

  const cinemaId = Number(user.cinemaId);
  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    throw new ForbiddenException('Ingen biograf er knyttet til din bruger.');
  }
  return cinemaId;
}

function resolveMyCinemaId(user: AuthUser) {
  const cinemaId = Number(user.cinemaId);
  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    throw new ForbiddenException('Ingen biograf er knyttet til din bruger.');
  }
  return cinemaId;
}

function parseOpenWishRoundBody(body: unknown) {
  if (body === undefined || body === null) {
    return {
      closesAt: null as Date | null,
      enableAllUnassigned: true,
    };
  }

  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Ønskerunden skal have et gyldigt input.');
  }

  const input = body as OpenWishRoundBody;

  let closesAt: Date | null = null;
  if (input.closesAt !== undefined && input.closesAt !== null && input.closesAt !== '') {
    if (typeof input.closesAt !== 'string') {
      throw new BadRequestException('Fristen skal være et gyldigt tidspunkt.');
    }

    const parsed = new Date(input.closesAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Fristen skal være et gyldigt tidspunkt.');
    }
    if (parsed.getTime() <= Date.now()) {
      throw new BadRequestException('Fristen skal ligge i fremtiden.');
    }
    closesAt = parsed;
  }

  let enableAllUnassigned = true;
  if (input.enableAllUnassigned !== undefined) {
    if (typeof input.enableAllUnassigned !== 'boolean') {
      throw new BadRequestException(
        'enableAllUnassigned skal være true eller false.',
      );
    }
    enableAllUnassigned = input.enableAllUnassigned;
  }

  return { closesAt, enableAllUnassigned };
}

function parseWishEnabledBody(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Vælg om vagten skal være åben for ønsker.');
  }

  const enabled = (body as WishEnabledBody).enabled;
  if (typeof enabled !== 'boolean') {
    throw new BadRequestException('enabled skal være true eller false.');
  }

  return enabled;
}

type WishTimingItem = {
  date: Date | string;
  plannedStartMinute: number | null;
};

function getWishItemStartTime(item: WishTimingItem) {
  if (item.plannedStartMinute === null) {
    return null;
  }

  try {
    return buildCopenhagenDateTimeFromMinute(
      item.date,
      item.plannedStartMinute,
    );
  } catch {
    return null;
  }
}

function isWishItemInFuture(
  item: WishTimingItem,
  now = new Date(),
) {
  const start = getWishItemStartTime(item);
  return start !== null && start.getTime() > now.getTime();
}

function assertWishItemInFuture(
  item: WishTimingItem,
  now = new Date(),
) {
  const start = getWishItemStartTime(item);

  if (!start) {
    throw new BadRequestException(
      'Vagten mangler et gyldigt starttidspunkt og kan ikke åbnes for ønsker.',
    );
  }

  if (start.getTime() <= now.getTime()) {
    throw new BadRequestException(
      'Vagten er allerede startet eller ligger i fortiden.',
    );
  }
}

function assertRoundIsOpen(
  round: { status: string; closesAt: Date | null } | null,
  now = new Date(),
) {
  if (!round || String(round.status).toUpperCase() !== 'OPEN') {
    throw new BadRequestException('Ønskerunden er ikke åben.');
  }

  if (round.closesAt && round.closesAt.getTime() <= now.getTime()) {
    throw new BadRequestException('Fristen for ønskerunden er udløbet.');
  }
}

@Injectable()
export class ShiftPlanningWishesService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireEditableDraft(
    draftId: number,
    cinemaId: number,
    prisma: Pick<Prisma.TransactionClient, 'shiftPlanningDraft'> | PrismaService =
      this.prisma,
  ) {
    const draft = await prisma.shiftPlanningDraft.findFirst({
      where: { id: draftId, cinemaId },
      select: { id: true, cinemaId: true, year: true, month: true, status: true },
    });

    if (!draft) {
      throw new NotFoundException('Planlægningskladden blev ikke fundet.');
    }

    if (String(draft.status).toUpperCase() !== 'DRAFT') {
      throw new BadRequestException('Planlægningskladden er ikke åben længere.');
    }

    return draft;
  }

  private async ensureActiveQualifiedUser(
    prisma: Pick<
      Prisma.TransactionClient,
      'user' | 'userCinemaMembership' | 'userJobFunction'
    >,
    userId: number,
    cinemaId: number,
    jobFunctionId: number,
  ) {
    const [activeUser, membership, qualification] = await Promise.all([
      prisma.user.findFirst({
        where: { id: userId, isActive: true },
        select: { id: true },
      }),
      prisma.userCinemaMembership.findFirst({
        where: { userId, cinemaId, isActive: true },
        select: { id: true },
      }),
      prisma.userJobFunction.findFirst({
        where: { userId, cinemaId, jobFunctionId },
        select: { id: true },
      }),
    ]);

    if (!activeUser || !membership) {
      throw new ForbiddenException(
        'Du har ikke en aktiv tilknytning til denne biograf.',
      );
    }

    if (!qualification) {
      throw new BadRequestException(
        'Du er ikke kvalificeret til denne jobfunktion.',
      );
    }
  }

  async openRound(
    user: AuthUser,
    draftId: number,
    cinemaIdValue?: string,
    body?: unknown,
  ) {
    const cinemaId = resolveAdminCinemaId(user, cinemaIdValue);
    const actorUserId = getActorUserId(user);
    const { closesAt, enableAllUnassigned } = parseOpenWishRoundBody(body);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await this.requireEditableDraft(draftId, cinemaId, tx);

      if (enableAllUnassigned) {
        await tx.shiftPlanningDraftItem.updateMany({
          where: { draftId, cinemaId },
          data: { wishEnabled: false },
        });

        const candidateItems = await tx.shiftPlanningDraftItem.findMany({
          where: {
            draftId,
            cinemaId,
            userId: null,
            jobFunctionId: { not: null },
          },
          select: {
            id: true,
            date: true,
            plannedStartMinute: true,
          },
        });

        const wishableItemIds = candidateItems
          .filter((item) => isWishItemInFuture(item, now))
          .map((item) => item.id);

        if (wishableItemIds.length > 0) {
          await tx.shiftPlanningDraftItem.updateMany({
            where: {
              draftId,
              cinemaId,
              id: { in: wishableItemIds },
            },
            data: { wishEnabled: true },
          });
        }
      }

      await tx.shiftPlanningWishRound.upsert({
        where: { draftId },
        create: {
          cinemaId,
          draftId,
          status: 'OPEN',
          openedAt: new Date(),
          closesAt,
          closedAt: null,
          openedByUserId: actorUserId,
          closedByUserId: null,
        },
        update: {
          status: 'OPEN',
          openedAt: new Date(),
          closesAt,
          closedAt: null,
          openedByUserId: actorUserId,
          closedByUserId: null,
        },
      });
    });

    return this.getDraftOverview(user, draftId, cinemaIdValue);
  }

  async closeRound(
    user: AuthUser,
    draftId: number,
    cinemaIdValue?: string,
  ) {
    const cinemaId = resolveAdminCinemaId(user, cinemaIdValue);
    const actorUserId = getActorUserId(user);

    await this.requireEditableDraft(draftId, cinemaId);

    const round = await this.prisma.shiftPlanningWishRound.findFirst({
      where: { draftId, cinemaId },
      select: { id: true },
    });

    if (!round) {
      throw new NotFoundException('Ønskerunden blev ikke fundet.');
    }

    await this.prisma.shiftPlanningWishRound.update({
      where: { id: round.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedByUserId: actorUserId,
      },
    });

    return this.getDraftOverview(user, draftId, cinemaIdValue);
  }

  async setItemWishEnabled(
    user: AuthUser,
    draftId: number,
    itemId: number,
    cinemaIdValue?: string,
    body?: unknown,
  ) {
    const cinemaId = resolveAdminCinemaId(user, cinemaIdValue);
    const enabled = parseWishEnabledBody(body);

    await this.requireEditableDraft(draftId, cinemaId);

    const item = await this.prisma.shiftPlanningDraftItem.findFirst({
      where: { id: itemId, draftId, cinemaId },
      select: {
        id: true,
        userId: true,
        jobFunctionId: true,
        date: true,
        plannedStartMinute: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Kladdevagten blev ikke fundet.');
    }

    if (enabled && item.userId !== null) {
      throw new BadRequestException(
        'En allerede tildelt vagt kan ikke åbnes for ønsker.',
      );
    }

    if (enabled && item.jobFunctionId === null) {
      throw new BadRequestException(
        'Vagten mangler en jobfunktion og kan ikke åbnes for ønsker.',
      );
    }

    if (enabled) {
      assertWishItemInFuture(item);
    }

    await this.prisma.shiftPlanningDraftItem.update({
      where: { id: item.id },
      data: { wishEnabled: enabled },
    });

    return this.getDraftOverview(user, draftId, cinemaIdValue);
  }

  async listMine(user: AuthUser) {
    const cinemaId = resolveMyCinemaId(user);
    const userId = getActorUserId(user);
    const now = new Date();

    const [activeUser, membership, qualifications, rounds] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: userId, isActive: true },
        select: { id: true },
      }),
      this.prisma.userCinemaMembership.findFirst({
        where: { userId, cinemaId, isActive: true },
        select: { id: true },
      }),
      this.prisma.userJobFunction.findMany({
        where: { userId, cinemaId },
        select: { jobFunctionId: true },
      }),
      this.prisma.shiftPlanningWishRound.findMany({
        where: {
          cinemaId,
          status: 'OPEN',
          OR: [{ closesAt: null }, { closesAt: { gt: now } }],
        },
        select: {
          id: true,
          draftId: true,
          openedAt: true,
          closesAt: true,
        },
        orderBy: { openedAt: 'desc' },
      }),
    ]);

    if (!activeUser || !membership) {
      throw new ForbiddenException(
        'Du har ikke en aktiv tilknytning til denne biograf.',
      );
    }

    const qualifiedJobFunctionIds = qualifications.map(
      (qualification) => qualification.jobFunctionId,
    );
    const draftIds = rounds.map((round) => round.draftId);

    if (qualifiedJobFunctionIds.length === 0 || draftIds.length === 0) {
      return { cinemaId, checkedAt: now, rounds: [] };
    }

    const items = await this.prisma.shiftPlanningDraftItem.findMany({
      where: {
        cinemaId,
        draftId: { in: draftIds },
        wishEnabled: true,
        userId: null,
        jobFunctionId: { in: qualifiedJobFunctionIds },
        draft: { status: 'DRAFT' },
      },
      select: {
        id: true,
        draftId: true,
        date: true,
        jobFunctionId: true,
        plannedStartMinute: true,
        plannedEndMinute: true,
        requiredIndex: true,
        jobFunction: {
          select: {
            name: true,
            color: true,
          },
        },
        wishes: {
          where: { userId },
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            withdrawnAt: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { plannedStartMinute: 'asc' }, { id: 'asc' }],
    });

    const futureItems = items.filter((item) =>
      isWishItemInFuture(item, now),
    );

    return {
      cinemaId,
      checkedAt: now,
      rounds: rounds
        .map((round) => ({
          ...round,
          items: futureItems
            .filter((item) => item.draftId === round.draftId)
            .map((item) => ({
              ...item,
              wished: item.wishes.some((wish) => wish.withdrawnAt === null),
            })),
        }))
        .filter((round) => round.items.length > 0),
    };
  }

  async createWish(user: AuthUser, itemId: number) {
    const cinemaId = resolveMyCinemaId(user);
    const userId = getActorUserId(user);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.shiftPlanningDraftItem.findFirst({
        where: { id: itemId, cinemaId },
        select: {
          id: true,
          draftId: true,
          cinemaId: true,
          userId: true,
          jobFunctionId: true,
          wishEnabled: true,
          date: true,
          plannedStartMinute: true,
          draft: { select: { status: true } },
        },
      });

      if (!item) {
        throw new NotFoundException('Kladdevagten blev ikke fundet.');
      }

      if (String(item.draft.status).toUpperCase() !== 'DRAFT') {
        throw new BadRequestException('Planlægningskladden er ikke åben længere.');
      }

      if (!item.wishEnabled) {
        throw new BadRequestException('Vagten er ikke åben for ønsker.');
      }

      if (item.userId !== null) {
        throw new BadRequestException('Vagten er allerede tildelt.');
      }

      if (item.jobFunctionId === null) {
        throw new BadRequestException(
          'Vagten mangler en jobfunktion og kan ikke ønskes.',
        );
      }

      assertWishItemInFuture(item, now);

      const round = await tx.shiftPlanningWishRound.findUnique({
        where: { draftId: item.draftId },
        select: { status: true, closesAt: true },
      });

      assertRoundIsOpen(round, now);

      await this.ensureActiveQualifiedUser(
        tx,
        userId,
        cinemaId,
        item.jobFunctionId,
      );

      const wish = await tx.shiftPlanningDraftWish.upsert({
        where: {
          draftItemId_userId: {
            draftItemId: item.id,
            userId,
          },
        },
        create: {
          cinemaId,
          draftItemId: item.id,
          userId,
        },
        update: {
          withdrawnAt: null,
        },
      });

      return {
        ...wish,
        wished: true,
      };
    });
  }

  async withdrawWish(user: AuthUser, itemId: number) {
    const cinemaId = resolveMyCinemaId(user);
    const userId = getActorUserId(user);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.shiftPlanningDraftItem.findFirst({
        where: { id: itemId, cinemaId },
        select: {
          id: true,
          draftId: true,
          wishEnabled: true,
          draft: { select: { status: true } },
        },
      });

      if (!item) {
        throw new NotFoundException('Kladdevagten blev ikke fundet.');
      }

      if (String(item.draft.status).toUpperCase() !== 'DRAFT') {
        throw new BadRequestException('Planlægningskladden er ikke åben længere.');
      }

      if (!item.wishEnabled) {
        throw new BadRequestException('Vagten er ikke åben for ønsker.');
      }

      const round = await tx.shiftPlanningWishRound.findUnique({
        where: { draftId: item.draftId },
        select: { status: true, closesAt: true },
      });

      assertRoundIsOpen(round, now);

      const result = await tx.shiftPlanningDraftWish.updateMany({
        where: {
          cinemaId,
          draftItemId: item.id,
          userId,
          withdrawnAt: null,
        },
        data: { withdrawnAt: now },
      });

      if (result.count === 0) {
        throw new NotFoundException('Du har ikke et aktivt ønske på denne vagt.');
      }

      return {
        draftItemId: item.id,
        userId,
        wished: false,
        withdrawnAt: now,
      };
    });
  }

  async getDraftOverview(
    user: AuthUser,
    draftId: number,
    cinemaIdValue?: string,
  ) {
    const cinemaId = resolveAdminCinemaId(user, cinemaIdValue);
    const draft = await this.requireEditableDraft(draftId, cinemaId);

    const [round, items] = await Promise.all([
      this.prisma.shiftPlanningWishRound.findUnique({
        where: { draftId },
        select: {
          id: true,
          status: true,
          openedAt: true,
          closesAt: true,
          closedAt: true,
          openedByUserId: true,
          closedByUserId: true,
        },
      }),
      this.prisma.shiftPlanningDraftItem.findMany({
        where: { draftId, cinemaId },
        select: {
          id: true,
          date: true,
          userId: true,
          jobFunctionId: true,
          wishEnabled: true,
          requiredIndex: true,
          plannedStartMinute: true,
          plannedEndMinute: true,
          jobFunction: {
            select: { name: true, color: true },
          },
          wishes: {
            select: {
              id: true,
              userId: true,
              createdAt: true,
              updatedAt: true,
              withdrawnAt: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  isActive: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ date: 'asc' }, { plannedStartMinute: 'asc' }, { id: 'asc' }],
      }),
    ]);

    const wishUserIds = [
      ...new Set(
        items.flatMap((item) => item.wishes.map((wish) => wish.userId)),
      ),
    ];

    const [memberships, qualifications] =
      wishUserIds.length === 0
        ? [[], []]
        : await Promise.all([
            this.prisma.userCinemaMembership.findMany({
              where: {
                cinemaId,
                userId: { in: wishUserIds },
                isActive: true,
              },
              select: { userId: true },
            }),
            this.prisma.userJobFunction.findMany({
              where: {
                cinemaId,
                userId: { in: wishUserIds },
              },
              select: { userId: true, jobFunctionId: true },
            }),
          ]);

    const activeMembershipUserIds = new Set(
      memberships.map((membership) => membership.userId),
    );
    const qualificationKeys = new Set(
      qualifications.map(
        (qualification) =>
          `${qualification.userId}:${qualification.jobFunctionId}`,
      ),
    );

    const overviewItems = items.map((item) => ({
      ...item,
      wishes: item.wishes.map((wish) => ({
        ...wish,
        currentlyEligible:
          wish.withdrawnAt === null &&
          wish.user.isActive &&
          activeMembershipUserIds.has(wish.userId) &&
          item.jobFunctionId !== null &&
          qualificationKeys.has(`${wish.userId}:${item.jobFunctionId}`),
      })),
    }));

    return {
      draft,
      round,
      summary: {
        itemCount: overviewItems.length,
        wishEnabledItemCount: overviewItems.filter((item) => item.wishEnabled)
          .length,
        activeWishCount: overviewItems.reduce(
          (total, item) =>
            total +
            item.wishes.filter((wish) => wish.withdrawnAt === null).length,
          0,
        ),
        wishedItemCount: overviewItems.filter((item) =>
          item.wishes.some((wish) => wish.withdrawnAt === null),
        ).length,
      },
      items: overviewItems,
    };
  }
}
