import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PushService } from './push.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';

type PushSubscribeBody = {
  endpoint?: string;
  p256dh?: string;
  auth?: string;
};

function getRequiredUserId(req: any) {
  const userId = Number(req.user?.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new BadRequestException('Bruger skal være et gyldigt ID');
  }

  return userId;
}

function getRequiredCinemaId(req: any) {
  const cinemaId = Number(req.user?.cinemaId);

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    throw new BadRequestException(
      'Vælg en biograf, før du aktiverer push-notifikationer.',
    );
  }

  return cinemaId;
}

function getRequiredString(value: unknown, message: string) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(message);
  }

  return value;
}

@Controller('push')
export class PushController {
  constructor(private pushService: PushService) {}

  @UseGuards(JwtGuard)
  @Post('subscribe')
  subscribe(@Req() req: any, @Body() body: PushSubscribeBody) {
    return this.pushService.saveSubscription({
      userId: getRequiredUserId(req),
      cinemaId: getRequiredCinemaId(req),
      endpoint: getRequiredString(body.endpoint, 'Push-endpoint mangler'),
      p256dh: getRequiredString(body.p256dh, 'Push-nøgle mangler'),
      auth: getRequiredString(body.auth, 'Push-godkendelse mangler'),
    });
  }

  @UseGuards(JwtGuard)
  @Post('test')
  test(@Req() req: any) {
    return this.pushService.sendToUser(getRequiredUserId(req), {
      title: 'Test notifikation',
      body: 'Push notifikationer virker ',
      url: '/dashboard',
    });
  }
}
