import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { savePushSubscription } from "../push/helpers/push-subscription-flow";
import {
  getRequiredPositivePushId,
  normalizePushEndpoint,
} from "../push/helpers/push-validation";

type PushSubscriptionBody = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

type PushSubscriptionActor = {
  id?: unknown;
  role?: string;
  cinemaId?: unknown;
};

@Injectable()
export class PushSubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(
    user: PushSubscriptionActor,
    subscription: PushSubscriptionBody,
  ) {
    if (user?.role === "MASTER") {
      throw new ForbiddenException(
        "Push-notifikationer kan ikke aktiveres for MASTER.",
      );
    }

    return savePushSubscription(this.prisma, {
      userId: user?.id,
      cinemaId: user?.cinemaId,
      endpoint: subscription?.endpoint,
      p256dh: subscription?.keys?.p256dh,
      auth: subscription?.keys?.auth,
    });
  }

  async findForUser(userIdValue: unknown) {
    const userId = getRequiredPositivePushId(
      userIdValue,
      "Bruger skal være et gyldigt ID",
    );

    return this.prisma.pushSubscription.findMany({
      where: {
        userId,
      },
    });
  }

  async deleteByEndpoint(user: PushSubscriptionActor, endpointValue: unknown) {
    const userId = getRequiredPositivePushId(
      user?.id,
      "Bruger skal være et gyldigt ID",
    );
    const endpoint = normalizePushEndpoint(endpointValue);

    return this.prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId,
      },
    });
  }
}
