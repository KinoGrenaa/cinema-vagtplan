import { ForbiddenException } from "@nestjs/common";

import { savePushSubscription } from "../push/helpers/push-subscription-flow";
import { PushSubscriptionsService } from "./push-subscriptions.service";

jest.mock(
  "../push/helpers/push-subscription-flow",
  () => ({
    savePushSubscription: jest.fn(),
  }),
);

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
        findMany: jest
          .fn()
          .mockResolvedValue([]),
        deleteMany: jest
          .fn()
          .mockResolvedValue({ count: 1 }),
      },
    };

    service = new PushSubscriptionsService(
      prisma as never,
    );
  });

  it("bruger det fælles validerede oprettelsesflow", async () => {
    (
      savePushSubscription as jest.Mock
    ).mockResolvedValue({ id: 1 });

    await expect(
      service.create(
        {
          id: 7,
          role: "EMPLOYEE",
          cinemaId: 3,
        },
        {
          endpoint:
            "https://push.example.com/subscription",
          keys: {
            p256dh: "A".repeat(40),
            auth: "B".repeat(16),
          },
        },
      ),
    ).resolves.toEqual({ id: 1 });

    expect(
      savePushSubscription,
    ).toHaveBeenCalledWith(prisma, {
      userId: 7,
      cinemaId: 3,
      endpoint:
        "https://push.example.com/subscription",
      p256dh: "A".repeat(40),
      auth: "B".repeat(16),
    });
  });

  it.each([
    "MASTER",
    undefined,
    "UNKNOWN",
  ])("afviser ugyldig rolle %p", async (role) => {
    await expect(
      service.create(
        {
          id: 7,
          role,
          cinemaId: 3,
        },
        {},
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(
      savePushSubscription,
    ).not.toHaveBeenCalled();
  });

  it("sletter kun endpointet for den aktuelle bruger", async () => {
    await service.deleteByEndpoint(
      {
        id: 7,
      },
      " https://push.example.com/subscription ",
    );

    expect(
      prisma.pushSubscription.deleteMany,
    ).toHaveBeenCalledWith({
      where: {
        endpoint:
          "https://push.example.com/subscription",
        userId: 7,
      },
    });
  });

  it.each([
    "1e2",
    "1.5",
    "9007199254740992",
  ])(
    "afviser ugyldigt bruger-id ved opslag %p",
    async (userId) => {
      await expect(
        service.findForUser(userId),
      ).rejects.toThrow();

      expect(
        prisma.pushSubscription.findMany,
      ).not.toHaveBeenCalled();
    },
  );
});
