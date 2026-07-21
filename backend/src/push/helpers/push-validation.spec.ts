import { BadRequestException } from "@nestjs/common";
import {
  normalizePushEndpoint,
  normalizePushPayload,
  normalizePushSubscriptionInput,
} from "./push-validation";

describe("push validation", () => {
  it("normaliserer et gyldigt abonnement", () => {
    expect(
      normalizePushSubscriptionInput({
        userId: "7",
        cinemaId: "3",
        endpoint: " https://push.example.com/subscription ",
        p256dh: "A".repeat(40),
        auth: "B".repeat(16),
      }),
    ).toEqual({
      userId: 7,
      cinemaId: 3,
      endpoint: "https://push.example.com/subscription",
      p256dh: "A".repeat(40),
      auth: "B".repeat(16),
    });
  });

  it.each([
    "http://push.example.com/subscription",
    "https://localhost/subscription",
    "https://127.0.0.1/subscription",
    "https://push.example.com:8443/subscription",
  ])("afviser usikkert endpoint %s", (endpoint) => {
    expect(() => normalizePushEndpoint(endpoint)).toThrow(BadRequestException);
  });

  it("afviser eksternt push-link", () => {
    expect(() =>
      normalizePushPayload({
        title: "Titel",
        body: "Besked",
        url: "https://example.com",
      }),
    ).toThrow(BadRequestException);
  });
});
