import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { JwtGuard } from '../auth/jwt/jwt.guard';
import { PushSubscriptionsService } from './push-subscriptions.service';

@Controller('push-subscriptions')
export class PushSubscriptionsController {
  constructor(private pushSubscriptionsService: PushSubscriptionsService) {}

  @UseGuards(JwtGuard)
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    return this.pushSubscriptionsService.create(
      {
        id: req.user.sub,
        cinemaId: req.user.cinemaId,
      },
      body,
    );
  }
}
