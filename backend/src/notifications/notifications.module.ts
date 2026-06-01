import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),

    RealtimeModule,
  ],

  controllers: [NotificationsController],

  providers: [NotificationsService, PrismaService],

  exports: [NotificationsService],
})
export class NotificationsModule {}
