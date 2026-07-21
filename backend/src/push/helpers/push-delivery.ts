import * as webPush from "web-push";
import type {
  PushDeliverySummary,
  PushPayload,
  PushSubscriptionForDelivery,
} from "./push-types";

function getPushErrorStatusCode(error: unknown) {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const statusCode = Number((error as { statusCode?: unknown }).statusCode);

    if (Number.isInteger(statusCode)) {
      return statusCode;
    }
  }

  return null;
}

function isExpiredSubscriptionError(error: unknown) {
  const statusCode = getPushErrorStatusCode(error);
  return statusCode === 404 || statusCode === 410;
}

export async function sendPushNotificationsToSubscriptions(
  subscriptions: PushSubscriptionForDelivery[],
  payload: PushPayload,
  removeInvalidSubscription: (endpoint: string) => Promise<unknown>,
): Promise<PushDeliverySummary> {
  const results = await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
        );

        return {
          sent: 1,
          failed: 0,
          removed: 0,
        };
      } catch (error) {
        if (isExpiredSubscriptionError(error)) {
          await removeInvalidSubscription(subscription.endpoint).catch(
            () => null,
          );

          return {
            sent: 0,
            failed: 1,
            removed: 1,
          };
        }

        return {
          sent: 0,
          failed: 1,
          removed: 0,
        };
      }
    }),
  );

  return results.reduce<PushDeliverySummary>(
    (summary, result) => ({
      attempted: summary.attempted + 1,
      sent: summary.sent + result.sent,
      failed: summary.failed + result.failed,
      removed: summary.removed + result.removed,
    }),
    {
      attempted: 0,
      sent: 0,
      failed: 0,
      removed: 0,
    },
  );
}
