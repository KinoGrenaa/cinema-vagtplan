import { BadRequestException } from "@nestjs/common";

import { PushController } from "./push.controller";

describe("PushController", () => {
  let pushService: {
    saveSubscription: jest.Mock;
    sendToUserInCinema: jest.Mock;
  };
  let controller: PushController;

  beforeEach(() => {
    pushService = {
      saveSubscription: jest
        .fn()
        .mockResolvedValue({ id: 1 }),
      sendToUserInCinema: jest
        .fn()
        .mockResolvedValue({ sent: 1 }),
    };
    controller = new PushController(
      pushService as never,
    );
  });

  it("gemmer et normaliseret abonnement", async () => {
    await controller.subscribe(
      {
        user: {
          sub: 7,
          cinemaId: 3,
        },
      },
      {
        endpoint:
          " https://push.example.com/subscription ",
        p256dh: "A".repeat(40),
        auth: "B".repeat(16),
      },
    );

    expect(
      pushService.saveSubscription,
    ).toHaveBeenCalledWith({
      userId: 7,
      cinemaId: 3,
      endpoint:
        "https://push.example.com/subscription",
      p256dh: "A".repeat(40),
      auth: "B".repeat(16),
    });
  });

  it.each([
    "http://push.example.com/subscription",
    "https://localhost/subscription",
    "https://127.0.0.1/subscription",
  ])("afviser ugyldigt endpoint %s", (endpoint) => {
    expect(() =>
      controller.subscribe(
        {
          user: {
            sub: 7,
            cinemaId: 3,
          },
        },
        {
          endpoint,
          p256dh: "A".repeat(40),
          auth: "B".repeat(16),
        },
      ),
    ).toThrow(BadRequestException);
  });

  it.each([
    "",
    "0",
    "-1",
    "1.5",
    "1e2",
    "9007199254740992",
  ])("afviser ugyldigt bruger-id %p", (sub) => {
    expect(() =>
      controller.test({
        user: {
          sub,
          cinemaId: 3,
        },
      }),
    ).toThrow(BadRequestException);

    expect(
      pushService.sendToUserInCinema,
    ).not.toHaveBeenCalled();
  });

  it.each([
    "",
    "0",
    "-1",
    "1.5",
    "1e2",
    "9007199254740992",
  ])("afviser ugyldigt biograf-id %p", (cinemaId) => {
    expect(() =>
      controller.test({
        user: {
          sub: 7,
          cinemaId,
        },
      }),
    ).toThrow(BadRequestException);

    expect(
      pushService.sendToUserInCinema,
    ).not.toHaveBeenCalled();
  });

  it("sender test-push kun i aktiv biograf", async () => {
    await controller.test({
      user: {
        sub: 7,
        cinemaId: 3,
      },
    });

    expect(
      pushService.sendToUserInCinema,
    ).toHaveBeenCalledWith(7, 3, {
      title: "Test notifikation",
      body: "Push-notifikationer virker",
      url: "/dashboard",
    });
  });
});
