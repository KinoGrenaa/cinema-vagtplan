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

type CreateNotificationData = {
  userId: number;
  cinemaId: number;
  title: string;
  message: string;
  type: string;
  linkUrl?: string;
};

function parsePositiveId(value: unknown, message: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(message);
  }

  return parsed;
}

function parseOptionalPositiveId(value: unknown, message: string) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return parsePositiveId(value, message);
}

function normalizeRequiredText(value: unknown, message: string) {
  if (typeof value !== 'string') {
    throw new BadRequestException(message);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException(message);
  }

  return normalized;
}

function normalizeOptionalText(value: unknown, message: string) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(message);
  }

  const normalized = value.trim();
  return normalized || undefined;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  async create(data: CreateNotificationData) {
    const userId = parsePositiveId(
      data?.userId,
      'Modtager skal være et gyldigt ID.',
    );
    const cinemaId = parsePositiveId(
      data?.cinemaId,
      'Biograf skal være et gyldigt ID.',
    );
    const title = normalizeRequiredText(
      data?.title,
      'Notifikationens titel må ikke være tom.',
    );
    const message = normalizeRequiredText(
      data?.message,
      'Notifikationens besked må ikke være tom.',
    );
    const type = normalizeRequiredText(
      data?.type,
      'Notifikationens type må ikke være tom.',
    );
    const linkUrl = normalizeOptionalText(
      data?.linkUrl,
      'Notifikationens link skal være tekst.',
    );

    const [cinema, recipient] = await Promise.all([
      this.prisma.cinema.findUnique({
        where: {
          id: cinemaId,
        },
        select: {
          id: true,
        },
      }),
      this.prisma.user.findFirst({
        where: {
          id: userId,
          isActive: true,
          OR: [
            {
              role: 'MASTER',
            },
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
      }),
    ]);

    if (!cinema) {
      throw new NotFoundException('Biograf blev ikke fundet.');
    }

    if (!recipient) {
      throw new ForbiddenException(
        'Modtageren er ikke aktivt tilknyttet biografen.',
      );
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        cinemaId,
        title,
        message,
        type,
        ...(linkUrl ? { linkUrl } : {}),
      },
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
    const context = await this.resolveNotificationContext(
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
    const context = await this.resolveNotificationContext(
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
    const notificationId = parsePositiveId(
      id,
      'Notifikation skal være et gyldigt ID.',
    );
    const context = await this.resolveNotificationContext(
      actor,
      selectedCinemaId,
    );
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
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
        id: notificationId,
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
    const context = await this.resolveNotificationContext(
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
    const requestedCinemaId = parseOptionalPositiveId(
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
        throw new NotFoundException('Biograf blev ikke fundet.');
      }

      return {
        userId,
        cinemaId: requestedCinemaId,
      };
    }

    const sessionCinemaId = parseOptionalPositiveId(
      actor?.cinemaId,
      'Brugerens biograf skal være et gyldigt ID',
    );

    if (!sessionCinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du ser notifikationer.',
      );
    }

    if (requestedCinemaId && requestedCinemaId !== sessionCinemaId) {
      throw new ForbiddenException(
        'Du har ikke adgang til denne biografs notifikationer.',
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
