import {
  Body,
  Controller,
  Delete,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { JwtGuard } from "../auth/jwt/jwt.guard";
import {
  getRequiredPositivePushId,
  normalizePushEndpoint,
  normalizePushKey,
} from "../push/helpers/push-validation";
import { PushSubscriptionsService } from "./push-subscriptions.service";

type PushSubscriptionBody = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

type DeletePushSubscriptionBody = {
  endpoint?: unknown;
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

@Controller("push-subscriptions")
export class PushSubscriptionsController {
  constructor(
    private pushSubscriptionsService: PushSubscriptionsService,
  ) {}

  @UseGuards(JwtGuard)
  @Post()
  create(
    @Req() req: any,
    @Body() body: PushSubscriptionBody,
  ) {
    return this.pushSubscriptionsService.create(
      {
        id: getRequiredUserId(req),
        role: req.user?.role,
        cinemaId: getRequiredCinemaId(req),
      },
      {
        endpoint: normalizePushEndpoint(
          body?.endpoint,
        ),
        keys: {
          p256dh: normalizePushKey(
            body?.keys?.p256dh,
            "p256dh",
          ),
          auth: normalizePushKey(
            body?.keys?.auth,
            "auth",
          ),
        },
      },
    );
  }

  @UseGuards(JwtGuard)
  @Delete()
  delete(
    @Req() req: any,
    @Body() body: DeletePushSubscriptionBody,
  ) {
    return this.pushSubscriptionsService.deleteByEndpoint(
      {
        id: getRequiredUserId(req),
      },
      normalizePushEndpoint(body?.endpoint),
    );
  }
}
