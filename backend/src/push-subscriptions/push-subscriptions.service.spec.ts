import { ForbiddenException } from "@nestjs/common";
import { PushSubscriptionsService } from "./push-subscriptions.service";
import { savePushSubscription } from "../push/helpers/push-subscription-flow";

jest.mock("../push/helpers/push-subscription-flow", () => ({
  savePushSubscription: jest.fn(),
}));

describe("PushSubscriptionsService", () => {
  let prisma: {
    pushSubscription: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let service: PushSubscriptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      pushSubscription: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new PushSubscriptionsService(prisma as never);
  });

  it("bruger det fælles validerede oprettelsesflow", async () => {
    (savePushSubscription as jest.Mock).mockResolvedValue({ id: 1 });

    await expect(
      service.create(
        {
          id: 7,
          role: "EMPLOYEE",
          cinemaId: 3,
        },
        {
          endpoint: "https://push.example.com/subscription",
          keys: {
            p256dh: "A".repeat(40),
            auth: "B".repeat(16),
          },
        },
      ),
    ).resolves.toEqual({ id: 1 });

    expect(savePushSubscription).toHaveBeenCalledWith(prisma, {
      userId: 7,
      cinemaId: 3,
      endpoint: "https://push.example.com/subscription",
      p256dh: "A".repeat(40),
      auth: "B".repeat(16),
    });
  });

  it("afviser MASTER-abonnement", async () => {
    await expect(
      service.create(
        {
          id: 7,
          role: "MASTER",
          cinemaId: 3,
        },
        {},
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(savePushSubscription).not.toHaveBeenCalled();
  });

  it("sletter kun endpointet for den aktuelle bruger", async () => {
    await service.deleteByEndpoint(
      {
        id: 7,
      },
      " https://push.example.com/subscription ",
    );

    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: {
        endpoint: "https://push.example.com/subscription",
        userId: 7,
      },
    });
  });
});
