import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { PushService } from "./push.service";
import { JwtGuard } from "../auth/jwt/jwt.guard";
import {
  getRequiredPositivePushId,
  normalizePushEndpoint,
  normalizePushKey,
} from "./helpers/push-validation";

type PushSubscribeBody = {
  endpoint?: unknown;
  p256dh?: unknown;
  auth?: unknown;
};

function getRequiredUserId(req: any) {
  return getRequiredPositivePushId(
    req.user?.sub,
    "Bruger skal være et gyldigt ID",
  );
}

function getRequiredCinemaId(req: any) {
  return getRequiredPositivePushId(
    req.user?.cinemaId,
    "Vælg en biograf, før du aktiverer push-notifikationer.",
  );
}

@Controller("push")
export class PushController {
  constructor(private pushService: PushService) {}

  @UseGuards(JwtGuard)
  @Post("subscribe")
  subscribe(@Req() req: any, @Body() body: PushSubscribeBody) {
    return this.pushService.saveSubscription({
      userId: getRequiredUserId(req),
      cinemaId: getRequiredCinemaId(req),
      endpoint: normalizePushEndpoint(body?.endpoint),
      p256dh: normalizePushKey(body?.p256dh, "p256dh"),
      auth: normalizePushKey(body?.auth, "auth"),
    });
  }

  @UseGuards(JwtGuard)
  @Post("test")
  test(@Req() req: any) {
    return this.pushService.sendToUserInCinema(
      getRequiredUserId(req),
      getRequiredCinemaId(req),
      {
        title: "Test notifikation",
        body: "Push-notifikationer virker",
        url: "/dashboard",
      },
    );
  }
}
