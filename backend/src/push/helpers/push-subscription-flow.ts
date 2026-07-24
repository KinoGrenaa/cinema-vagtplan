import {
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  SavePushSubscriptionInput,
} from "./push-types";
import {
  normalizePushSubscriptionInput,
} from "./push-validation";

export async function savePushSubscription(
  prisma: PrismaService,
  input: SavePushSubscriptionInput,
) {
  const data =
    normalizePushSubscriptionInput(input);

  const activeUser =
    await prisma.user.findFirst({
      where: {
        id: data.userId,
        isActive: true,
        cinemaMemberships: {
          some: {
            cinemaId: data.cinemaId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
      },
    });

  if (!activeUser) {
    throw new ForbiddenException(
      "Du er ikke længere aktivt tilknyttet denne biograf.",
    );
  }

  return prisma.pushSubscription.upsert({
    where: {
      endpoint: data.endpoint,
    },
    update: {
      userId: data.userId,
      cinemaId: data.cinemaId,
      p256dh: data.p256dh,
      auth: data.auth,
    },
    create: data,
  });
}
