import {
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  savePushSubscription,
} from "../push/helpers/push-subscription-flow";
import {
  canJoinRealtimeCinema,
} from "../realtime/realtime-cinema-access";
import {
  ensureShiftActorHasCinemaAccess,
  ensureShiftUserHasCinemaAccess,
} from "../shifts/helpers/shift-user-access";
import {
  ensureTimeEntryTargetUserAccess,
  resolveTimeEntryActorCinemaId,
} from "../time-entries/helpers/time-entry-cinema-access";

describe("core membership-only access", () => {
  it("requires membership for push subscriptions", async () => {
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 9,
          }),
      },
      pushSubscription: {
        upsert: jest
          .fn()
          .mockResolvedValue({
            id: 1,
          }),
      },
    };

    await savePushSubscription(
      prisma as never,
      {
        userId: 9,
        cinemaId: 7,
        endpoint:
          "https://push.example.com/subscription",
        p256dh: "A".repeat(40),
        auth: "B".repeat(16),
      },
    );

    expect(
      prisma.user.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
        isActive: true,
        cinemaMemberships: {
          some: {
            cinemaId: 7,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
      },
    });
  });

  it("requires membership before joining a realtime cinema room", async () => {
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 9,
          }),
      },
      cinema: {
        findUnique: jest.fn(),
      },
    };

    await expect(
      canJoinRealtimeCinema(
        prisma as never,
        {
          id: 9,
          role: "EMPLOYEE",
          cinemaId: 7,
        },
        7,
      ),
    ).resolves.toBe(true);

    expect(
      prisma.user.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
        isActive: true,
        cinemaMemberships: {
          some: {
            cinemaId: 7,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
      },
    });
  });

  it("uses membership role for a shift actor", async () => {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            role: "EMPLOYEE",
            isActive: true,
            cinemaMemberships: [
              {
                role: "ADMIN",
              },
            ],
          }),
      },
      cinema: {
        findUnique: jest.fn(),
      },
    };

    await expect(
      ensureShiftActorHasCinemaAccess(
        prisma as never,
        {
          sub: 9,
          email: "anna@example.com",
          role: "ADMIN",
          cinemaId: 7,
        },
        7,
      ),
    ).resolves.toBeUndefined();

    expect(
      prisma.user.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          cinemaMemberships: {
            where: {
              cinemaId: 7,
              isActive: true,
            },
            select: {
              role: true,
            },
            take: 1,
          },
        }),
      }),
    );
  });

  it("rejects a stale shift role", async () => {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            role: "EMPLOYEE",
            isActive: true,
            cinemaMemberships: [
              {
                role: "EMPLOYEE",
              },
            ],
          }),
      },
      cinema: {
        findUnique: jest.fn(),
      },
    };

    await expect(
      ensureShiftActorHasCinemaAccess(
        prisma as never,
        {
          sub: 9,
          email: "anna@example.com",
          role: "ADMIN",
          cinemaId: 7,
        },
        7,
      ),
    ).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("requires membership for a shift target", async () => {
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 12,
          }),
      },
      cinema: {
        findUnique: jest.fn(),
      },
    };

    await ensureShiftUserHasCinemaAccess(
      prisma as never,
      12,
      7,
    );

    expect(
      prisma.user.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 12,
        isActive: true,
        cinemaMemberships: {
          some: {
            cinemaId: 7,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
      },
    });
  });

  it("uses membership role for the time-entry actor", async () => {
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            cinemaMemberships: [
              {
                role: "EMPLOYEE",
              },
            ],
          }),
      },
      cinema: {
        findUnique: jest.fn(),
      },
    };

    await expect(
      resolveTimeEntryActorCinemaId(
        prisma as never,
        {
          sub: 9,
          role: "EMPLOYEE",
          cinemaId: 7,
        },
      ),
    ).resolves.toBe(7);
  });

  it("does not allow a time-entry target through legacy User.cinemaId", async () => {
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
      },
    };

    await expect(
      ensureTimeEntryTargetUserAccess(
        prisma as never,
        12,
        7,
      ),
    ).rejects.toThrow(
      NotFoundException,
    );
  });
});
