import {
  BadRequestException,
} from "@nestjs/common";

import { PushSubscriptionsController } from "./push-subscriptions.controller";
import { PushSubscriptionsService } from "./push-subscriptions.service";

describe("PushSubscriptionsController", () => {
  let service: {
    create: jest.Mock;
    deleteByEndpoint: jest.Mock;
  };
  let controller: PushSubscriptionsController;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      deleteByEndpoint: jest.fn(),
    };

    controller =
      new PushSubscriptionsController(
        service as unknown as PushSubscriptionsService,
      );
  });

  it("normaliserer et gyldigt abonnement", () => {
    controller.create(
      {
        user: {
          sub: 7,
          role: "EMPLOYEE",
          cinemaId: 3,
        },
      },
      {
        endpoint:
          " https://push.example.com/subscription ",
        keys: {
          p256dh: "A".repeat(40),
          auth: "B".repeat(16),
        },
      },
    );

    expect(service.create).toHaveBeenCalledWith(
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
    );
  });

  it("normaliserer endpoint ved sletning", () => {
    controller.delete(
      {
        user: {
          sub: 7,
        },
      },
      {
        endpoint:
          " https://push.example.com/subscription ",
      },
    );

    expect(
      service.deleteByEndpoint,
    ).toHaveBeenCalledWith(
      {
        id: 7,
      },
      "https://push.example.com/subscription",
    );
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
      controller.delete(
        {
          user: {
            sub,
          },
        },
        {
          endpoint:
            "https://push.example.com/subscription",
        },
      ),
    ).toThrow(BadRequestException);

    expect(
      service.deleteByEndpoint,
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
      controller.create(
        {
          user: {
            sub: 7,
            role: "EMPLOYEE",
            cinemaId,
          },
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
    ).toThrow(BadRequestException);

    expect(service.create).not.toHaveBeenCalled();
  });

  it.each([
    "http://push.example.com/subscription",
    "https://localhost/subscription",
    "https://127.0.0.1/subscription",
  ])("afviser ugyldigt endpoint %s", (endpoint) => {
    expect(() =>
      controller.create(
        {
          user: {
            sub: 7,
            role: "EMPLOYEE",
            cinemaId: 3,
          },
        },
        {
          endpoint,
          keys: {
            p256dh: "A".repeat(40),
            auth: "B".repeat(16),
          },
        },
      ),
    ).toThrow(BadRequestException);

    expect(service.create).not.toHaveBeenCalled();
  });
});
