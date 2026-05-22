import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],

  controllers: [NotificationsController],

  providers: [NotificationsService, PrismaService, RealtimeGateway],

  exports: [NotificationsService],
})
export class NotificationsModule {}
