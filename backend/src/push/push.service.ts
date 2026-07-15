import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { sendPushNotificationsToSubscriptions } from './helpers/push-delivery';
import { savePushSubscription } from './helpers/push-subscription-flow';
import type {
  PushPayload,
  SavePushSubscriptionInput,
} from './helpers/push-types';
import { configureWebPush } from './helpers/push-vapid-config';

@Injectable()
export class PushService {
  private pushEnabled = false;

  constructor(private prisma: PrismaService) {
    this.pushEnabled = configureWebPush();
  }

  async saveSubscription(
    data: SavePushSubscriptionInput,
  ) {
    return savePushSubscription(this.prisma, data);
  }

  async sendToUser(
    userId: number,
    payload: PushPayload,
  ) {
    return this.sendToSubscriptions(
      {
        userId,
      },
      payload,
    );
  }

  async sendToUserInCinema(
    userId: number,
    cinemaId: number,
    payload: PushPayload,
  ) {
    return this.sendToSubscriptions(
      {
        userId,
        cinemaId,
      },
      payload,
    );
  }

  private async sendToSubscriptions(
    where: {
      userId: number;
      cinemaId?: number;
    },
    payload: PushPayload,
  ) {
    if (!this.pushEnabled) {
      return {
        sent: 0,
        skipped: true,
        reason:
          'Push notifications are disabled because VAPID keys are missing',
      };
    }

    const subscriptions =
      await this.prisma.pushSubscription.findMany({
        where,
      });

    await sendPushNotificationsToSubscriptions(
      subscriptions,
      payload,
      (endpoint) =>
        this.prisma.pushSubscription
          .delete({
            where: {
              endpoint,
            },
          })
          .catch(() => null),
    );

    return {
      sent: subscriptions.length,
    };
  }

  async deleteSubscriptionsForUser(
    userId: number,
  ) {
    return this.prisma.pushSubscription.deleteMany({
      where: {
        userId,
      },
    });
  }
}
