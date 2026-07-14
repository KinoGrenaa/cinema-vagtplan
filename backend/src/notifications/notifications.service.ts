import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

type NotificationActor = {
  sub?: number;
  id?: number;
  role?: string;
  cinemaId?: number | null;
};

function parsePositiveId(
  value: unknown,
  message: string,
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(message);
  }

  return parsed;
}

function parseOptionalPositiveId(
  value: unknown,
  message: string,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  return parsePositiveId(value, message);
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  async create(data: {
    userId: number;
    cinemaId: number;
    title: string;
    message: string;
    type: string;
    linkUrl?: string;
  }) {
    const notification =
      await this.prisma.notification.create({
        data,
      });

    this.realtime.notifyUser(
      notification.userId,
      'notificationsUpdated',
      notification,
    );

    return notification;
  }

  async findForUser(
    actor: NotificationActor,
    selectedCinemaId?: number | null,
  ) {
    const context =
      await this.resolveNotificationContext(
        actor,
        selectedCinemaId,
      );

    return this.prisma.notification.findMany({
      where: {
        userId: context.userId,
        cinemaId: context.cinemaId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async unreadCount(
    actor: NotificationActor,
    selectedCinemaId?: number | null,
  ) {
    const context =
      await this.resolveNotificationContext(
        actor,
        selectedCinemaId,
      );

    return this.prisma.notification.count({
      where: {
        userId: context.userId,
        cinemaId: context.cinemaId,
        isRead: false,
      },
    });
  }

  async markAsRead(
    id: number,
    actor: NotificationActor,
    selectedCinemaId?: number | null,
  ) {
    const context =
      await this.resolveNotificationContext(
        actor,
        selectedCinemaId,
      );

    const notification =
      await this.prisma.notification.findFirst({
        where: {
          id,
          userId: context.userId,
          cinemaId: context.cinemaId,
        },
      });

    if (!notification) {
      throw new NotFoundException(
        'Notifikationen blev ikke fundet i den aktive biograf.',
      );
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: {
        id,
      },
      data: {
        isRead: true,
      },
    });
  }

  async markAllAsRead(
    actor: NotificationActor,
    selectedCinemaId?: number | null,
  ) {
    const context =
      await this.resolveNotificationContext(
        actor,
        selectedCinemaId,
      );

    return this.prisma.notification.updateMany({
      where: {
        userId: context.userId,
        cinemaId: context.cinemaId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  private async resolveNotificationContext(
    actor: NotificationActor,
    selectedCinemaId?: number | null,
  ) {
    const userId = parsePositiveId(
      actor?.sub ?? actor?.id,
      'Bruger skal være et gyldigt ID',
    );
    const requestedCinemaId =
      parseOptionalPositiveId(
        selectedCinemaId,
        'Biograf skal være et gyldigt ID',
      );

    if (actor?.role === 'MASTER') {
      if (!requestedCinemaId) {
        throw new BadRequestException(
          'Vælg en biograf, før du ser notifikationer.',
        );
      }

      const [master, cinema] = await Promise.all([
        this.prisma.user.findFirst({
          where: {
            id: userId,
            role: 'MASTER',
            isActive: true,
          },
          select: {
            id: true,
          },
        }),
        this.prisma.cinema.findUnique({
          where: {
            id: requestedCinemaId,
          },
          select: {
            id: true,
          },
        }),
      ]);

      if (!master) {
        throw new ForbiddenException(
          'Du har ikke adgang til notifikationer.',
        );
      }

      if (!cinema) {
        throw new NotFoundException(
          'Biograf blev ikke fundet.',
        );
      }

      return {
        userId,
        cinemaId: requestedCinemaId,
      };
    }

    const sessionCinemaId =
      parseOptionalPositiveId(
        actor?.cinemaId,
        'Brugerens biograf skal være et gyldigt ID',
      );

    if (!sessionCinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du ser notifikationer.',
      );
    }

    if (
      requestedCinemaId &&
      requestedCinemaId !== sessionCinemaId
    ) {
      throw new ForbiddenException(
        'Du har ikke adgang til denne biografs notifikationer.',
      );
    }

    const activeUser =
      await this.prisma.user.findFirst({
        where: {
          id: userId,
          isActive: true,
          role: {
            not: 'MASTER',
          },
          OR: [
            {
              cinemaId: sessionCinemaId,
            },
            {
              cinemaMemberships: {
                some: {
                  cinemaId: sessionCinemaId,
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

    return {
      userId,
      cinemaId: sessionCinemaId,
    };
  }
}
