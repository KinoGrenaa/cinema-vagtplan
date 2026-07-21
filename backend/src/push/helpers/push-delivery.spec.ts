import * as webPush from "web-push";
import { sendPushNotificationsToSubscriptions } from "./push-delivery";

jest.mock("web-push", () => ({
  sendNotification: jest.fn(),
}));

describe("sendPushNotificationsToSubscriptions", () => {
  const subscriptions = [
    {
      endpoint: "https://push.example.com/one",
      p256dh: "A".repeat(40),
      auth: "B".repeat(16),
    },
    {
      endpoint: "https://push.example.com/two",
      p256dh: "C".repeat(40),
      auth: "D".repeat(16),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("tæller faktiske leveringer", async () => {
    (webPush.sendNotification as jest.Mock).mockResolvedValue({});
    const removeInvalidSubscription = jest.fn();

    const result = await sendPushNotificationsToSubscriptions(
      subscriptions,
      {
        title: "Titel",
        body: "Besked",
      },
      removeInvalidSubscription,
    );

    expect(result).toEqual({
      attempted: 2,
      sent: 2,
      failed: 0,
      removed: 0,
    });
    expect(removeInvalidSubscription).not.toHaveBeenCalled();
  });

  it.each([404, 410])(
    "fjerner et udløbet abonnement ved status %s",
    async (statusCode) => {
      (webPush.sendNotification as jest.Mock)
        .mockRejectedValueOnce({ statusCode })
        .mockResolvedValueOnce({});
      const removeInvalidSubscription = jest
        .fn()
        .mockResolvedValue({ count: 1 });

      const result = await sendPushNotificationsToSubscriptions(
        subscriptions,
        {
          title: "Titel",
          body: "Besked",
        },
        removeInvalidSubscription,
      );

      expect(result).toEqual({
        attempted: 2,
        sent: 1,
        failed: 1,
        removed: 1,
      });
      expect(removeInvalidSubscription).toHaveBeenCalledWith(
        subscriptions[0].endpoint,
      );
    },
  );

  it("bevarer abonnementet ved midlertidig leveringsfejl", async () => {
    (webPush.sendNotification as jest.Mock)
      .mockRejectedValueOnce({ statusCode: 503 })
      .mockResolvedValueOnce({});
    const removeInvalidSubscription = jest.fn();

    const result = await sendPushNotificationsToSubscriptions(
      subscriptions,
      {
        title: "Titel",
        body: "Besked",
      },
      removeInvalidSubscription,
    );

    expect(result).toEqual({
      attempted: 2,
      sent: 1,
      failed: 1,
      removed: 0,
    });
    expect(removeInvalidSubscription).not.toHaveBeenCalled();
  });
});
