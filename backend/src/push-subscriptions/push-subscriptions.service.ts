import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushSubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(user: any, subscription: any) {
    return this.prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: user.id,
        cinemaId: user.cinemaId,
      },
    });
  }

  async findForUser(userId: number) {
    return this.prisma.pushSubscription.findMany({
      where: { userId },
    });
  }

  async deleteByEndpoint(endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
  }
}
