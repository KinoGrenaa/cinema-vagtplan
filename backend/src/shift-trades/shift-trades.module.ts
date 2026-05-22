import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ShiftTradesService } from './shift-trades.service';
import { ShiftTradesController } from './shift-trades.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    NotificationsModule,
    PrismaModule,
    PushModule,
    RealtimeModule,
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ShiftTradesController],
  providers: [ShiftTradesService],
})
export class ShiftTradesModule {}
