import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

type PushSubscriptionBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type PushSubscriptionActor = {
  id?: number;
  role?: string;
  cinemaId?: number | null;
};

function getRequiredPositiveId(
  value: unknown,
  message: string,
) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException(message);
  }

  return id;
}

function getRequiredString(
  value: unknown,
  message: string,
) {
  if (
    typeof value !== 'string' ||
    value.trim() === ''
  ) {
    throw new BadRequestException(message);
  }

  return value.trim();
}

@Injectable()
export class PushSubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(
    user: PushSubscriptionActor,
    subscription: PushSubscriptionBody,
  ) {
    const userId = getRequiredPositiveId(
      user?.id,
      'Bruger skal være et gyldigt ID',
    );
    const cinemaId = getRequiredPositiveId(
      user?.cinemaId,
      'Vælg en biograf, før du aktiverer push-notifikationer.',
    );

    if (user?.role === 'MASTER') {
      throw new ForbiddenException(
        'Push-notifikationer kan ikke aktiveres for MASTER.',
      );
    }

    const activeUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        role: {
          not: 'MASTER',
        },
        OR: [
          {
            cinemaId,
          },
          {
            cinemaMemberships: {
              some: {
                cinemaId,
                isActive: true,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!activeUser) {
      throw new ForbiddenException(
        'Du er ikke længere aktivt tilknyttet denne biograf.',
      );
    }

    const endpoint = getRequiredString(
      subscription?.endpoint,
      'Push-endpoint mangler',
    );
    const p256dh = getRequiredString(
      subscription?.keys?.p256dh,
      'Push-nøgle mangler',
    );
    const auth = getRequiredString(
      subscription?.keys?.auth,
      'Push-godkendelse mangler',
    );

    return this.prisma.pushSubscription.upsert({
      where: {
        endpoint,
      },
      update: {
        userId,
        cinemaId,
        p256dh,
        auth,
      },
      create: {
        endpoint,
        p256dh,
        auth,
        userId,
        cinemaId,
      },
    });
  }

  async findForUser(userId: number) {
    return this.prisma.pushSubscription.findMany({
      where: {
        userId,
      },
    });
  }

  async deleteByEndpoint(
    user: PushSubscriptionActor,
    endpointValue: unknown,
  ) {
    const userId = getRequiredPositiveId(
      user?.id,
      'Bruger skal være et gyldigt ID',
    );
    const endpoint = getRequiredString(
      endpointValue,
      'Push-endpoint mangler',
    );

    return this.prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId,
      },
    });
  }
}
