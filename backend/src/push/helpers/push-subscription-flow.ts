import { PrismaService } from '../../prisma/prisma.service';
import type { SavePushSubscriptionInput } from './push-types';

export function savePushSubscription(
  prisma: PrismaService,
  data: SavePushSubscriptionInput,
) {
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
    create: {
      userId: data.userId,
      cinemaId: data.cinemaId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
    },
  });
}
