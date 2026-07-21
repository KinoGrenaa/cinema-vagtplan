import { PushService } from "./push.service";
import { configureWebPush } from "./helpers/push-vapid-config";
import { sendPushNotificationsToSubscriptions } from "./helpers/push-delivery";
import { savePushSubscription } from "./helpers/push-subscription-flow";

jest.mock("./helpers/push-vapid-config", () => ({
  configureWebPush: jest.fn(),
}));

jest.mock("./helpers/push-delivery", () => ({
  sendPushNotificationsToSubscriptions: jest.fn(),
}));

jest.mock("./helpers/push-subscription-flow", () => ({
  savePushSubscription: jest.fn(),
}));

describe("PushService", () => {
  let prisma: {
    pushSubscription: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      pushSubscription: {
        findMany: jest.fn().mockResolvedValue([
          {
            endpoint: "https://push.example.com/subscription",
            p256dh: "A".repeat(40),
            auth: "B".repeat(16),
          },
        ]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
  });

  it("delegerer valideret abonnementslagring", async () => {
    (configureWebPush as jest.Mock).mockReturnValue(true);
    (savePushSubscription as jest.Mock).mockResolvedValue({ id: 1 });
    const service = new PushService(prisma as never);
    const input = {
      userId: 7,
      cinemaId: 3,
      endpoint: "https://push.example.com/subscription",
      p256dh: "A".repeat(40),
      auth: "B".repeat(16),
    };

    await expect(service.saveSubscription(input)).resolves.toEqual({
      id: 1,
    });
    expect(savePushSubscription).toHaveBeenCalledWith(prisma, input);
  });

  it("sender kun til brugerens abonnementer i den valgte biograf", async () => {
    (configureWebPush as jest.Mock).mockReturnValue(true);
    (sendPushNotificationsToSubscriptions as jest.Mock).mockResolvedValue({
      attempted: 1,
      sent: 1,
      failed: 0,
      removed: 0,
    });
    const service = new PushService(prisma as never);

    await expect(
      service.sendToUserInCinema(7, 3, {
        title: " Titel ",
        body: " Besked ",
        url: "/dashboard",
      }),
    ).resolves.toEqual({
      attempted: 1,
      sent: 1,
      failed: 0,
      removed: 0,
      skipped: false,
    });

    expect(prisma.pushSubscription.findMany).toHaveBeenCalledWith({
      where: {
        userId: 7,
        cinemaId: 3,
      },
    });
    expect(sendPushNotificationsToSubscriptions).toHaveBeenCalledWith(
      expect.any(Array),
      {
        title: "Titel",
        body: "Besked",
        url: "/dashboard",
      },
      expect.any(Function),
    );
  });

  it("returnerer tydelig skipped-status uden VAPID-konfiguration", async () => {
    (configureWebPush as jest.Mock).mockReturnValue(false);
    const service = new PushService(prisma as never);

    await expect(
      service.sendToUserInCinema(7, 3, {
        title: "Titel",
        body: "Besked",
      }),
    ).resolves.toEqual({
      attempted: 0,
      sent: 0,
      failed: 0,
      removed: 0,
      skipped: true,
      reason: "Push notifications are disabled because VAPID keys are missing",
    });
    expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled();
  });
});
