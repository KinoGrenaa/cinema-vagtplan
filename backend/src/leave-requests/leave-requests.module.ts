import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { StaffingAiModule } from '../staffing-ai/staffing-ai.module';
import { LeaveRequestExpiryService } from './leave-request-expiry.service';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
    StaffingAiModule,
    RealtimeModule,
    NotificationsModule,
  ],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService, LeaveRequestExpiryService],
})
export class LeaveRequestsModule {}
