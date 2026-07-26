import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PushModule } from '../push/push.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ShiftTradeOpenPageController } from './shift-trade-open-page.controller';
import { ShiftTradeOpenPageService } from './shift-trade-open-page.service';
import { ShiftTradesController } from './shift-trades.controller';
import { ShiftTradesService } from './shift-trades.service';

@Module({
  imports: [
    NotificationsModule,
    PrismaModule,
    PushModule,
    RealtimeModule,
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: {
        expiresIn: '7d',
      },
    }),
  ],
  controllers: [
    ShiftTradesController,
    ShiftTradeOpenPageController,
  ],
  providers: [
    ShiftTradesService,
    ShiftTradeOpenPageService,
  ],
})
export class ShiftTradesModule {}
