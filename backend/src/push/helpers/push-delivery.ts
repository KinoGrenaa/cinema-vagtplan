import * as webPush from 'web-push';

import type { PushPayload, PushSubscriptionForDelivery } from './push-types';

export async function sendPushNotificationsToSubscriptions(
  subscriptions: PushSubscriptionForDelivery[],
  payload: PushPayload,
  removeInvalidSubscription: (endpoint: string) => Promise<unknown>,
) {
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
          await removeInvalidSubscription(subscription.endpoint);
        }),
    ),
  );
}
