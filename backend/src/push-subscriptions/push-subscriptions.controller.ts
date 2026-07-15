import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/jwt/jwt.guard';
import { PushSubscriptionsService } from './push-subscriptions.service';

function getRequiredCinemaId(req: any) {
  const cinemaId = Number(req.user?.cinemaId);

  if (
    !Number.isInteger(cinemaId) ||
    cinemaId <= 0
  ) {
    throw new BadRequestException(
      'Vælg en biograf, før du aktiverer push-notifikationer.',
    );
  }

  return cinemaId;
}

@Controller('push-subscriptions')
export class PushSubscriptionsController {
  constructor(
    private pushSubscriptionsService: PushSubscriptionsService,
  ) {}

  @UseGuards(JwtGuard)
  @Post()
  create(
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.pushSubscriptionsService.create(
      {
        id: req.user.sub,
        role: req.user.role,
        cinemaId: getRequiredCinemaId(req),
      },
      body,
    );
  }

  @UseGuards(JwtGuard)
  @Delete()
  delete(
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.pushSubscriptionsService.deleteByEndpoint(
      {
        id: req.user.sub,
      },
      body?.endpoint,
    );
  }
}
