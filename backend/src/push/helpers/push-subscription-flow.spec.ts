import { ForbiddenException } from "@nestjs/common";
import { savePushSubscription } from "./push-subscription-flow";

describe("savePushSubscription", () => {
  const input = {
    userId: 7,
    cinemaId: 3,
    endpoint: "https://push.example.com/subscription",
    p256dh: "A".repeat(40),
    auth: "B".repeat(16),
  };

  it("gemmer abonnement for aktivt medlemskab", async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 7 }),
      },
      pushSubscription: {
        upsert: jest.fn().mockResolvedValue({ id: 1 }),
      },
    };

    await expect(savePushSubscription(prisma as never, input)).resolves.toEqual(
      { id: 1 },
    );

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 7,
        isActive: true,
        role: {
          not: "MASTER",
        },
        OR: [
          {
            cinemaId: 3,
          },
          {
            cinemaMemberships: {
              some: {
                cinemaId: 3,
                isActive: true,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });
  });

  it("afviser bruger uden aktiv biograftilknytning", async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      pushSubscription: {
        upsert: jest.fn(),
      },
    };

    await expect(savePushSubscription(prisma as never, input)).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.pushSubscription.upsert).not.toHaveBeenCalled();
  });
});
