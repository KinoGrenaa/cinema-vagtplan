import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as webPush from 'web-push';

@Injectable()
export class PushService {
  private pushEnabled = false;

  constructor(private prisma: PrismaService) {
    const vapidEmail = process.env.VAPID_EMAIL || 'mailto:post@kinogrenaa.dk';
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (vapidPublicKey && vapidPrivateKey) {
      webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
      this.pushEnabled = true;
    } else {
      console.warn(
        'Push notifications disabled: VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is missing',
      );
    }
  }

  async saveSubscription(data: {
    userId: number;
    cinemaId: number;
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
        cinemaId: data.cinemaId,
        p256dh: data.p256dh,
        auth: data.auth,
      },
      create: {
        userId: data.userId,
        cinemaId: data.cinemaId,
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
    if (!this.pushEnabled) {
      return {
        sent: 0,
        skipped: true,
        reason: 'Push notifications are disabled because VAPID keys are missing',
      };
    }

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