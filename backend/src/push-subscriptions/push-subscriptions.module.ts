import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PushSubscriptionsController } from './push-subscriptions.controller';
import { PushSubscriptionsService } from './push-subscriptions.service';

import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],

  controllers: [PushSubscriptionsController],

  providers: [PushSubscriptionsService, PrismaService],

  exports: [PushSubscriptionsService],
})
export class PushSubscriptionsModule {}
