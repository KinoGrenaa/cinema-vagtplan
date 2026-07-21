import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { sendPushNotificationsToSubscriptions } from "./helpers/push-delivery";
import { savePushSubscription } from "./helpers/push-subscription-flow";
import type {
  PushPayload,
  SavePushSubscriptionInput,
} from "./helpers/push-types";
import {
  getRequiredPositivePushId,
  normalizePushPayload,
} from "./helpers/push-validation";
import { configureWebPush } from "./helpers/push-vapid-config";

@Injectable()
export class PushService {
  private pushEnabled = false;

  constructor(private prisma: PrismaService) {
    this.pushEnabled = configureWebPush();
  }

  async saveSubscription(data: SavePushSubscriptionInput) {
    return savePushSubscription(this.prisma, data);
  }

  async sendToUser(userIdValue: unknown, payload: PushPayload) {
    const userId = getRequiredPositivePushId(
      userIdValue,
      "Bruger skal være et gyldigt ID",
    );

    return this.sendToSubscriptions(
      {
        userId,
      },
      payload,
    );
  }

  async sendToUserInCinema(
    userIdValue: unknown,
    cinemaIdValue: unknown,
    payload: PushPayload,
  ) {
    const userId = getRequiredPositivePushId(
      userIdValue,
      "Bruger skal være et gyldigt ID",
    );
    const cinemaId = getRequiredPositivePushId(
      cinemaIdValue,
      "Biograf skal være et gyldigt ID",
    );

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
    payloadValue: PushPayload,
  ) {
    const payload = normalizePushPayload(payloadValue);

    if (!this.pushEnabled) {
      return {
        attempted: 0,
        sent: 0,
        failed: 0,
        removed: 0,
        skipped: true,
        reason:
          "Push notifications are disabled because VAPID keys are missing",
      };
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where,
    });
    const summary = await sendPushNotificationsToSubscriptions(
      subscriptions,
      payload,
      (endpoint) =>
        this.prisma.pushSubscription.deleteMany({
          where: {
            endpoint,
          },
        }),
    );

    return {
      ...summary,
      skipped: false,
    };
  }

  async deleteSubscriptionsForUser(userIdValue: unknown) {
    const userId = getRequiredPositivePushId(
      userIdValue,
      "Bruger skal være et gyldigt ID",
    );

    return this.prisma.pushSubscription.deleteMany({
      where: {
        userId,
      },
    });
  }
}
