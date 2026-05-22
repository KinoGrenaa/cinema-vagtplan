import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PushService } from './push.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';

@Controller('push')
export class PushController {
  constructor(private pushService: PushService) {}

  @UseGuards(JwtGuard)
  @Post('subscribe')
  subscribe(
    @Body()
    body: {
      userId: number;
      cinemaId: number;
      endpoint: string;
      p256dh: string;
      auth: string;
    },
  ) {
    return this.pushService.saveSubscription(body);
  }

  @UseGuards(JwtGuard)
  @Post('test')
  test(
    @Body()
    body: {
      userId: number;
    },
  ) {
    return this.pushService.sendToUser(body.userId, {
      title: 'Test notifikation',
      body: 'Push notifikationer virker 🎉',
      url: '/dashboard',
    });
  }
}
