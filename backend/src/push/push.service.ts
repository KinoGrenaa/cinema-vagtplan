import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as webPush from 'web-push';

@Injectable()
export class PushService {
  constructor(private prisma: PrismaService) {
    webPush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:post@kinogrenaa.dk',
      process.env.VAPID_PUBLIC_KEY || '',
      process.env.VAPID_PRIVATE_KEY || '',
    );
  }

  async saveSubscription(data: {
    userId: number;
    endpoint: string;
    p256dh: string;
    auth: string;
  }) {
    return this.prisma.pushSubscription.upsert({
      where: {
        endpoint: data.endpoint,
      },
      update: {
        userId: data.userId,
        p256dh: data.p256dh,
        auth: data.auth,
      },
      create: {
        userId: data.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
      },
    });
  }

  async sendToUser(
    userId: number,
    payload: {
      title: string;
      body: string;
      url?: string;
    },
  ) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: {
        userId,
      },
    });

    await Promise.all(
      subscriptions.map((subscription) =>
        webPush
          .sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            JSON.stringify(payload),
          )
          .catch(async () => {
            await this.prisma.pushSubscription
              .delete({
                where: {
                  endpoint: subscription.endpoint,
                },
              })
              .catch(() => null);
          }),
      ),
    );

    return {
      sent: subscriptions.length,
    };
  }

  async deleteSubscriptionsForUser(userId: number) {
    return this.prisma.pushSubscription.deleteMany({
      where: {
        userId,
      },
    });
  }
}
