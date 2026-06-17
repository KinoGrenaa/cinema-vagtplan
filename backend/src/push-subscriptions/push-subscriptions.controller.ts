import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/jwt/jwt.guard';
import { PushSubscriptionsService } from './push-subscriptions.service';

function getRequiredCinemaId(req: any) {
  const cinemaId = Number(req.user?.cinemaId);

  if (!Number.isFinite(cinemaId) || cinemaId <= 0) {
    throw new BadRequestException(
      'Vælg en biograf, før du aktiverer push-notifikationer.',
    );
  }

  return cinemaId;
}

@Controller('push-subscriptions')
export class PushSubscriptionsController {
  constructor(private pushSubscriptionsService: PushSubscriptionsService) {}

  @UseGuards(JwtGuard)
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    return this.pushSubscriptionsService.create(
      {
        id: req.user.sub,
        cinemaId: getRequiredCinemaId(req),
      },
      body,
    );
  }
}
